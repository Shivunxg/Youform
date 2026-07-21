import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { clsx } from 'clsx';
const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/templates', icon: FileText, label: 'Templates' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];
export default function AppShell({ children }) {
  const { user, signOut } = useAuthStore();
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center"><span className="text-white font-bold text-xs">F</span></div>
            <span className="font-semibold text-gray-900">FormFlow</span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => clsx('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors', isActive ? 'bg-brand-50 text-brand-600 font-medium' : 'text-gray-600 hover:bg-gray-50')}>
              <Icon className="w-4 h-4 shrink-0" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0"><span className="text-brand-600 text-xs font-semibold">{user?.email?.[0]?.toUpperCase()}</span></div>
            <p className="text-xs font-medium text-gray-800 truncate flex-1">{user?.email}</p>
            <button onClick={signOut} className="text-gray-400 hover:text-gray-600"><LogOut className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
