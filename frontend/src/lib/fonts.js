const SYSTEM_FONTS = new Set(['system-ui', 'sans-serif', 'serif', 'monospace', 'Georgia', 'Arial', 'Helvetica']);

export function loadGoogleFont(fontFamily) {
  if (!fontFamily) return;
  const name = fontFamily.split(',')[0].trim();
  if (SYSTEM_FONTS.has(name)) return;
  const id = `gfont-${name.replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}
