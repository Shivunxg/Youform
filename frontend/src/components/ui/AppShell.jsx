import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { Bell, ChevronDown, Settings, LogOut, User, LayoutDashboard, FileText } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { clsx } from 'clsx';

const SG = { fontFamily: 'Space Grotesk, system-ui, sans-serif' };

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
    <div className="min-h-screen bg-[#FFFBF2]">
      {/* Top header */}
      <header className="bg-white border-b-2 border-[#111] h-14 flex items-center px-4 gap-3 sticky top-0 z-30">

        {/* Logo */}
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center border-2 border-[#111]"
            style={{ background: '#111', boxShadow: '2px 2px 0 #f97316' }}>
            <span className="text-white font-bold text-sm" style={SG}>F</span>
          </div>
          <span className="font-bold text-[#111] text-base hidden sm:block" style={SG}>FormFlow</span>
        </button>

        {/* Workspace switcher */}
        <div className="relative">
          <button
            onClick={() => setShowWsMenu(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-[#111] text-sm text-[#111] transition-all hover:-translate-y-px"
            style={{ fontWeight: 700, ...SG, boxShadow: '2px 2px 0 #111' }}
          >
            <div className="w-5 h-5 rounded-md border-2 border-[#111] flex items-center justify-center"
              style={{ background: '#f97316' }}>
              <span className="text-white text-xs font-bold">{activeWs?.name?.[0] ?? 'W'}</span>
            </div>
            {activeWs?.name ?? 'Select workspace'}
            <ChevronDown className="w-3.5 h-3.5 text-[#111]" />
          </button>

          {showWsMenu && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl border-2 border-[#111] py-1 z-50"
              style={{ boxShadow: '4px 4px 0 #111' }}>
              {workspaces.map(ws => (
                <button
                  key={ws.id}
                  onClick={() => { setActiveWorkspace(ws.id); setShowWsMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[#FFFBF2]"
                  style={{ fontWeight: 700, color: ws.id === activeWorkspaceId ? '#f97316' : '#111' }}
                >
                  <div className="w-6 h-6 rounded-md border-2 border-[#111] flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: '#111' }}>
                    {ws.name?.[0]}
                  </div>
                  {ws.name}
                </button>
              ))}
              <div className="border-t-2 border-[#111] mt-1 pt-1">
                <button onClick={() => { navigate('/settings/organization'); setShowWsMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-[#111] hover:bg-[#FFFBF2] transition-colors">
                  <Settings className="w-3.5 h-3.5" /> Organization settings
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-1 ml-2">
          <NavLink to="/dashboard"
            className={({ isActive }) => clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all border-2',
              isActive
                ? 'bg-[#111] text-white border-[#111]'
                : 'text-[#111] border-transparent hover:border-[#111] hover:bg-[#FFFBF2]'
            )}
            style={{ fontWeight: 700, ...SG }}>
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </NavLink>
          <NavLink to="/templates"
            className={({ isActive }) => clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all border-2',
              isActive
                ? 'bg-[#111] text-white border-[#111]'
                : 'text-[#111] border-transparent hover:border-[#111] hover:bg-[#FFFBF2]'
            )}
            style={{ fontWeight: 700, ...SG }}>
            <FileText className="w-4 h-4" /> Templates
          </NavLink>
        </nav>

        <div className="flex-1" />

        {/* Right side */}
        <div className="flex items-center gap-2">
          {!isPro && (
            <button
              onClick={() => navigate('/settings/billing')}
              className="px-4 py-1.5 text-white text-sm rounded-lg border-2 border-[#111] transition-all hover:-translate-y-px"
              style={{ background: '#f97316', fontWeight: 700, ...SG, boxShadow: '2px 2px 0 #111' }}
            >
              ⚡ Upgrade
            </button>
          )}

          <button className="w-9 h-9 flex items-center justify-center rounded-lg border-2 border-transparent hover:border-[#111] text-[#111] transition-colors">
            <Bell className="w-4 h-4" />
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(v => !v)}
              className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg transition-colors border-2 border-transparent hover:border-[#111] hover:bg-[#FFFBF2]"
            >
              <span className="text-sm text-[#111] hidden sm:block" style={{ fontWeight: 700, ...SG }}>
                {user?.user_metadata?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0]}
              </span>
              <div className="w-8 h-8 rounded-full border-2 border-[#111] flex items-center justify-center text-white text-sm font-bold"
                style={{ background: '#111' }}>
                {initials}
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-xl border-2 border-[#111] py-1 z-50"
                style={{ boxShadow: '4px 4px 0 #111' }}>
                <div className="px-3 py-2 border-b-2 border-[#111]">
                  <p className="text-sm font-bold text-[#111]" style={SG}>{user?.user_metadata?.full_name ?? 'User'}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button onClick={() => { navigate('/settings/account'); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-[#111] hover:bg-[#FFFBF2] transition-colors">
                  <User className="w-4 h-4" /> Account Settings
                </button>
                <button onClick={signOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-[#111] hover:bg-[#FFFBF2] transition-colors">
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
