import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Link, Code, QrCode, ExternalLink, Copy, Check } from 'lucide-react';
import { api } from '@/lib/api';
import FormHeader from '@/components/builder/FormHeader';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

export default function SharePage() {
  const { formId } = useParams();
  const [copied, setCopied] = useState(null);
  const [embedStyle, setEmbedStyle] = useState('iframe');

  const { data } = useQuery({
    queryKey: ['form-meta', formId],
    queryFn: () => api.forms.get(formId),
    staleTime: 60_000,
  });

  const form = data?.form;
  const slug = form?.slug ?? formId;
  const publicUrl = `${window.location.origin}/f/${slug}`;

  const handleCopy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast.success('Copied!');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Could not copy');
    }
  };

  const iframeCode = `<iframe
  src="${publicUrl}"
  width="100%"
  height="600"
  frameborder="0"
  allow="clipboard-write"
  style="border: none; border-radius: 12px;"
></iframe>`;

  const popupCode = `<!-- Add this button where you want the form to open -->
<button onclick="document.getElementById('ff-popup').style.display='flex'" style="padding:10px 20px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer;">
  Open form
</button>

<!-- Popup overlay -->
<div id="ff-popup" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;align-items:center;justify-content:center;" onclick="if(event.target===this)this.style.display='none'">
  <div style="background:#fff;border-radius:16px;width:min(90vw,540px);height:80vh;overflow:hidden;position:relative;">
    <iframe src="${publicUrl}" style="width:100%;height:100%;border:none;" allow="clipboard-write"></iframe>
  </div>
</div>`;

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <FormHeader staticTitle={form?.title} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-xl font-bold text-gray-900">Share</h1>
            <p className="text-sm text-gray-500 mt-1">
              Share your form via link, embed it on a website, or generate a QR code.
            </p>
          </div>

          {form?.status !== 'published' && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <span className="text-amber-500 text-lg shrink-0">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">This form is not published yet</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Go to the <strong>Build</strong> tab and click <strong>Publish</strong> to make it live.
                </p>
              </div>
            </div>
          )}

          {/* Share link */}
          <Section icon={<Link className="w-4 h-4" />} title="Share link">
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-mono truncate">
                {publicUrl}
              </div>
              <button
                onClick={() => handleCopy(publicUrl, 'link')}
                className={clsx('btn-secondary px-3 py-2 shrink-0 gap-1.5', copied === 'link' && 'text-green-600 border-green-300 bg-green-50')}
              >
                {copied === 'link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied === 'link' ? 'Copied!' : 'Copy'}
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary px-3 py-2 shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </Section>

          {/* Embed */}
          <Section icon={<Code className="w-4 h-4" />} title="Embed on website">
            {/* Style tabs */}
            <div className="flex gap-1 mb-3">
              {[
                { id: 'iframe', label: 'Inline / iFrame' },
                { id: 'popup', label: 'Popup' },
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setEmbedStyle(s.id)}
                  className={clsx(
                    'px-3 py-1 text-xs font-semibold rounded-md transition-all',
                    embedStyle === s.id ? 'bg-brand-500 text-white' : 'text-gray-500 hover:bg-gray-100'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 text-xs rounded-xl p-4 overflow-x-auto leading-relaxed font-mono">
                {embedStyle === 'iframe' ? iframeCode : popupCode}
              </pre>
              <button
                onClick={() => handleCopy(embedStyle === 'iframe' ? iframeCode : popupCode, 'embed')}
                className={clsx(
                  'absolute top-3 right-3 px-2.5 py-1 text-xs font-medium rounded-lg transition-all',
                  copied === 'embed'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                )}
              >
                {copied === 'embed' ? '✓ Copied' : 'Copy code'}
              </button>
            </div>
          </Section>

          {/* QR Code */}
          <Section icon={<QrCode className="w-4 h-4" />} title="QR Code">
            <div className="flex items-center gap-6">
              <div className="w-28 h-28 bg-white border-2 border-gray-200 rounded-xl flex items-center justify-center shrink-0">
                <div className="text-center">
                  <span className="text-3xl">🔲</span>
                  <p className="text-[9px] text-gray-400 mt-1">QR Code</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-700 mb-2">
                  Print or display this QR code so respondents can scan it with their phone.
                </p>
                <button
                  onClick={() => toast('QR code download coming soon!', { icon: '🔲' })}
                  className="btn-secondary text-xs px-3 py-1.5 h-auto"
                >
                  Download QR Code
                </button>
              </div>
            </div>
          </Section>

          {/* Social share */}
          <Section title="Share on social">
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'Twitter / X', emoji: '𝕏', color: '#000000' },
                { label: 'LinkedIn', emoji: 'in', color: '#0A66C2' },
                { label: 'WhatsApp', emoji: '💬', color: '#25D366' },
                { label: 'Facebook', emoji: 'f', color: '#1877F2' },
              ].map(s => (
                <button
                  key={s.label}
                  onClick={() => {
                    const text = encodeURIComponent(`Check out this form: ${publicUrl}`);
                    toast(`Opening ${s.label}…`);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:shadow-sm text-xs font-medium text-gray-700 transition-all"
                >
                  <span className="font-bold" style={{ color: s.color }}>{s.emoji}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        {icon && <span className="text-gray-500">{icon}</span>}
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}
