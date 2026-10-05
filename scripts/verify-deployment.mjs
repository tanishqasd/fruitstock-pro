import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import jwt from 'jsonwebtoken';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testSecret = 'deployment-verification-only-secret';
const env = {
  ...process.env,
  NODE_ENV: 'production',
  // Verification never connects to the real database.
  DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/test?connect_timeout=1',
  JWT_SECRET: testSecret
};

test('production startup refuses missing configuration', async () => {
  for (const missing of ['DATABASE_URL', 'JWT_SECRET']) {
    const child = spawn(process.execPath, ['server/dist/index.js'], {
      cwd: root, env: { ...env, [missing]: '' }, windowsHide: true
    });
    let output = '';
    child.stderr.on('data', chunk => { output += chunk; });
    const [code] = await once(child, 'exit');
    assert.notEqual(code, 0);
    assert.match(output, new RegExp(`Missing required environment variable: ${missing}`));
  }
});

test('production serves the SPA, assets and JSON API errors; unhealthy DB returns 503', async () => {
  const listener = net.createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const child = spawn(process.execPath, ['server/dist/index.js'], {
    cwd: root, env: { ...env, PORT: String(port) }, windowsHide: true
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  try {
    const base = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      if (child.exitCode !== null) throw new Error(`Server exited: ${output}`);
      try {
        await fetch(`${base}/`, { signal: AbortSignal.timeout(500) });
        ready = true;
        break;
      } catch {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    assert.ok(ready, `Server failed to start: ${output}`);
    const index = await readFile(path.join(root, 'client/dist/index.html'), 'utf8');
    for (const route of ['/', '/dealers', '/inventory', '/sales']) {
      const response = await fetch(`${base}${route}`);
      assert.equal(response.status, 200, route);
      assert.equal(await response.text(), index, route);
    }
    const assetPaths = [...index.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(match => match[1]);
    assert.ok(assetPaths.length >= 2, 'Built HTML must reference JavaScript and CSS');
    for (const asset of assetPaths) {
      const response = await fetch(`${base}${asset}`);
      assert.equal(response.status, 200, asset);
      assert.ok(!response.headers.get('content-type')?.includes('text/html'), asset);
    }
    const missingAsset = await fetch(`${base}/assets/missing.js`);
    assert.equal(missingAsset.status, 404);
    const anonymous = await fetch(`${base}/api/products`);
    assert.equal(anonymous.status, 401);
    assert.equal((await anonymous.json()).message, 'Authentication required');
    const missingApi = await fetch(`${base}/api/missing`, {
      headers: { Authorization: `Bearer ${jwt.sign({ id: 'verification' }, testSecret)}` }
    });
    assert.equal(missingApi.status, 404);
    assert.equal((await missingApi.json()).message, 'API endpoint not found');
    const badLogin = await fetch(`${base}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
    });
    assert.equal(badLogin.status, 400);
    assert.ok((await badLogin.json()).message);
    const health = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(5000) });
    assert.equal(health.status, 503);
    assert.equal((await health.json()).status, 'unavailable');
    assert.equal(health.headers.get('cache-control'), 'no-store');
  } finally {
    if (child.exitCode === null) {
      child.kill();
      await once(child, 'exit');
    }
  }
});
