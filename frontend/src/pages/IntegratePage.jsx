import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import FormHeader from '@/components/builder/FormHeader';
import toast from 'react-hot-toast';
import { ExternalLink, RefreshCw, Unlink, Plus, Check } from 'lucide-react';

const SG = { fontFamily: 'Space Grotesk, system-ui, sans-serif' };

const CATALOG = [
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    description: 'Send every new response as a new row in a Google Sheet automatically.',
    icon: '📊',
    category: 'Spreadsheets',
    available: true,
  },
  {
    id: 'webhook',
    name: 'Webhook',
    description: 'POST response data as JSON to any URL — connect any service or backend.',
    icon: '⚡',
    category: 'Developer',
    available: true,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get a Slack channel notification with a response summary on every submission.',
    icon: '💬',
    category: 'Notifications',
    available: true,
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Push form responses directly into a Notion database as new pages.',
    icon: '📝',
    category: 'Productivity',
    available: true,
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect to 5,000+ apps — send response data to any Zapier workflow.',
    icon: '⚙️',
    category: 'Automation',
    available: true,
  },
];

export default function IntegratePage() {
  const { formId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const oauthStatus = searchParams.get('oauth');

  const [expanded, setExpanded] = useState(null);
  const [forceSheetPicker, setForceSheetPicker] = useState(oauthStatus === 'google_success');

  useEffect(() => {
    if (oauthStatus === 'google_success') {
      toast.success('Google account connected! Select a sheet below.');
      setExpanded('google_sheets');
      setForceSheetPicker(true);
      setSearchParams({}, { replace: true });
    } else if (oauthStatus === 'google_error') {
      toast.error('Google connection failed. Please try again.');
      setSearchParams({}, { replace: true });
    }
  }, [oauthStatus]);

  const { data: formData } = useQuery({
    queryKey: ['form-meta', formId],
    queryFn: () => api.forms.get(formId),
    staleTime: 60_000,
  });

  const { data: intData, refetch: refetchInts } = useQuery({
    queryKey: ['integrations', formId],
    queryFn: () => api.integrations.list(formId),
    staleTime: 0,
  });

  const form = formData?.form;
  const integrations = intData?.integrations ?? [];

  const toggle = (id) => setExpanded(p => p === id ? null : id);

  return (
    <div className="h-screen flex flex-col bg-[#FFFBF2] overflow-hidden">
      <FormHeader staticTitle={form?.title} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#111]" style={SG}>Integrations</h1>
            <p className="text-sm text-gray-600 mt-1">
              Connect your form to the tools your team already uses.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {CATALOG.map(item => {
              const integration = integrations.find(i => i.type === item.id);
              const isExpanded = expanded === item.id || (item.id === 'google_sheets' && forceSheetPicker);
              return (
                <IntegrationCard
                  key={item.id}
                  item={item}
                  integration={integration}
                  formId={formId}
                  formTitle={form?.title}
                  isExpanded={isExpanded}
                  onToggle={() => toggle(item.id)}
                  onRefetch={refetchInts}
                  forceSheetPicker={item.id === 'google_sheets' && forceSheetPicker}
                  onSheetDone={() => { setForceSheetPicker(false); setExpanded(null); }}
                />
              );
            })}
          </div>

          <div className="mt-6 p-5 bg-white rounded-xl border-2 border-[#111] text-center" style={{ boxShadow: '4px 4px 0 #111' }}>
            <p className="text-sm font-bold text-[#111] mb-1" style={SG}>Need a custom integration?</p>
            <p className="text-xs text-gray-500 mb-3">
              Use Webhook to connect any system, or reach out for enterprise support.
            </p>
            <button onClick={() => toggle('webhook')} className="btn btn-secondary text-xs">
              Set up a Webhook ⚡
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({ item, integration, formId, formTitle, isExpanded, onToggle, onRefetch, forceSheetPicker, onSheetDone }) {
  const gsConnected  = item.id === 'google_sheets' && !!integration;
  const gsSetupDone  = gsConnected && !!integration.config?.spreadsheetId;

  let statusLabel = null;
  let statusBg    = '';
  if (item.id === 'google_sheets') {
    if (gsSetupDone)   { statusLabel = 'Connected';     statusBg = 'bg-green-300'; }
    else if (gsConnected) { statusLabel = 'Setup needed'; statusBg = 'bg-orange-200'; }
  } else if (integration) {
    statusLabel = integration.enabled ? 'Active' : 'Paused';
    statusBg    = integration.enabled ? 'bg-green-300' : 'bg-gray-200';
  }

  const handleGsConnect = async () => {
    try {
      const { url } = await api.integrations.googleOAuthStart(formId);
      window.location.href = url;
    } catch {
      toast.error('Could not start Google connection. Try again.');
    }
  };

  return (
    <div className="bg-white rounded-xl border-2 border-[#111] overflow-hidden" style={{ boxShadow: '4px 4px 0 #111' }}>
      {/* Header row */}
      <div className="flex items-center gap-4 p-4">
        <div className="w-11 h-11 rounded-lg border-2 border-[#111] flex items-center justify-center text-xl shrink-0 bg-white">
          {item.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-bold text-[#111] text-sm" style={SG}>{item.name}</span>
            {!item.available && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold border-2 border-[#111] bg-yellow-300">
                SOON
              </span>
            )}
            {statusLabel && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold border-2 border-[#111] ${statusBg}`}>
                {statusLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
        </div>

        {/* Action */}
        <div className="shrink-0">
          {!item.available ? (
            <span className="text-xs text-gray-400 font-bold" style={SG}>Coming soon</span>
          ) : item.id === 'google_sheets' ? (
            !gsConnected ? (
              <button onClick={handleGsConnect} className="btn btn-primary text-xs">
                Connect
              </button>
            ) : !gsSetupDone ? (
              <button onClick={onToggle} className="btn btn-primary text-xs">
                Pick sheet
              </button>
            ) : (
              <button onClick={onToggle} className="btn btn-secondary text-xs">
                Manage
              </button>
            )
          ) : (
            <button onClick={onToggle} className="btn btn-secondary text-xs">
              {integration ? 'Configure' : 'Set up'}
            </button>
          )}
        </div>
      </div>

      {/* Expanded config panel */}
      {isExpanded && (
        <div className="border-t-2 border-[#111] p-5 bg-[#FFFBF2]">
          {item.id === 'google_sheets' && (
            <GoogleSheetsPanel
              integration={integration}
              formId={formId}
              formTitle={formTitle}
              forceSheetPicker={forceSheetPicker}
              onRefetch={onRefetch}
              onClose={onSheetDone}
            />
          )}
          {item.id === 'webhook' && (
            <WebhookPanel
              integration={integration}
              formId={formId}
              onRefetch={onRefetch}
              onClose={onToggle}
            />
          )}
          {item.id === 'slack' && (
            <SlackPanel
              integration={integration}
              formId={formId}
              onRefetch={onRefetch}
              onClose={onToggle}
            />
          )}
          {item.id === 'zapier' && (
            <ZapierPanel
              integration={integration}
              formId={formId}
              onRefetch={onRefetch}
              onClose={onToggle}
            />
          )}
          {item.id === 'notion' && (
            <NotionPanel
              integration={integration}
              formId={formId}
              onRefetch={onRefetch}
              onClose={onToggle}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Google Sheets panels ─────────────────────────────────────────────

function GoogleSheetsPanel({ integration, formId, formTitle, forceSheetPicker, onRefetch, onClose }) {
  const hasSheet = !!integration?.config?.spreadsheetId;
  if (!forceSheetPicker && hasSheet) {
    return (
      <GoogleSheetsManage
        integration={integration}
        formId={formId}
        onRefetch={onRefetch}
        onClose={onClose}
      />
    );
  }
  return (
    <GoogleSheetsPicker
      integration={integration}
      formId={formId}
      formTitle={formTitle}
      onRefetch={onRefetch}
      onClose={onClose}
    />
  );
}

function GoogleSheetsManage({ integration, formId, onRefetch, onClose }) {
  const config = integration.config ?? {};

  const toggleMutation = useMutation({
    mutationFn: (enabled) => api.integrations.update(formId, integration.id, { enabled }),
    onSuccess: () => { toast.success(integration.enabled ? 'Integration paused.' : 'Integration activated.'); onRefetch(); },
    onError: (e) => toast.error(e.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => api.integrations.delete(formId, integration.id),
    onSuccess: () => { toast.success('Google Sheets disconnected.'); onRefetch(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Connected sheet</p>
          <a
            href={`https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold text-[#f97316] hover:underline flex items-center gap-1"
            style={SG}
          >
            {config.spreadsheetName || config.spreadsheetId}
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </a>
          {config.sheetName && (
            <p className="text-xs text-gray-500 mt-0.5">Tab: {config.sheetName}</p>
          )}
        </div>

        <button
          onClick={() => toggleMutation.mutate(!integration.enabled)}
          disabled={toggleMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-[#111] text-xs font-bold shrink-0 transition-all"
          style={{ ...SG, background: integration.enabled ? '#86efac' : '#e5e7eb', boxShadow: '2px 2px 0 #111' }}
        >
          {integration.enabled && <Check className="w-3 h-3" />}
          {integration.enabled ? 'Active' : 'Paused'}
        </button>
      </div>

      {integration.last_triggered_at && (
        <p className="text-xs text-gray-500">
          Last triggered: {new Date(integration.last_triggered_at).toLocaleString()}
        </p>
      )}
      {integration.last_error && (
        <p className="text-xs text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg border border-red-200">
          Last error: {integration.last_error}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={async () => {
            try {
              const { url } = await api.integrations.googleOAuthStart(formId, integration.id);
              window.location.href = url;
            } catch {
              toast.error('Could not reconnect Google. Try again.');
            }
          }}
          className="btn btn-secondary text-xs"
        >
          <RefreshCw className="w-3 h-3" /> Change sheet
        </button>
        <button
          onClick={() => disconnectMutation.mutate()}
          disabled={disconnectMutation.isPending}
          className="btn btn-danger text-xs"
        >
          <Unlink className="w-3 h-3" />
          {disconnectMutation.isPending ? 'Disconnecting…' : 'Disconnect'}
        </button>
      </div>
    </div>
  );
}

function GoogleSheetsPicker({ integration, formId, formTitle, onRefetch, onClose }) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [newTitle, setNewTitle] = useState(`${formTitle || 'Form'} Responses`);

  const connectMutation = useMutation({
    mutationFn: () => api.integrations.googleSheets.connectByUrl(formId, { url: sheetUrl }),
    onSuccess: (data) => {
      toast.success(`Connected to "${data.spreadsheetName}"!`);
      onRefetch();
      onClose();
    },
    onError: (e) => toast.error(e.message || 'Could not connect — check the URL and ensure the sheet is accessible.'),
  });

  const createMutation = useMutation({
    mutationFn: () => api.integrations.googleSheets.createSheet(formId, { title: newTitle }),
    onSuccess:  () => { toast.success('Sheet created and connected!'); onRefetch(); onClose(); },
    onError:    (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      {/* Option 1: paste existing sheet URL */}
      <div>
        <label className="block text-xs font-bold text-[#111] mb-2" style={SG}>
          Connect an existing Google Sheet
        </label>
        <div className="flex gap-2">
          <input
            value={sheetUrl}
            onChange={e => setSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="input flex-1 text-xs"
          />
          <button
            onClick={() => connectMutation.mutate()}
            disabled={!sheetUrl.trim() || connectMutation.isPending}
            className="btn btn-primary text-xs shrink-0"
          >
            {connectMutation.isPending ? 'Connecting…' : 'Connect'}
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">
          Open any Google Sheet → copy the URL from the address bar → paste above.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 border-t-2 border-[#111]" />
        <span className="text-xs font-bold text-gray-400">OR</span>
        <div className="flex-1 border-t-2 border-[#111]" />
      </div>

      {/* Option 2: create new sheet */}
      <div>
        <label className="block text-xs font-bold text-[#111] mb-2" style={SG}>
          Create a new Google Sheet
        </label>
        <div className="flex gap-2">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Sheet name…"
            className="input flex-1"
          />
          <button
            onClick={() => createMutation.mutate()}
            disabled={!newTitle.trim() || createMutation.isPending}
            className="btn btn-primary text-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {createMutation.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">
          A new spreadsheet will be created in your Google Drive automatically.
        </p>
      </div>
    </div>
  );
}

// ── Shared helper ────────────────────────────────────────────────────

function Steps({ steps }) {
  return (
    <div className="bg-white rounded-lg border-2 border-[#111] p-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Setup steps</p>
      <ol className="space-y-1.5">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2 text-xs text-gray-600">
            <span className="shrink-0 w-4 h-4 rounded-full bg-[#f97316]/15 text-[#f97316] font-bold text-[10px] flex items-center justify-center mt-px">{i + 1}</span>
            <span dangerouslySetInnerHTML={{ __html: s }} />
          </li>
        ))}
      </ol>
    </div>
  );
}

// ── Webhook panel ────────────────────────────────────────────────────

function WebhookPanel({ integration, formId, onRefetch, onClose }) {
  const [url, setUrl] = useState(integration?.config?.url ?? '');

  const saveMutation = useMutation({
    mutationFn: () => {
      if (integration) {
        return api.integrations.update(formId, integration.id, { config: { ...integration.config, url }, enabled: true });
      }
      return api.integrations.create(formId, { type: 'webhook', config: { url } });
    },
    onSuccess: () => { toast.success('Webhook saved!'); onRefetch(); onClose(); },
    onError:   (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.integrations.delete(formId, integration.id),
    onSuccess:  () => { toast.success('Webhook removed.'); onRefetch(); onClose(); },
    onError:    (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-[#111] mb-2" style={SG}>Endpoint URL</label>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://your-server.com/webhook"
          className="input"
        />
        <p className="text-[11px] text-gray-400 mt-1.5">
          We'll POST a JSON payload with all response data to this URL on every submission.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!url.trim() || saveMutation.isPending}
          className="btn btn-primary text-xs"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save webhook'}
        </button>
        {integration && (
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="btn btn-danger text-xs"
          >
            {deleteMutation.isPending ? 'Removing…' : 'Remove'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Slack panel ──────────────────────────────────────────────────────

function SlackPanel({ integration, formId, onRefetch, onClose }) {
  const [webhookUrl, setWebhookUrl] = useState(integration?.config?.webhookUrl ?? '');

  const saveMutation = useMutation({
    mutationFn: () => integration
      ? api.integrations.update(formId, integration.id, { config: { webhookUrl }, enabled: true })
      : api.integrations.create(formId, { type: 'slack', config: { webhookUrl } }),
    onSuccess: () => { toast.success('Slack connected!'); onRefetch(); onClose(); },
    onError:   (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.integrations.delete(formId, integration.id),
    onSuccess:  () => { toast.success('Slack removed.'); onRefetch(); onClose(); },
    onError:    (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Steps steps={[
        'Open your Slack workspace → go to <strong>api.slack.com/apps</strong> → Create New App → <strong>From scratch</strong>',
        'Under <strong>Features → Incoming Webhooks</strong>, toggle it On',
        'Click <strong>Add New Webhook to Workspace</strong>, pick a channel, and click Allow',
        'Copy the <strong>Webhook URL</strong> (starts with <code class="bg-gray-100 px-1 rounded">https://hooks.slack.com/</code>)',
        'Paste it below. Every new response will post a summary to that channel.',
      ]} />

      <div>
        <label className="block text-xs font-bold text-[#111] mb-2" style={SG}>Slack Webhook URL</label>
        <input
          value={webhookUrl}
          onChange={e => setWebhookUrl(e.target.value)}
          placeholder="https://hooks.slack.com/services/..."
          className="input"
        />
        <p className="text-[11px] text-gray-400 mt-1.5">
          Each submission sends a rich message with the top answers and a "View responses" button.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!webhookUrl.trim() || saveMutation.isPending}
          className="btn btn-primary text-xs"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save Slack hook'}
        </button>
        {integration && (
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="btn btn-danger text-xs"
          >
            {deleteMutation.isPending ? 'Removing…' : 'Remove'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Zapier panel ─────────────────────────────────────────────────────

function ZapierPanel({ integration, formId, onRefetch, onClose }) {
  const [webhookUrl, setWebhookUrl] = useState(integration?.config?.webhookUrl ?? '');

  const saveMutation = useMutation({
    mutationFn: () => integration
      ? api.integrations.update(formId, integration.id, { config: { webhookUrl }, enabled: true })
      : api.integrations.create(formId, { type: 'zapier', config: { webhookUrl } }),
    onSuccess: () => { toast.success('Zapier connected!'); onRefetch(); onClose(); },
    onError:   (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.integrations.delete(formId, integration.id),
    onSuccess:  () => { toast.success('Zapier removed.'); onRefetch(); onClose(); },
    onError:    (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Steps steps={[
        'Go to <strong>zapier.com</strong> → Create a Zap',
        'Trigger: choose <strong>Webhooks by Zapier</strong> → <strong>Catch Hook</strong>',
        'Copy the <strong>webhook URL</strong> Zapier shows you',
        'Paste it below and click <strong>Save</strong>',
        'Submit a test response, then finish building your Zap actions in Zapier',
      ]} />

      <div>
        <label className="block text-xs font-bold text-[#111] mb-2" style={SG}>Zapier Webhook URL</label>
        <input
          value={webhookUrl}
          onChange={e => setWebhookUrl(e.target.value)}
          placeholder="https://hooks.zapier.com/hooks/catch/..."
          className="input"
        />
        <p className="text-[11px] text-gray-400 mt-1.5">
          Every submission POSTs a JSON payload with all answers to this URL.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!webhookUrl.trim() || saveMutation.isPending}
          className="btn btn-primary text-xs"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save Zapier hook'}
        </button>
        {integration && (
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="btn btn-danger text-xs"
          >
            {deleteMutation.isPending ? 'Removing…' : 'Remove'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Notion panel ─────────────────────────────────────────────────────

function NotionPanel({ integration, formId, onRefetch, onClose }) {
  const [token,      setToken]      = useState(integration?.config?.token      ?? '');
  const [databaseId, setDatabaseId] = useState(integration?.config?.database_id ?? '');

  const saveMutation = useMutation({
    mutationFn: () => integration
      ? api.integrations.update(formId, integration.id, { config: { token, database_id: databaseId }, enabled: true })
      : api.integrations.create(formId, { type: 'notion', config: { token, database_id: databaseId } }),
    onSuccess: () => { toast.success('Notion connected!'); onRefetch(); onClose(); },
    onError:   (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.integrations.delete(formId, integration.id),
    onSuccess:  () => { toast.success('Notion removed.'); onRefetch(); onClose(); },
    onError:    (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Steps steps={[
        'Go to <strong>notion.so/my-integrations</strong> → New integration → give it a name → Submit',
        'Copy the <strong>Internal Integration Secret</strong> (starts with <code class="bg-gray-100 px-1 rounded">ntn_</code> or <code class="bg-gray-100 px-1 rounded">secret_</code>)',
        'Open your Notion database → click <strong>⋯ → Connections → Add connection</strong> → pick your integration',
        'Copy the database URL. The <strong>Database ID</strong> is the 32-char segment before <code class="bg-gray-100 px-1 rounded">?v=</code>',
        'Paste both below and click <strong>Connect Notion</strong>',
      ]} />

      <div>
        <label className="block text-xs font-bold text-[#111] mb-2" style={SG}>Integration Token</label>
        <input
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="ntn_xxxxxxxxxxxxxxxxxxxx"
          className="input"
          type="password"
          autoComplete="off"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-[#111] mb-2" style={SG}>Database ID</label>
        <input
          value={databaseId}
          onChange={e => setDatabaseId(e.target.value)}
          placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          className="input"
        />
        <p className="text-[11px] text-gray-400 mt-1.5">
          notion.so/[workspace]/<strong>[database-id]</strong>?v=... — the 32-character part.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!token.trim() || !databaseId.trim() || saveMutation.isPending}
          className="btn btn-primary text-xs"
        >
          {saveMutation.isPending ? 'Connecting…' : 'Connect Notion'}
        </button>
        {integration && (
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="btn btn-danger text-xs"
          >
            {deleteMutation.isPending ? 'Removing…' : 'Remove'}
          </button>
        )}
      </div>
    </div>
  );
}
