import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';

const NAV = [
  { to: '/settings/organization', label: 'Settings',       sub: null },
  { to: '/settings/members',      label: 'Members',        sub: null },
  { to: '/settings/smtp',         label: 'SMTP Settings',  sub: 'For sending emails' },
  { to: '/settings/sms',          label: 'SMS Provider',   sub: 'For phone verification' },
  { to: '/settings/stripe',       label: 'Stripe Settings',sub: 'For payments' },
  { to: '/settings/activity',     label: 'Activity Log',   sub: 'Audit trail' },
  { to: '/settings/billing',      label: 'Billing',        sub: null },
];

export default function SettingsLayout() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <div className="flex gap-6">
          {/* Left nav */}
          <aside className="w-56 shrink-0">
            <nav className="space-y-0.5">
              {NAV.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => clsx(
                    'block px-4 py-3 rounded-xl transition-colors',
                    isActive ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      {item.sub && <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>}
                    </div>
                    {({ isActive }) => isActive && <span className="text-gray-400">→</span>}
                  </div>
                </NavLink>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 bg-white rounded-2xl border border-gray-200 p-8 min-h-96">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
