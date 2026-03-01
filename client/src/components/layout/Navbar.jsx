import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function Navbar({ onMenuClick }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="bg-white border-b border-gray-200 px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link to="/" className="text-lg font-bold text-brand-600 lg:hidden">
          TrailTracker
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600 hidden sm:block">
          {user?.displayName || user?.email}
        </span>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-gray-700 font-medium"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
