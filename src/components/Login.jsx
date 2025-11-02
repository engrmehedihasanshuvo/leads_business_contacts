import React, { useState } from 'react';

// Props: onSubmit(email, password), loading, error
export default function Login({ onSubmit, loading = false, error = '' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (onSubmit) onSubmit(email, password);
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2 className="login-title">Sign in to Zensoft Lab</h2>
        <p className="login-sub">Enter your email and password to continue</p>
        {error && <div className="login-error">{error}</div>}
        <label className="login-label">Email</label>
        <input className="login-input" value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@company.com" />
        <label className="login-label">Password</label>
        <input className="login-input" value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" />
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Checking…' : 'Sign in'}</button>
          <button type="button" className="btn" onClick={() => { setEmail(''); setPassword(''); }} disabled={loading}>Clear</button>
        </div>
      </form>
    </div>
  );
}
