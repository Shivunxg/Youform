import { useState } from 'react';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Code2, Settings, Users, Mail,
  CreditCard, LogOut, User, ChevronDown, ChevronRight, Plus,
  HelpCircle, Activity, MessageSquare
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { clsx } from 'clsx';

function SidebarSection({ label, children }) {
  return (
    <div className="mb-4">
      <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      {children}
    </div>
  );
}

function SidebarLink({ to, icon: Icon, label, end }) {
  return (
    <NavLink to={to} end={end}
      className={({ isActive }) => clsx(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-brand-50 text-brand-600 font-semibold'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
      )}>
      {({ isActive }) => (
        <>
          <Icon className={clsx('w-4 h-4 shrink-0', isActive ? 'text-brand-500' : 'text-gray-400')} />
          {label}
        </>
      )}
    </NavLink>
  );
}

export default function AppShell({ children }) {
  const { user, signOut } = useAuthStore();
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const activeWs = workspaces.find(w => w.id === activeWorkspaceId);
  const [showWsMenu, setShowWsMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  const isPro = activeWs?.plan && activeWs.plan !== 'free';
  const initials = user?.email?.[0]?.toUpperCase() ?? '?';
  const displayName = user?.user_metadata?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'User';

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 w-56 bg-white border-r border-gray-200 flex flex-col z-30">

        {/* Logo + plan badge */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-gray-100 shrink-0">
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">F</span>
          </div>
          <span className="font-bold text-gray-900 text-sm tracking-tight">FormFlowX</span>
          <span className={clsx(
            'ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
            isPro ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-500'
          )}>
            {isPro ? 'PRO' : 'Free'}
          </span>
        </div>

        {/* Workspace switcher */}
        <div className="px-3 py-2.5 border-b border-gray-100 shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowWsMenu(v => !v)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-sm text-gray-700 transition-colors"
            >
              <div className="w-5 h-5 rounded bg-brand-100 flex items-center justify-center shrink-0">
                <span className="text-brand-600 text-xs font-bold">{activeWs?.name?.[0] ?? 'W'}</span>
              </div>
              <span className="flex-1 text-left truncate font-medium text-xs">{activeWs?.name ?? 'My Workspace'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            </button>

            {showWsMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                {workspaces.map(ws => (
                  <button
                    key={ws.id}
                    onClick={() => { setActiveWorkspace(ws.id); setShowWsMenu(false); }}
                    className={clsx(
                      'w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50',
                      ws.id === activeWorkspaceId ? 'text-brand-600 font-semibold' : 'text-gray-700'
                    )}
                  >
                    <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center font-bold text-gray-600 shrink-0">
                      {ws.name?.[0]}
                    </div>
                    {ws.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          <SidebarSection label="Forms">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-xs text-gray-400 font-medium">All forms</span>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                title="New form"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <SidebarLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" end />
            <SidebarLink to="/templates" icon={FileText} label="Templates" />
          </SidebarSection>

          <SidebarSection label="API">
            <SidebarLink to="/api-endpoints" icon={Code2} label="Endpoints" />
          </SidebarSection>

          <SidebarSection label="Workspace">
            <SidebarLink to="/settings/organization"  icon={Settings}     label="Organization" />
            <SidebarLink to="/settings/members"       icon={Users}        label="Members" />
            <SidebarLink to="/settings/linked-emails" icon={Mail}         label="Linked Emails" />
            <SidebarLink to="/settings/smtp"          icon={MessageSquare} label="SMTP / Email" />
            <SidebarLink to="/settings/activity"      icon={Activity}     label="Activity Log" />
            <SidebarLink to="/settings/billing"       icon={CreditCard}   label="Billing" />
          </SidebarSection>
        </nav>

        {/* Usage counter */}
        <div className="mx-3 mb-2 px-2 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-gray-400">This month</span>
            <span className="text-[11px] font-semibold text-gray-600">0/250</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full" style={{ width: '0%' }} />
          </div>
        </div>

        {/* Upgrade banner (free plan only) */}
        {!isPro && (
          <div className="mx-3 mb-2 p-3 bg-brand-50 border border-brand-100 rounded-xl">
            <p className="text-xs font-semibold text-brand-700 mb-1">Upgrade to PRO</p>
            <p className="text-[11px] text-brand-500 mb-2 leading-snug">Unlimited forms, responses & team members.</p>
            <button
              onClick={() => navigate('/settings/billing')}
              className="w-full py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Upgrade →
            </button>
          </div>
        )}

        {/* User menu */}
        <div className="border-t border-gray-100 px-3 py-2 shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(v => !v)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-semibold text-gray-800 truncate">{displayName}</p>
                <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
            </button>

            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                <button
                  onClick={() => { navigate('/settings/account'); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <User className="w-3.5 h-3.5" /> Account Settings
                </button>
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────── */}
      <div
        className="flex-1 ml-56 min-w-0"
        onClick={() => { setShowUserMenu(false); setShowWsMenu(false); }}
      >
        {children}
      </div>
    </div>
  );
}
