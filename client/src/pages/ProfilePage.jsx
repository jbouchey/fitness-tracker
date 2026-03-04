import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import { stravaApi } from '../api/strava';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [nameStatus, setNameStatus] = useState(null); // 'saving' | 'saved' | 'error'

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwStatus, setPwStatus] = useState(null); // 'saving' | 'saved' | { error }

  const [stravaConnected, setStravaConnected] = useState(null); // null = loading
  const [stravaStatus, setStravaStatus] = useState(null); // 'connecting' | 'disconnecting' | null
  const [stravaMessage, setStravaMessage] = useState(null); // success/error message

  // Check Strava connection status on mount
  useEffect(() => {
    stravaApi.getStatus().then(({ connected }) => setStravaConnected(connected)).catch(() => setStravaConnected(false));
  }, []);

  // Handle return from Strava OAuth
  useEffect(() => {
    const result = searchParams.get('strava');
    if (result === 'connected') {
      setStravaConnected(true);
      setStravaMessage({ type: 'success', text: 'Strava connected successfully!' });
      setSearchParams({}, { replace: true });
    } else if (result === 'denied') {
      setStravaMessage({ type: 'error', text: 'Strava authorization was denied.' });
      setSearchParams({}, { replace: true });
    }
  }, []);

  async function handleStravaConnect() {
    setStravaStatus('connecting');
    try {
      const url = await stravaApi.getConnectUrl();
      window.location.href = url;
    } catch {
      setStravaStatus(null);
      setStravaMessage({ type: 'error', text: 'Failed to start Strava connection.' });
    }
  }

  async function handleStravaDisconnect() {
    setStravaStatus('disconnecting');
    try {
      await stravaApi.disconnect();
      setStravaConnected(false);
      setStravaMessage({ type: 'success', text: 'Strava disconnected.' });
    } catch {
      setStravaMessage({ type: 'error', text: 'Failed to disconnect Strava.' });
    } finally {
      setStravaStatus(null);
    }
  }

  async function handleNameSave(e) {
    e.preventDefault();
    if (!displayName.trim()) return;
    setNameStatus('saving');
    try {
      const { user: updated } = await authApi.updateProfile({ displayName: displayName.trim() });
      updateUser(updated);
      setNameStatus('saved');
      setTimeout(() => setNameStatus(null), 2500);
    } catch (err) {
      setNameStatus({ error: err.response?.data?.error || 'Failed to update name.' });
    }
  }

  async function handlePasswordSave(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwStatus({ error: 'New passwords do not match.' });
      return;
    }
    setPwStatus('saving');
    try {
      await authApi.updateProfile({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwStatus('saved');
      setTimeout(() => setPwStatus(null), 2500);
    } catch (err) {
      setPwStatus({ error: err.response?.data?.error || 'Failed to update password.' });
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>

      {/* Strava */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-4">
        <div className="flex items-center gap-2 mb-1">
          {/* Strava logo mark */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#FC5200" aria-hidden="true">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          <h2 className="text-base font-semibold text-gray-800">Strava</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Connect Strava to automatically sync new activities from COROS.
        </p>
        {stravaMessage && (
          <p className={`text-sm mb-3 ${stravaMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {stravaMessage.text}
          </p>
        )}
        {stravaConnected === null ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : stravaConnected ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 font-medium">Compatible with Strava</span>
            <button
              onClick={handleStravaDisconnect}
              disabled={stravaStatus === 'disconnecting'}
              className="btn-secondary text-sm"
            >
              {stravaStatus === 'disconnecting' ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </div>
        ) : (
          <button
            onClick={handleStravaConnect}
            disabled={stravaStatus === 'connecting'}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'none', border: 'none', padding: 0 }}
          >
            <img
              src="https://developers.strava.com/images/btn_strava_connectwith_orange@2x.png"
              alt="Connect with Strava"
              height="48"
              style={{ height: 48, display: 'block' }}
            />
          </button>
        )}
      </div>

      {/* Display name */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-4">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Display Name</h2>
        <form onSubmit={handleNameSave} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="form-input w-full"
              placeholder="Your name"
            />
          </div>
          {nameStatus === 'saved' && <p className="text-sm text-green-600">Name updated!</p>}
          {nameStatus?.error && <p className="text-sm text-red-600">{nameStatus.error}</p>}
          <button type="submit" disabled={nameStatus === 'saving'} className="btn-primary">
            {nameStatus === 'saving' ? 'Saving…' : 'Save Name'}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Change Password</h2>
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="form-input w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="form-input w-full"
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input w-full"
              required
            />
          </div>
          {pwStatus === 'saved' && <p className="text-sm text-green-600">Password updated!</p>}
          {pwStatus?.error && <p className="text-sm text-red-600">{pwStatus.error}</p>}
          <button type="submit" disabled={pwStatus === 'saving'} className="btn-primary">
            {pwStatus === 'saving' ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
