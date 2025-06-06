import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';

const Login: React.FC = () => {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

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
    <div className="max-w-[400px] my-16 mx-auto p-6 border border-gray-300 rounded-md">
      <h2 className="text-2xl font-semibold mb-6">Sign In</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full p-2 mt-1 border border-gray-300 rounded"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium">
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
            className="w-full p-2 mt-1 border border-gray-300 rounded"
          />
        </div>

        {error && (
          <div className="text-red-500 mb-3 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <div className="mt-3 text-center text-sm">
        Don’t have an account?{' '}
        <a href="/signup" className="text-blue-600 hover:underline">
          Create one
        </a>
      </div>
    </div>
  );
};

export default Login;
