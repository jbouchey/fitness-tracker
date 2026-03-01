import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-center px-4">
      <div>
        <p className="text-6xl font-bold text-brand-400">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-4">Page not found</h1>
        <p className="text-gray-500 mt-2">The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn-primary mt-6 inline-flex">Go to dashboard</Link>
      </div>
    </div>
  );
}
