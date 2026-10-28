import { parseEmbed } from '@/lib/embed';

/**
 * Renders a YouTube / Loom / Vimeo iframe or a PDF viewer for a given URL.
 * Returns null when url is empty; shows an inline error for unsupported links.
 *
 * @param {string}  url           - raw user-supplied URL
 * @param {boolean} [interactive] - true in live form / preview; false in canvas (pointer-events disabled)
 * @param {string}  [className]   - extra wrapper classes
 */
export default function EmbedBlock({ url, interactive = true, className = '' }) {
  if (!url?.trim()) return null;

  const result = parseEmbed(url);

  if (!result?.src) {
    return (
      <div className={`rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 ${className}`}>
        <p className="text-xs font-medium text-amber-700">
          Link not supported — try a YouTube, Loom, Vimeo, or PDF link.
        </p>
      </div>
    );
  }

  const isVideo = result.provider !== 'pdf';

  return (
    <div
      className={`rounded-xl overflow-hidden border border-black/10 w-full ${className}`}
      style={{ aspectRatio: isVideo ? '16/9' : '3/4', pointerEvents: interactive ? 'auto' : 'none' }}
    >
      <iframe
        src={result.src}
        title={result.provider}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        frameBorder="0"
        loading="lazy"
      />
    </div>
  );
}
