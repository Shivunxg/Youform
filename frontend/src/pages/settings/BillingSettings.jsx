import { useState } from 'react';
import { Check, Zap, Lock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import toast from 'react-hot-toast';

// ─── Plan definitions ────────────────────────────────────────────────────────
const PLANS = {
  monthly: [
    {
      id: 'pro',
      name: 'Pro',
      price: 25,
      period: 'month',
      color: 'bg-orange-500',
      highlight: true,
      tagline: 'For growing teams who need automation and full branding control.',
      limits: ['5,000 responses / month', '3 team members', '2 GB storage', 'Unlimited file uploads'],
      sections: [
        {
          label: 'Branding & customisation',
          items: ['Remove FormFlow branding', 'Custom domain', 'Custom thank-you page & redirect URL'],
        },
        {
          label: 'Response collection',
          items: ['Respondent email notifications', 'Partial submissions & drop-off analytics'],
        },
        {
          label: 'Integrations & automation',
          items: [
            'All integrations — Slack, Webhook, Zapier, HubSpot, Airtable, Mailchimp, Notion',
            'AI form generator',
            'AI block rewriter',
            'Import from Typeform & Google Forms',
          ],
        },
      ],
    },
    {
      id: 'business',
      name: 'Business',
      price: 89,
      period: 'month',
      color: 'bg-violet-600',
      highlight: false,
      tagline: 'For teams that need identity verification, compliance, and scale.',
      limits: ['25,000 responses / month', '10 team members', '10 GB storage', 'Unlimited file uploads'],
      sections: [
        {
          label: 'Everything in Pro, plus',
          items: [
            'Phone OTP verification',
            'Email OTP verification',
            'Workspace activity log & audit trail',
          ],
        },
      ],
    },
  ],
  yearly: [
    {
      id: 'pro',
      name: 'Pro',
      price: 20,
      period: 'month',
      billed: 'billed annually ($240/yr)',
      color: 'bg-orange-500',
      highlight: true,
      tagline: 'For growing teams who need automation and full branding control.',
      limits: ['5,000 responses / month', '3 team members', '2 GB storage', 'Unlimited file uploads'],
      sections: [
        {
          label: 'Branding & customisation',
          items: ['Remove FormFlow branding', 'Custom domain', 'Custom thank-you page & redirect URL'],
        },
        {
          label: 'Response collection',
          items: ['Respondent email notifications', 'Partial submissions & drop-off analytics'],
        },
        {
          label: 'Integrations & automation',
          items: [
            'All integrations — Slack, Webhook, Zapier, HubSpot, Airtable, Mailchimp, Notion',
            'AI form generator',
            'AI block rewriter',
            'Import from Typeform & Google Forms',
          ],
        },
      ],
    },
    {
      id: 'business',
      name: 'Business',
      price: 60,
      period: 'month',
      billed: 'billed annually ($720/yr)',
      color: 'bg-violet-600',
      highlight: false,
      tagline: 'For teams that need identity verification, compliance, and scale.',
      limits: ['25,000 responses / month', '10 team members', '10 GB storage', 'Unlimited file uploads'],
      sections: [
        {
          label: 'Everything in Pro, plus',
          items: [
            'Phone OTP verification',
            'Email OTP verification',
            'Workspace activity log & audit trail',
          ],
        },
      ],
    },
  ],
};

const FREE_FEATURES = [
  { label: 'Usage', items: ['500 responses / month', '1 team member', '100 MB storage', '10 MB file uploads'] },
  { label: 'Form building', items: ['All question types', 'Conditional logic', 'Template library', 'Form password protection', 'Form scheduling & response caps'] },
  { label: 'Analytics & data', items: ['Completion analytics', 'Drop-off by question', 'CSV export', 'Google Sheets integration', 'Email notifications to owner'] },
];

export default function BillingSettings() {
  const [billingInterval, setBillingInterval] = useState('yearly');
  const { activeWorkspaceId } = useWorkspaceStore();

  const { data: usageData } = useQuery({
    queryKey: ['usage', activeWorkspaceId],
    queryFn: () => api.workspaces.usage(activeWorkspaceId),
    enabled: !!activeWorkspaceId,
  });

  const currentPlan = usageData?.plan ?? 'free';
  const plans = PLANS[billingInterval];

  const handleUpgrade = async (planId) => {
    try {
      const { url } = await api.billing.checkout(activeWorkspaceId, { plan: planId, interval: billingInterval });
      window.location.href = url;
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Billing</h1>
      <p className="text-sm text-gray-500 mb-6">
        {currentPlan === 'free'
          ? 'You\'re on the free plan. Upgrade to unlock more responses and features.'
          : <>You\'re on the <span className="font-semibold capitalize">{currentPlan}</span> plan.</>}
      </p>

      {/* Usage bars */}
      {usageData && (
        <div className="mb-8 p-5 bg-gray-50 rounded-2xl space-y-3">
          <p className="text-sm font-semibold text-gray-700 mb-3">Current usage this month</p>
          <UsageBar label="Responses" used={usageData.responses_used} limit={usageData.responses_limit} />
          <UsageBar label="Storage" used={Math.round(usageData.storage_used_mb)} limit={usageData.storage_limit_mb} unit=" MB" />
          <UsageBar label="Seats" used={usageData.seats_used} limit={usageData.seat_limit} />
        </div>
      )}

      {/* Interval toggle */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm text-gray-600 font-medium">Billing period:</span>
        <div className="flex bg-gray-100 rounded-full p-1">
          {['monthly', 'yearly'].map(iv => (
            <button
              key={iv}
              onClick={() => setBillingInterval(iv)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${billingInterval === iv ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {iv === 'yearly' ? <>Yearly <span className="text-emerald-600 text-xs">Save 30%</span></> : 'Monthly'}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {plans.map(plan => {
          const isCurrent = currentPlan === plan.id;
          return (
            <div
              key={plan.id}
              className={`rounded-2xl border-2 overflow-hidden flex flex-col ${plan.highlight ? 'border-orange-400' : 'border-gray-200'}`}
            >
              {/* Header */}
              <div className={`px-5 pt-5 pb-4 ${plan.highlight ? 'bg-orange-50' : 'bg-white'}`}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  {plan.highlight && (
                    <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                      Most popular
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-3 leading-snug">{plan.tagline}</p>
                <div className="mb-0.5">
                  <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-500 text-sm">/{plan.period}</span>
                </div>
                {plan.billed && <p className="text-[11px] text-gray-400">{plan.billed}</p>}
              </div>

              {/* Limits chips */}
              <div className="px-5 py-3 border-t border-b border-gray-100 flex flex-wrap gap-1.5 bg-gray-50">
                {plan.limits.map(l => (
                  <span key={l} className="text-[11px] font-semibold text-gray-600 bg-white border border-gray-200 rounded-full px-2.5 py-0.5">
                    {l}
                  </span>
                ))}
              </div>

              {/* Feature sections */}
              <div className="px-5 py-4 space-y-4 flex-1">
                {plan.sections.map(sec => (
                  <div key={sec.label}>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{sec.label}</p>
                    <ul className="space-y-1.5">
                      {sec.items.map(f => (
                        <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                          <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="px-5 pb-5">
                {isCurrent ? (
                  <div className="w-full py-2.5 rounded-xl text-center text-sm font-semibold text-gray-500 bg-gray-100">
                    Current plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    className={`w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 ${plan.color}`}
                  >
                    Upgrade to {plan.name} →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Free plan comparison */}
      <details className="group mb-6">
        <summary className="cursor-pointer text-sm text-gray-500 font-medium list-none flex items-center gap-1.5 select-none hover:text-gray-700 transition-colors">
          <Lock className="w-3.5 h-3.5" />
          What's included on the free plan?
          <span className="ml-auto text-xs group-open:rotate-180 transition-transform inline-block">▾</span>
        </summary>
        <div className="mt-4 grid grid-cols-3 gap-3 border border-gray-200 rounded-xl p-4 bg-gray-50">
          {FREE_FEATURES.map(sec => (
            <div key={sec.label}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{sec.label}</p>
              <ul className="space-y-1">
                {sec.items.map(f => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
                    <Check className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>

      {/* Manage subscription */}
      {currentPlan !== 'free' && (
        <div className="pt-6 border-t border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Manage subscription</h2>
          <button
            onClick={async () => {
              try {
                const { url } = await api.billing.portal(activeWorkspaceId);
                window.location.href = url;
              } catch (err) { toast.error(err.message); }
            }}
            className="btn-secondary"
          >
            Open billing portal
          </button>
        </div>
      )}
    </div>
  );
}

function UsageBar({ label, used, limit, unit = '' }) {
  const pct = limit ? Math.min(Math.round((used / limit) * 100), 100) : 0;
  const color = pct > 85 ? '#ef4444' : pct > 65 ? '#f59e0b' : '#6366f1';
  const isUnlimited = !limit;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="text-gray-500">
          {(used ?? 0).toLocaleString()}{unit}
          {isUnlimited ? ' / ∞' : ` / ${(limit ?? 0).toLocaleString()}${unit}`}
        </span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: isUnlimited ? '0%' : `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
