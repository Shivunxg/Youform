import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { Bell, ChevronDown, Settings, LogOut, User, Plus, LayoutDashboard, FileText } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { clsx } from 'clsx';

export default function AppShell({ children }) {
  const { user, signOut } = useAuthStore();
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const activeWs = workspaces.find(w => w.id === activeWorkspaceId);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showWsMenu, setShowWsMenu] = useState(false);
  const navigate = useNavigate();

  const initials = user?.email?.[0]?.toUpperCase() ?? '?';
  const isPro = activeWs?.plan && activeWs.plan !== 'free';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top header */}
      <header className="bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-3 sticky top-0 z-30">
        {/* Logo */}
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">F</span>
          </div>
        </button>

        {/* Workspace switcher */}
        <div className="relative">
          <button
            onClick={() => setShowWsMenu(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 border border-gray-200 text-sm font-medium text-gray-700 transition-colors"
          >
            <div className="w-5 h-5 rounded bg-brand-100 flex items-center justify-center">
              <span className="text-brand-600 text-xs font-bold">{activeWs?.name?.[0] ?? 'W'}</span>
            </div>
            {activeWs?.name ?? 'Select workspace'}
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {showWsMenu && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
              {workspaces.map(ws => (
                <button
                  key={ws.id}
                  onClick={() => { setActiveWorkspace(ws.id); setShowWsMenu(false); }}
                  className={clsx('w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50', ws.id === activeWorkspaceId ? 'text-brand-600 font-medium' : 'text-gray-700')}
                >
                  <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                    {ws.name?.[0]}
                  </div>
                  {ws.name}
                </button>
              ))}
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button onClick={() => { navigate('/settings/organization'); setShowWsMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50">
                  <Settings className="w-3.5 h-3.5" /> Organization settings
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-1 ml-2">
          <NavLink to="/dashboard"
            className={({ isActive }) => clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')}>
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </NavLink>
          <NavLink to="/templates"
            className={({ isActive }) => clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')}>
            <FileText className="w-4 h-4" /> Templates
          </NavLink>
        </nav>

        <div className="flex-1" />

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Upgrade button */}
          {!isPro && (
            <button
              onClick={() => navigate('/settings/billing')}
              className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Buy PRO
            </button>
          )}

          {/* Notifications */}
          <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors relative">
            <Bell className="w-4.5 h-4.5" />
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(v => !v)}
              className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm text-gray-700 font-medium hidden sm:block">
                Hi, {user?.user_metadata?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0]}
              </span>
              <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-semibold">
                {initials}
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute top-full right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800">{user?.user_metadata?.full_name ?? 'User'}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button onClick={() => { navigate('/settings/account'); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <User className="w-4 h-4" /> Account Settings
                </button>
                <button onClick={signOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main onClick={() => { setShowUserMenu(false); setShowWsMenu(false); }}>
        {children}
      </main>
    </div>
  );
}
