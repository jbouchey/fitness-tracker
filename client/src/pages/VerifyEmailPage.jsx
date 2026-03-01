import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api/auth';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    authApi.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        {status === 'loading' && (
          <p className="text-gray-500">Verifying your email…</p>
        )}
        {status === 'success' && (
          <>
            <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 mb-4 text-sm">
              Your email has been verified!
            </div>
            <Link to="/" className="btn-primary">Go to dashboard</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4 text-sm">
              This verification link is invalid or has expired. Please register again or request a new link.
            </div>
            <Link to="/login" className="text-orange-600 hover:underline text-sm">Back to login</Link>
          </>
        )}
      </div>
    </div>
  );
}
