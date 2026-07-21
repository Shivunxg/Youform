import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { hasFeature } from '@/lib/plans';
import FormHeader from '@/components/builder/FormHeader';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { Lock } from 'lucide-react';

export default function FormSettingsPage() {
  const { formId } = useParams();
  const { user } = useAuthStore();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['form-settings', formId],
    queryFn: () => api.forms.get(formId),
    staleTime: 30_000,
  });

  const { data: usageData } = useQuery({
    queryKey: ['usage'],
    queryFn: () => api.workspaces?.getUsage ? api.workspaces.getUsage() : Promise.resolve({ plan: 'free' }),
    staleTime: 300_000,
  });

  const plan = usageData?.plan ?? 'free';
  const form = data?.form;

  const updateMutation = useMutation({
    mutationFn: (updates) => api.forms.update(formId, updates),
    onSuccess: () => { toast.success('Settings saved'); refetch(); },
    onError: () => toast.error('Could not save settings'),
  });

  const [local, setLocal] = useState(null);
  const settings = local ?? form?.settings ?? {};
  const theme = form?.theme ?? {};

  if (isLoading || !form) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <FormHeader staticTitle="Settings" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const save = () => {
    if (!local) return;
    updateMutation.mutate({ settings: local });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <FormHeader staticTitle={form.title} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Form Settings</h1>
              <p className="text-sm text-gray-500 mt-1">Configure behavior, notifications, and limits.</p>
            </div>
            <button
              onClick={save}
              disabled={!local || updateMutation.isPending}
              className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>

          {/* Appearance */}
          <SettingsSection title="Appearance">
            <SettingRow
              label="Remove FormFlow branding"
              description="Hide the 'Powered by FormFlow' footer on your form."
              pro={!hasFeature(plan, 'remove_branding')}
              plan={plan}
            >
              <Toggle
                checked={settings.removeBranding ?? false}
                disabled={!hasFeature(plan, 'remove_branding')}
                onChange={v => setLocal(s => ({ ...s, removeBranding: v }))}
              />
            </SettingRow>
          </SettingsSection>

          {/* Behavior */}
          <SettingsSection title="Behavior">
            <SettingRow
              label="Allow partial submissions"
              description="Capture responses even when the form is abandoned mid-way."
              pro={!hasFeature(plan, 'partial_submissions')}
              plan={plan}
            >
              <Toggle
                checked={settings.allowPartialSubmissions ?? false}
                disabled={!hasFeature(plan, 'partial_submissions')}
                onChange={v => setLocal(s => ({ ...s, allowPartialSubmissions: v }))}
              />
            </SettingRow>

            <SettingRow
              label="Redirect URL after submit"
              description="Send respondents to a custom URL instead of the thank-you screen."
              pro={!hasFeature(plan, 'custom_thank_you')}
              plan={plan}
            >
              <input
                type="url"
                className="input text-sm w-64"
                placeholder="https://example.com/thank-you"
                value={settings.redirectUrl ?? ''}
                disabled={!hasFeature(plan, 'custom_thank_you')}
                onChange={e => setLocal(s => ({ ...s, redirectUrl: e.target.value }))}
              />
            </SettingRow>
          </SettingsSection>

          {/* Notifications */}
          <SettingsSection title="Notifications">
            <SettingRow
              label="Notify me on each submission"
              description="Get an email when someone completes this form."
            >
              <Toggle
                checked={settings.notifyOwner ?? true}
                onChange={v => setLocal(s => ({ ...s, notifyOwner: v }))}
              />
            </SettingRow>

            <SettingRow
              label="Send confirmation to respondent"
              description="Email a copy of their answers to the respondent."
              pro={!hasFeature(plan, 'respondent_notifications')}
              plan={plan}
            >
              <Toggle
                checked={settings.notifyRespondent ?? false}
                disabled={!hasFeature(plan, 'respondent_notifications')}
                onChange={v => setLocal(s => ({ ...s, notifyRespondent: v }))}
              />
            </SettingRow>
          </SettingsSection>

          {/* Schedule & Limits */}
          <SettingsSection title="Schedule & Limits">
            <SettingRow label="Open date" description="Form won't accept responses before this date.">
              <input
                type="datetime-local"
                className="input text-sm w-auto"
                value={settings.opensAt ?? ''}
                onChange={e => setLocal(s => ({ ...s, opensAt: e.target.value }))}
              />
            </SettingRow>

            <SettingRow label="Close date" description="Automatically close the form at this date & time.">
              <input
                type="datetime-local"
                className="input text-sm w-auto"
                value={settings.closesAt ?? ''}
                onChange={e => setLocal(s => ({ ...s, closesAt: e.target.value }))}
              />
            </SettingRow>

            <SettingRow label="Response limit" description="Stop accepting submissions after this many responses.">
              <input
                type="number"
                className="input text-sm w-32"
                min="1"
                placeholder="Unlimited"
                value={settings.responseLimit ?? ''}
                onChange={e => setLocal(s => ({ ...s, responseLimit: e.target.value ? Number(e.target.value) : null }))}
              />
            </SettingRow>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children, pro, plan }) {
  return (
    <div className={clsx('flex items-center justify-between gap-4 px-5 py-4', pro && 'opacity-70')}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-800">{label}</p>
          {pro && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full">
              <Lock className="w-2.5 h-2.5" /> PRO
            </span>
          )}
        </div>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={clsx(
        'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none',
        checked ? 'bg-brand-500' : 'bg-gray-200',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      )}
    >
      <span
        className={clsx(
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0'
        )}
      />
    </button>
  );
}
