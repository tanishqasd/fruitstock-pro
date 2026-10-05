import { useState } from 'react';
import { Apple, ArrowRight, BarChart3, Boxes, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import { post } from '../api';

type LoginResult = { token: string; user: { id: string; name: string; email: string; businessName: string } };
type LoginProps = { onLogin: (result: LoginResult) => void; onSwitchToSignup?: () => void };

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await post<LoginResult>('/auth/login', { email, password });
      if (!result.token || !result.user) throw new Error('Invalid sign-in response. Please try again.');
      onLogin(result);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return <div className="login-page">
    <section className="login-story">
      <div className="login-brand"><span><Apple /></span><strong>FruitStock</strong></div>
      <div className="story-copy">
        <span className="story-tag"><Sparkles />Made for fresh produce wholesalers</span>
        <h1>Run your mandi.<br /><em>Know every rupee.</em></h1>
        <p>Stock, sales, dealers, customers, and payments—all connected in one workspace.</p>
        <div className="story-features">
          <div><Boxes /><span><strong>Live inventory</strong><small>Every crate and kilo accounted</small></span></div>
          <div><BarChart3 /><span><strong>Profit visibility</strong><small>Know your margin as you sell</small></span></div>
          <div><ShieldCheck /><span><strong>Auditable ledgers</strong><small>Track every stock movement</small></span></div>
        </div>
      </div>
      <div className="produce-art" aria-hidden="true"><span className="leaf l1" /><span className="leaf l2" /><span className="fruit f1">🍎</span><span className="fruit f2">🍊</span><span className="fruit f3">🥭</span><span className="fruit f4">🍇</span><span className="crate">Fresh<br />Today</span></div>
      <small className="story-foot">Built for Indian wholesale businesses · ₹ INR ready</small>
    </section>
    <section className="login-form-wrap">
      <form className="login-form" onSubmit={submit}>
        <div className="login-welcome"><span>Welcome back</span><h2>Sign in to your business</h2><p>Use your owner account to continue.</p></div>
        {error && <p className="login-error" role="alert">{error}</p>}
        <label><span>Email address</span><input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} /></label>
        <label><span>Password</span><div className="password-input"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
        <button className="login-button owner-signin" disabled={busy}>{busy ? 'Opening your dashboard...' : <>Sign in <ArrowRight /></>}</button>
      </form>
      <p className="login-help">Ask your business administrator for an owner account.</p>
    </section>
  </div>;
}
