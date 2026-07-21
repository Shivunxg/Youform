import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import AppShell from '@/components/ui/AppShell';
export default function AnalyticsPage() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { data: formData } = useQuery({ queryKey: ['form', formId], queryFn: () => api.forms.get(formId) });
  const { data: analytics, isLoading } = useQuery({ queryKey: ['analytics', formId], queryFn: () => api.responses.analytics(formId) });
  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(`/forms/${formId}/responses`)} className="btn-ghost p-2"><ArrowLeft className="w-4 h-4" /></button>
          <h1 className="text-xl font-semibold">{formData?.form?.title ?? 'Analytics'}</h1>
        </div>
        {isLoading ? <p className="text-gray-400">Loading...</p> : analytics ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[['Views', analytics.views], ['Starts', analytics.starts], ['Completions', analytics.completions], ['Completion rate', `${analytics.completion_rate}%`]].map(([label, value]) => (
              <div key={label} className="card p-4"><p className="text-2xl font-bold text-gray-900">{value ?? 0}</p><p className="text-xs text-gray-500 mt-1">{label}</p></div>
            ))}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
