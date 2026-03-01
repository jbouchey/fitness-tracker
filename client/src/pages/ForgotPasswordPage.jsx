import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null); // null | 'loading' | 'sent' | { error }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    try {
      await authApi.forgotPassword(email);
      setStatus('sent');
    } catch (err) {
      setStatus({ error: err.response?.data?.error || 'Something went wrong. Please try again.' });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset your password</h1>
        <p className="text-sm text-gray-500 mb-6">
          Enter your email and we'll send you a reset link.
        </p>

        {status === 'sent' ? (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 text-sm">
            Check your email — if that address is registered, a reset link is on its way.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input w-full"
                required
                autoFocus
              />
            </div>
            {status?.error && <p className="text-sm text-red-600">{status.error}</p>}
            <button type="submit" disabled={status === 'loading'} className="btn-primary w-full">
              {status === 'loading' ? 'Sending…' : 'Send reset link'}
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
