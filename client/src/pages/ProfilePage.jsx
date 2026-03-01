import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [nameStatus, setNameStatus] = useState(null); // 'saving' | 'saved' | 'error'

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwStatus, setPwStatus] = useState(null); // 'saving' | 'saved' | { error }

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
