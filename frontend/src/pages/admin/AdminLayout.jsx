import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, Building2, LogOut, Shield } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const SG = { fontFamily: 'Space Grotesk, system-ui, sans-serif' };

const NAV = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/users',     icon: Users,           label: 'Users' },
  { to: '/admin/workspaces',icon: Building2,        label: 'Workspaces' },
];

export default function AdminLayout() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/admin/login');
  }

  return (
    <div className="flex h-screen bg-[#FFFBF2] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-[#111] flex flex-col shrink-0 border-r-2 border-[#111]">
        {/* Logo */}
        <div className="p-5 border-b-2 border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg border-2 border-[#f97316] flex items-center justify-center bg-[#f97316]">
              <span className="text-white font-bold text-sm" style={SG}>F</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none" style={SG}>Youform</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className="w-2.5 h-2.5 text-[#f97316]" />
                <span className="text-[#f97316] text-xs font-bold" style={SG}>Admin</span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-[#f97316] text-white'
                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                }`
              }
              style={SG}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + sign out */}
        <div className="p-3 border-t-2 border-white/10">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-gray-500 truncate" style={SG}>{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-bold text-gray-400 hover:bg-white/10 hover:text-white transition-all"
            style={SG}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
