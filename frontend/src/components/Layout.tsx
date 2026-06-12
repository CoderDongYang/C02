import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export default function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-full bg-gray-950 flex flex-col">
      <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            F
          </div>
          <span className="text-lg font-semibold text-gray-100">FlowForge</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{user?.username}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            退出登录
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
