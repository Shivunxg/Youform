export function isPrivateUrl(urlStr) {
  try {
    const { hostname, protocol } = new URL(urlStr);
    if (!['http:', 'https:'].includes(protocol)) return true;
    const lower = hostname.toLowerCase();
    if (['localhost', '0.0.0.0', '::1', '[::]'].includes(lower)) return true;
    const parts = lower.split('.').map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n))) {
      if (parts[0] === 127) return true;
      if (parts[0] === 10)  return true;
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
      if (parts[0] === 192 && parts[1] === 168) return true;
      if (parts[0] === 169 && parts[1] === 254) return true;
      if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
    }
    return false;
  } catch { return true; }
}
