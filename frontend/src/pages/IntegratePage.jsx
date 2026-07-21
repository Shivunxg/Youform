import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import FormHeader from '@/components/builder/FormHeader';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const INTEGRATIONS = [
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    description: 'Send every new response to a Google Sheet row automatically.',
    icon: '📊',
    color: '#34A853',
    category: 'Spreadsheets',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get a Slack notification in a channel of your choice when someone submits.',
    icon: '💬',
    color: '#4A154B',
    category: 'Notifications',
  },
  {
    id: 'webhook',
    name: 'Webhook',
    description: 'POST response data to any URL. Connect any app or custom backend.',
    icon: '⚡',
    color: '#374151',
    category: 'Developer',
  },
  {
    id: 'email',
    name: 'Email notification',
    description: 'Receive an email with response data whenever someone submits.',
    icon: '✉️',
    color: '#EA4335',
    category: 'Notifications',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect to 5,000+ apps through Zapier automations.',
    icon: '⚙️',
    color: '#FF4A00',
    category: 'Automation',
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Push form responses directly into a Notion database.',
    icon: '📝',
    color: '#000000',
    category: 'Productivity',
  },
];

export default function IntegratePage() {
  const { formId } = useParams();

  const { data } = useQuery({
    queryKey: ['form-meta', formId],
    queryFn: () => api.forms.get(formId),
    staleTime: 60_000,
  });

  const form = data?.form;

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <FormHeader staticTitle={form?.title} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-xl font-bold text-gray-900">Integrations</h1>
            <p className="text-sm text-gray-500 mt-1">
              Connect your form to the tools your team already uses.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {INTEGRATIONS.map(integration => (
              <IntegrationCard key={integration.id} integration={integration} formId={formId} />
            ))}
          </div>

          <div className="mt-8 p-5 bg-white rounded-xl border border-gray-200 text-center">
            <p className="text-sm font-semibold text-gray-700 mb-1">Need a custom integration?</p>
            <p className="text-xs text-gray-500 mb-3">
              Use the Webhook integration to connect to any system, or reach out for enterprise support.
            </p>
            <button
              onClick={() => toast('Use the Webhook integration to connect any system ⚡')}
              className="btn-secondary text-xs px-4 py-2"
            >
              Set up a Webhook
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({ integration, formId }) {
  const handleConnect = () => {
    toast(`${integration.name} integration coming soon!`, { icon: integration.icon });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex gap-4 hover:shadow-sm transition-shadow">
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
        style={{ background: `${integration.color}15` }}
      >
        {integration.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-semibold text-gray-900">{integration.name}</h3>
          <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0', 'bg-gray-100 text-gray-500')}>
            {integration.category}
          </span>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed mb-3">{integration.description}</p>
        <button
          onClick={handleConnect}
          className="btn-secondary text-xs px-3 py-1.5 h-auto"
        >
          Connect →
        </button>
      </div>
    </div>
  );
}
