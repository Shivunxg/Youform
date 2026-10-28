import { NavLink, Outlet } from 'react-router-dom';
import { clsx } from 'clsx';
import AppShell from '@/components/ui/AppShell';

const NAV = [
  { to: '/settings/organization',   label: 'Organization',    sub: null },
  { to: '/settings/members',        label: 'Members',         sub: null },
  { to: '/settings/linked-emails',  label: 'Linked Emails',   sub: 'Notification recipients' },
  { to: '/settings/smtp',           label: 'SMTP Settings',   sub: 'For sending emails' },
  { to: '/settings/sms',            label: 'SMS Provider',    sub: 'For phone verification' },
  { to: '/settings/stripe',         label: 'Stripe Settings', sub: 'For payments' },
  { to: '/settings/activity',       label: 'Activity Log',    sub: 'Audit trail' },
  { to: '/settings/billing',        label: 'Billing',         sub: null },
];

export default function SettingsLayout() {
  return (
    <AppShell>
      <div className="px-6 py-6 max-w-4xl">
        <h1 className="text-lg font-bold text-gray-900 mb-6">Settings</h1>
        <div className="flex gap-6">
          {/* Left sub-nav */}
          <aside className="w-48 shrink-0">
            <nav className="space-y-0.5">
              {NAV.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => clsx(
                    'block px-3 py-2.5 rounded-xl transition-colors',
                    isActive ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <p className="text-sm">{item.label}</p>
                  {item.sub && <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>}
                </NavLink>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 bg-white rounded-2xl border border-gray-200 p-7 min-h-96">
            <Outlet />
          </main>
        </div>
      </div>
    </AppShell>
  );
}
