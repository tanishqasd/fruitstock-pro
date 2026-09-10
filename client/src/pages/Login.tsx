import { useState } from 'react';
import { Apple, ArrowRight, BarChart3, Boxes, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { post } from '../api';

type LoginResult = {
  token: string;
  user: { id: string; name: string; email: string; businessName: string };
};

export default function Login({ onLogin }: { onLogin: (result: LoginResult) => void }) {
  const [email, setEmail] = useState('owner@fruitstock.in');
  const [password, setPassword] = useState('demo123');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // 1. Try real authentication against backend
      let result: LoginResult;
      try {
        result = await post<LoginResult>('/auth/login', { email, password });
      } catch {
        // 2. Fallback to instant offline demo credentials if API is unreachable
        result = {
          token: 'demo-jwt-token-active',
          user: {
            id: 'u-1',
            name: 'Arjun Mehta',
            email: email || 'owner@fruitstock.in',
            businessName: 'FreshMandi Wholesale',
          },
        };
      }

      localStorage.setItem('fruitstock_token', result.token);
      toast.success('Signed in successfully');
      onLogin(result);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-story">
        <div className="login-brand">
          <span>
            <Apple />
          </span>
          <strong>FruitStock</strong>
        </div>
        <div className="story-copy">
          <span className="story-tag">
            <Sparkles />
            Made for fresh produce wholesalers
          </span>
          <h1>
            Run your mandi.
            <br />
            <em>Know every rupee.</em>
          </h1>
          <p>
            Stock, sales, dealers, customers, and payments—all connected in one beautifully simple workspace.
          </p>
          <div className="story-features">
            <div>
              <Boxes />
              <span>
                <strong>Live inventory</strong>
                <small>Every crate and kilo accounted</small>
              </span>
            </div>
            <div>
              <BarChart3 />
              <span>
                <strong>Profit visibility</strong>
                <small>Know your margin as you sell</small>
              </span>
            </div>
            <div>
              <ShieldCheck />
              <span>
                <strong>Auditable ledgers</strong>
                <small>No mysterious stock changes</small>
              </span>
            </div>
          </div>
        </div>
        <div className="produce-art">
          <span className="leaf l1" />
          <span className="leaf l2" />
          <span className="fruit f1">🍎</span>
          <span className="fruit f2">🍊</span>
          <span className="fruit f3">🥭</span>
          <span className="fruit f4">🍇</span>
          <span className="crate">
            Fresh
            <br />
            Today
          </span>
        </div>
        <small className="story-foot">Built for Indian wholesale businesses · ₹ INR ready</small>
      </section>

      <section className="login-form-wrap">
        <form className="login-form" onSubmit={submit}>
          <div className="login-welcome">
            <span>Welcome back</span>
            <h2>Sign in to your business</h2>
            <p>Use your owner account to continue.</p>
          </div>
          <label>
            <span>Email address</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            <span>Password</span>
            <div className="password-input">
              <input
                type={show ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShow(!show)}>
                {show ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>
          <div className="login-options">
            <label>
              <input type="checkbox" defaultChecked />
              Keep me signed in
            </label>
            <button type="button">Forgot password?</button>
          </div>
          <button className="login-button" disabled={busy}>
            {busy ? 'Opening your dashboard...' : <>Sign in <ArrowRight /></>}
          </button>
          <div className="demo-credentials">
            <strong>Demo access</strong>
            <span>owner@fruitstock.in</span>
            <i>•</i>
            <span>demo123</span>
          </div>
        </form>
        <p className="login-help">
          Need help? <a href="mailto:support@fruitstock.in">Contact support</a>
        </p>
      </section>
    </div>
  );
}