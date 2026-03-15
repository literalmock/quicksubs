import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/upload', label: 'Upload', icon: '⬆️' },
    { to: '/profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <div className="h-screen flex overflow-hidden bg-surface-900">
      {/* Sidebar — fixed, never scrolls */}
      <aside className="fixed inset-y-0 left-0 z-30 w-64 bg-surface-800/50 border-r border-surface-700 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-surface-700">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            QuickSubs
          </h1>
          <p className="text-xs text-surface-500 mt-1">Auto Captions</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                  ? 'bg-primary-600/20 text-primary-400 shadow-lg shadow-primary-600/5'
                  : 'text-surface-400 hover:text-white hover:bg-surface-700/50'
                }`
              }
            >
              <span className="text-lg">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* User — always visible at bottom */}
        <div className="p-4 border-t border-surface-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-sm font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-surface-500 truncate">{user?.email}</p>
            </div>
          </div>

          <div className="mb-3 rounded-lg border border-surface-700 bg-surface-900/60 px-3 py-2">
            <p className="text-[11px] text-surface-400">
              Plan:{' '}
              <span className="font-semibold uppercase text-primary-300">{user?.plan || 'free'}</span>
              {' '}• Videos left today:{' '}
              <span className="font-semibold text-surface-200">{user?.credits ?? 0}</span>
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full text-sm text-surface-400 hover:text-accent transition-colors py-2 rounded-lg hover:bg-surface-700/50"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main — offset by sidebar width, only this area scrolls */}
      <main className="flex-1 ml-64 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
