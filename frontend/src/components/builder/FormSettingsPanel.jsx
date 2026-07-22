import { X, Lock, Plus, Trash2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useBuilderStore } from '@/stores/builderStore';
import { hasFeature } from '@/lib/plans';

function FeatureToggle({ label, description, value, onChange, plan, feature }) {
  const allowed = hasFeature(plan, feature);
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-gray-800">{label}</p>
          {!allowed && (
            <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">Pro</span>
          )}
        </div>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      {allowed ? (
        <button
          type="button"
          role="switch"
          aria-checked={!!value}
          onClick={() => onChange(!value)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${value ? 'bg-brand-500' : 'bg-gray-200'}`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-1'}`} />
        </button>
      ) : (
        <a href="/settings/billing" className="shrink-0">
          <Lock className="w-4 h-4 text-gray-300" />
        </a>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-1">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 pt-4 pb-1">{title}</p>
      <div className="px-4">{children}</div>
    </div>
  );
}

export default function FormSettingsPanel({ onClose }) {
  const { form, updateForm } = useBuilderStore();
  if (!form) return null;

  const plan = form.workspaces?.plan ?? 'free';
  const settings = form.settings ?? {};

  const update = (key, val) => updateForm({ settings: { ...settings, [key]: val } });
  const updateTop = (key, val) => updateForm({ [key]: val });

  return (
    <aside className="w-72 bg-white border-l border-gray-100 overflow-y-auto shrink-0 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <span className="text-xs font-semibold text-gray-700">Form Settings</span>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Appearance */}
      <Section title="Appearance">
        <FeatureToggle
          label="Remove FormFlow branding"
          description="Hide the 'Made with Youform' badge"
          value={settings.removeBranding}
          onChange={v => update('removeBranding', v)}
          plan={plan}
          feature="remove_branding"
        />
      </Section>

      {/* Behavior */}
      <Section title="Behavior">
        <FeatureToggle
          label="Allow partial submissions"
          description="Save progress if respondent leaves mid-form"
          value={settings.allowPartial}
          onChange={v => update('allowPartial', v)}
          plan={plan}
          feature="partial_submissions"
        />

        {/* Redirect URL */}
        <div className="py-3 border-b border-gray-100">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-sm font-medium text-gray-800">Redirect after submission</p>
            {!hasFeature(plan, 'custom_thank_you') && (
              <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">Pro</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-2">Send respondents to a custom URL</p>
          {hasFeature(plan, 'custom_thank_you') ? (
            <input
              type="url"
              className="input text-sm"
              placeholder="https://yoursite.com/thanks"
              value={settings.redirectUrl ?? ''}
              onChange={e => update('redirectUrl', e.target.value || undefined)}
            />
          ) : (
            <a href="/settings/billing" className="text-xs text-brand-500 hover:underline flex items-center gap-1">
              <Lock className="w-3 h-3" /> Upgrade to Pro to enable
            </a>
          )}
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <FeatureToggle
          label="Notify me on new response"
          description="Get an email for each submission"
          value={settings.notifyOwner}
          onChange={v => update('notifyOwner', v)}
          plan={plan}
          feature="respondent_notifications"
        />
        <FeatureToggle
          label="Send copy to respondent"
          description="Email respondent a copy of their answers"
          value={settings.respondentCopy}
          onChange={v => update('respondentCopy', v)}
          plan={plan}
          feature="respondent_notifications"
        />
      </Section>

      {/* Quiz mode */}
      <Section title="Quiz & Scoring">
        <FeatureToggle
          label="Quiz mode"
          description="Assign scores to answers and show results at the end"
          value={settings.quizMode}
          onChange={v => update('quizMode', v)}
          plan={plan}
          feature="remove_branding"
        />
      </Section>

      {/* Hidden fields */}
      <Section title="Hidden Fields">
        <div className="py-2 space-y-2">
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Capture URL parameters with every response. Pass values as <code className="bg-gray-100 px-1 rounded">?field=value</code>.
          </p>
          {(settings.hiddenFields ?? []).map((field, i) => (
            <div key={field.id} className="flex items-center gap-1.5">
              <input
                className="input text-xs py-1 flex-1 font-mono"
                placeholder="field_name"
                value={field.key}
                onChange={e => {
                  const updated = (settings.hiddenFields ?? []).map((f, j) =>
                    j === i ? { ...f, key: e.target.value.replace(/\s/g, '_').toLowerCase() } : f
                  );
                  update('hiddenFields', updated);
                }}
              />
              <button
                onClick={() => update('hiddenFields', (settings.hiddenFields ?? []).filter((_, j) => j !== i))}
                className="p-1 text-gray-300 hover:text-red-400 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => update('hiddenFields', [...(settings.hiddenFields ?? []), { id: nanoid(), key: '' }])}
            className="flex items-center gap-1 text-xs text-[#f97316] font-bold hover:underline mt-1"
          >
            <Plus className="w-3 h-3" /> Add field
          </button>
        </div>
      </Section>

      {/* Schedule */}
      <Section title="Schedule & Limits">
        <div className="py-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Opens at</label>
            <input
              type="datetime-local"
              className="input text-sm"
              value={form.opens_at ? form.opens_at.slice(0, 16) : ''}
              onChange={e => updateTop('opens_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Closes at</label>
            <input
              type="datetime-local"
              className="input text-sm"
              value={form.closes_at ? form.closes_at.slice(0, 16) : ''}
              onChange={e => updateTop('closes_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Response limit</label>
            <input
              type="number"
              className="input text-sm"
              placeholder="Unlimited"
              min={1}
              value={form.response_limit ?? ''}
              onChange={e => updateTop('response_limit', e.target.value ? +e.target.value : null)}
            />
          </div>
        </div>
      </Section>
    </aside>
  );
}
