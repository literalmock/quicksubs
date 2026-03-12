import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Profile</h2>
        <p className="text-surface-500 text-sm mt-1">Your account information</p>
      </div>

      <div className="bg-surface-800/60 rounded-2xl border border-surface-700 p-8 max-w-lg">
        <div className="flex items-center gap-5 mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-2xl font-bold">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <h3 className="text-lg font-semibold">{user?.name}</h3>
            <p className="text-surface-500 text-sm">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-surface-500 uppercase tracking-wide mb-1">
              Full Name
            </label>
            <p className="text-sm bg-surface-900 border border-surface-700 rounded-xl px-4 py-3">
              {user?.name}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 uppercase tracking-wide mb-1">
              Email
            </label>
            <p className="text-sm bg-surface-900 border border-surface-700 rounded-xl px-4 py-3">
              {user?.email}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 uppercase tracking-wide mb-1">
              Member Since
            </label>
            <p className="text-sm bg-surface-900 border border-surface-700 rounded-xl px-4 py-3">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                  })
                : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
