import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, CheckCircle2, Loader } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('sg946511@gmail.com');
  const [password, setPassword] = useState('Jlkufkgb');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, backendAvailable, error: authError } = useAuth();
  const navigate = useNavigate();

  // Show backend error if available
  useEffect(() => {
    if (authError && !backendAvailable) {
      setError(authError);
    }
  }, [authError, backendAvailable]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Login failed';
      setError(errorMsg);
      if (import.meta.env.DEV) {
        console.error('[v0] Login error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            QuickSubs
          </h1>
          <p className="text-surface-500 text-sm mt-2">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-surface-800/60 rounded-2xl border border-surface-700 p-8">
          {/* Backend Status Alert */}
          {!backendAvailable && (
            <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-400">Backend Not Available</p>
                <p className="text-xs text-amber-400/80 mt-1">
                  The server is not running. Please start it with: <code className="bg-amber-500/20 px-1.5 py-0.5 rounded">cd kalakar-ai/server && npm run dev</code>
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-400">{error}</p>
                  {error.includes('CORS') && (
                    <p className="text-xs text-red-400/80 mt-1">
                      Make sure the backend server is running on port 5000
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!backendAvailable}
                className="w-full px-4 py-3 bg-surface-900 border border-surface-600 rounded-xl text-white text-sm placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={!backendAvailable}
                className="w-full px-4 py-3 bg-surface-900 border border-surface-600 rounded-xl text-white text-sm placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !backendAvailable}
              className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader className="w-4 h-4 animate-spin" />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-surface-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-primary-400 hover:text-primary-300 font-medium">
              Sign up
            </Link>
          </p>

          {/* Debug Info */}
          {import.meta.env.DEV && (
            <div className="mt-8 pt-6 border-t border-surface-700">
              <p className="text-xs text-surface-600 mb-2">Development Info:</p>
              <div className="text-xs text-surface-600 space-y-1">
                <p>Backend: {backendAvailable ? <span className="text-green-400">Available</span> : <span className="text-red-400">Unavailable</span>}</p>
                <p>API URL: {import.meta.env.VITE_API_URL || 'http://localhost:5000'}</p>
                <p>Frontend: http://localhost:5173</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
