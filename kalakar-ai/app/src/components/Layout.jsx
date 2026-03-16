import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CreditsIndicator from './CreditsIndicator';

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
      <aside className="fixed inset-y-0 left-0 z-30 w-64 glass border-r flex flex-col animate-fade-in">
        {/* Logo */}
        <div className="p-6 border-b border-white/10 backdrop-blur-sm">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold gradient-text">
              QuickSubs
            </h1>
            <p className="text-xs text-surface-500 font-medium tracking-wide">Auto Captions</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? 'bg-primary-600/30 text-primary-300 shadow-lg shadow-primary-600/10 border border-primary-500/30'
                    : 'text-surface-400 hover:text-white hover:bg-white/10 border border-transparent'
                }`
              }
            >
              <span className="text-lg">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User & Credits — always visible at bottom */}
        <div className="p-4 border-t border-white/10 space-y-4">
          {/* User Card */}
          <div className="glass-sm rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-sm font-bold text-white">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-surface-400 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Credits Indicator */}
          <CreditsIndicator
            credits={user?.credits ?? 0}
            plan={user?.plan || 'free'}
            maxCredits={10}
          />

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-sm text-surface-400 hover:text-white transition-smooth py-2.5 rounded-lg hover:bg-red-600/20 border border-transparent hover:border-red-500/30 font-medium"
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main — offset by sidebar width, only this area scrolls */}
      <main className="flex-1 ml-64 overflow-auto bg-gradient-to-br from-surface-900 via-surface-900 to-surface-950">
        <div className="max-w-6xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
