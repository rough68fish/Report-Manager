import { Link, useNavigate } from 'react-router-dom';
import { useOktaAuth } from '@okta/okta-react';

export function Nav() {
  const { authState, oktaAuth } = useOktaAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await oktaAuth.signOut();
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
        <Link to="/" className="text-lg font-semibold text-gray-900">
          Report Catalog
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/reports/new"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-md"
          >
            + Add Report
          </Link>
          {authState?.isAuthenticated && (
            <button
              onClick={signOut}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
