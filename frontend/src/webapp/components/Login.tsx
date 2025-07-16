// src/pages/Login.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/webapp/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const systemFontStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/webapp');
    } catch (err: any) {
      console.error('Login error', err);
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom, #F9FAFB, #FFFFFF)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: systemFontStack,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decorative elements */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          right: '-5%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(222, 23, 133, 0.05) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '-10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.03) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(80px)',
        }}
      />

      <div
        style={{
          maxWidth: '420px',
          width: '100%',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '2rem',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.08), 0 10px 25px rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '3rem',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '20%',
            right: '20%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, rgba(222, 23, 133, 0.4), transparent)',
            borderRadius: '0 0 2px 2px',
          }}
        />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: '#1F2937',
              margin: '0 0 0.5rem 0',
              letterSpacing: '-0.02em',
            }}
          >
            Welcome back
          </h2>
          <p
            style={{
              fontSize: '1rem',
              color: '#6B7280',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Sign in to your account to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Email field */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '0.5rem',
                letterSpacing: '0.01em',
              }}
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                fontSize: '1rem',
                border: '1.5px solid #E5E7EB',
                borderRadius: '0.75rem',
                background: 'rgba(255, 255, 255, 0.8)',
                transition: 'all 0.2s ease',
                fontFamily: systemFontStack,
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#DE1785';
                e.target.style.boxShadow = '0 0 0 3px rgba(222, 23, 133, 0.1)';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Password field */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '0.5rem',
                letterSpacing: '0.01em',
              }}
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                fontSize: '1rem',
                border: '1.5px solid #E5E7EB',
                borderRadius: '0.75rem',
                background: 'rgba(255, 255, 255, 0.8)',
                transition: 'all 0.2s ease',
                fontFamily: systemFontStack,
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#DE1785';
                e.target.style.boxShadow = '0 0 0 3px rgba(222, 23, 133, 0.1)';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#E5E7EB';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Error message */}
          {error && (
            <div
              style={{
                color: '#DC2626',
                fontSize: '0.875rem',
                marginBottom: '1.5rem',
                padding: '0.75rem 1rem',
                background: 'rgba(248, 113, 113, 0.1)',
                borderRadius: '0.5rem',
                border: '1px solid rgba(248, 113, 113, 0.2)',
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem 2rem',
              fontSize: '1rem',
              fontWeight: 600,
              color: '#fff',
              background: loading 
                ? 'linear-gradient(135deg, #9CA3AF, #6B7280)' 
                : 'linear-gradient(135deg, #DE1785, #F472B6)',
              border: 'none',
              borderRadius: '0.75rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: loading 
                ? '0 4px 12px rgba(0, 0, 0, 0.1)' 
                : '0 10px 25px rgba(222, 23, 133, 0.25), 0 4px 12px rgba(0, 0, 0, 0.05)',
              fontFamily: systemFontStack,
              outline: 'none',
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={e => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 15px 35px rgba(222, 23, 133, 0.35), 0 8px 20px rgba(0, 0, 0, 0.1)';
              }
            }}
            onMouseLeave={e => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(222, 23, 133, 0.25), 0 4px 12px rgba(0, 0, 0, 0.05)';
              }
            }}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid #fff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                Signing in...
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Sign up link */}
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <p style={{ color: '#6B7280', fontSize: '0.875rem', margin: 0 }}>
            Don't have an account?{' '}
            <a
              href="/signup"
              style={{
                color: '#DE1785',
                textDecoration: 'none',
                fontWeight: 600,
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#C01475';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = '#DE1785';
              }}
            >
              Create one
            </a>
          </p>
        </div>
      </div>

      {/* Add CSS animation for spinner */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default Login;