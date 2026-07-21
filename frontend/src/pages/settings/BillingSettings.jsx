import { useState } from 'react';
import { Check, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import toast from 'react-hot-toast';

const PLANS = {
  monthly: [
    {
      id: 'pro',
      name: 'Pro',
      seats: '3 seats',
      price: 25,
      period: 'month',
      color: 'bg-orange-500',
      features: [
        'Remove FormFlow branding',
        'Custom thank-you pages',
        'Unlimited file upload size',
        'Respondent email notifications',
        'Custom domain',
        'Partial submissions',
        'Invite up to 3 team members',
      ],
    },
    {
      id: 'business',
      name: 'Business',
      seats: '5+ seats',
      price: 89,
      period: 'month',
      color: 'bg-yellow-400',
      features: [
        'Everything in Pro',
        '5 team members included',
        'Extra seats at $10/mo',
        'Phone verification via OTP',
        'Email verification via OTP',
        'Activity log & audit trail',
      ],
    },
  ],
  yearly: [
    {
      id: 'pro',
      name: 'Pro',
      seats: '3 seats',
      price: 20,
      period: 'month',
      billed: 'billed annually',
      color: 'bg-orange-500',
      features: [
        'Remove FormFlow branding',
        'Custom thank-you pages',
        'Unlimited file upload size',
        'Respondent email notifications',
        'Custom domain',
        'Partial submissions',
        'Invite up to 3 team members',
      ],
    },
    {
      id: 'business',
      name: 'Business',
      seats: '5+ seats',
      price: 60,
      period: 'month',
      billed: 'billed annually',
      color: 'bg-yellow-400',
      features: [
        'Everything in Pro',
        '5 team members included',
        'Extra seats at $10/mo',
        'Phone verification via OTP',
        'Email verification via OTP',
        'Activity log & audit trail',
      ],
    },
  ],
};

export default function BillingSettings() {
  const [interval, setInterval] = useState('yearly');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const { activeWorkspaceId } = useWorkspaceStore();

  const { data: usageData } = useQuery({
    queryKey: ['usage', activeWorkspaceId],
    queryFn: () => api.workspaces.usage(activeWorkspaceId),
    enabled: !!activeWorkspaceId,
  });

  const currentPlan = usageData?.plan ?? 'free';

  const handleUpgrade = async (planId) => {
    try {
      const { url } = await api.billing.checkout(activeWorkspaceId, { plan: planId, interval });
      window.location.href = url;
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 mb-2">Billing</h1>

      {currentPlan === 'free' ? (
        <p className="text-sm text-gray-500 mb-6">
          Your organization is on the <span className="font-medium">free plan</span>.
        </p>
      ) : (
        <p className="text-sm text-gray-500 mb-6">
          Your organization is on the <span className="font-medium capitalize">{currentPlan} plan</span>.
        </p>
      )}

      {/* Usage bars */}
      {usageData && (
        <div className="mb-8 p-5 bg-gray-50 rounded-2xl space-y-3">
          <p className="text-sm font-semibold text-gray-700 mb-3">Current usage</p>
          <UsageBar label="Responses" used={usageData.responses_used} limit={usageData.responses_limit} />
          <UsageBar label="Storage" used={Math.round(usageData.storage_used_mb)} limit={usageData.storage_limit_mb} unit="MB" />
        </div>
      )}

      {/* Interval toggle */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm text-gray-600">Billing period:</span>
        <div className="flex bg-gray-100 rounded-full p-1">
          <button
            onClick={() => setInterval('monthly')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${interval === 'monthly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval('yearly')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${interval === 'yearly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            Yearly <span className="text-green-600 text-xs font-semibold">Save 30%+</span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-2 gap-4">
        {PLANS[interval].map(plan => (
          <div key={plan.id} className="border border-gray-200 rounded-2xl overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{plan.seats}</span>
              </div>
              <div className="mb-1">
                <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                <span className="text-gray-500 text-sm">/{plan.period}</span>
              </div>
              {plan.billed && <p className="text-xs text-gray-400 mb-4">{plan.billed}</p>}

              <ul className="space-y-2 mb-5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                    <span dangerouslySetInnerHTML={{ __html: f.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.id)}
                className={`w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 ${plan.color}`}
              >
                Get {plan.name} →
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        Compare all features on our{' '}
        <a href="#" className="underline">pricing page</a>.
      </p>

      {/* Manage subscription (for paid plans) */}
      {currentPlan !== 'free' && (
        <div className="mt-8 pt-6 border-t border-gray-100">
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
  const color = pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#6366f1';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="text-gray-500">{(used ?? 0).toLocaleString()}{unit} / {limit ? `${limit.toLocaleString()}${unit}` : '∞'}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
