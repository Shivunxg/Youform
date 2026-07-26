/**
 * Parse a raw URL into a provider + embed-ready iframe src.
 * Returns { provider: 'youtube'|'loom'|'vimeo'|'pdf', src: string }
 * or      { provider: null, src: null } if the URL is not recognized.
 * Returns null when the input is empty.
 */
export function parseEmbed(raw) {
  if (!raw?.trim()) return null;
  const url = raw.trim();

  // YouTube — watch, short URL, embed, shorts
  let m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  if (m) return { provider: 'youtube', src: `https://www.youtube.com/embed/${m[1]}` };

  // Loom — share links (IDs are hex, 10+ chars)
  m = url.match(/loom\.com\/share\/([a-zA-Z0-9_-]{10,})/);
  if (m) {
    const id = m[1].split('?')[0]; // strip query params
    return { provider: 'loom', src: `https://www.loom.com/embed/${id}` };
  }

  // Vimeo — standard, channel, manage, player
  m = url.match(/vimeo\.com\/(?:video\/|channels\/[^/]+\/|manage\/videos\/)?(\d{5,})/);
  if (m) return { provider: 'vimeo', src: `https://player.vimeo.com/video/${m[1]}` };

  // PDF — URL ending in .pdf (optionally with query string)
  if (/\.pdf(\?[^#]*)?$/i.test(url)) {
    return {
      provider: 'pdf',
      src: `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(url)}`,
    };
  }

  return { provider: null, src: null };
}

export function isValidEmbed(raw) {
  const r = parseEmbed(raw);
  return !!r?.src;
}
