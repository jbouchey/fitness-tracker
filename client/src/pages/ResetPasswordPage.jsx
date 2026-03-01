import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/auth';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState(null); // null | 'loading' | 'done' | { error }

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) {
      setStatus({ error: 'Passwords do not match.' });
      return;
    }
    setStatus('loading');
    try {
      await authApi.resetPassword(token, password);
      setStatus('done');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setStatus({ error: err.response?.data?.error || 'This reset link is invalid or has expired.' });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Set new password</h1>

        {status === 'done' ? (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 text-sm">
            Password updated! Redirecting to login…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input w-full"
                minLength={8}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="form-input w-full"
                required
              />
            </div>
            {status?.error && <p className="text-sm text-red-600">{status.error}</p>}
            <button type="submit" disabled={status === 'loading'} className="btn-primary w-full">
              {status === 'loading' ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        )}

        <p className="mt-4 text-sm text-gray-500">
          <Link to="/login" className="text-orange-600 hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
