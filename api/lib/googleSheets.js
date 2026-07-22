import crypto from 'crypto';

const TOKEN_URL   = 'https://oauth2.googleapis.com/token';
const SHEETS_API  = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API   = 'https://www.googleapis.com/drive/v3/files';

// ── OAuth state helpers (stateless HMAC-signed) ──────────────────
function getOAuthSecret() {
  const secret = process.env.OAUTH_STATE_SECRET;
  if (!secret) throw new Error('OAUTH_STATE_SECRET env var is required — set it in your Vercel environment variables');
  return secret;
}

export function createOAuthState(payload) {
  const secret = getOAuthSecret();
  const data = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString('base64url');
  const sig  = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyOAuthState(state) {
  try {
    const secret = getOAuthSecret();
    const [data, sig] = (state || '').split('.');
    if (!data || !sig) return null;
    const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    if (expected !== sig) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (Date.now() - payload.iat > 600_000) return null; // 10-min TTL
    return payload;
  } catch { return null; }
}

// ── OAuth URLs ────────────────────────────────────────────────────
export function getGoogleAuthUrl(state) {
  const redirectUri = `${process.env.APP_URL}/api/oauth/google/callback`;
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
    access_type:   'offline',
    prompt:        'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// ── Token exchange ────────────────────────────────────────────────
export async function exchangeCode(code) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri:  `${process.env.APP_URL}/api/oauth/google/callback`,
      grant_type:    'authorization_code',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Token exchange failed');
  return data;
}

export async function refreshToken(refreshTokenStr) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshTokenStr,
      grant_type:    'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Token refresh failed');
  return data;
}

// Returns { accessToken, updatedConfig } — updatedConfig is non-null if token was refreshed
export async function getValidToken(config) {
  const expiryMs = config.token_expiry ? new Date(config.token_expiry).getTime() : 0;
  if (Date.now() < expiryMs - 60_000) {
    return { accessToken: config.access_token, updatedConfig: null };
  }
  const data = await refreshToken(config.refresh_token);
  const updatedConfig = {
    ...config,
    access_token: data.access_token,
    token_expiry: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
  return { accessToken: data.access_token, updatedConfig };
}

// ── Sheets API helpers ────────────────────────────────────────────
export async function listUserSheets(accessToken) {
  const params = new URLSearchParams({
    q:        "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
    fields:   'files(id,name)',
    pageSize: '50',
    orderBy:  'modifiedTime desc',
  });
  const res = await fetch(`${DRIVE_API}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Failed to list sheets');
  return data.files ?? [];
}

export async function getSpreadsheetMeta(accessToken, spreadsheetId) {
  const res = await fetch(`${SHEETS_API}/${spreadsheetId}?fields=properties.title,sheets.properties`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Failed to get spreadsheet');
  return data;
}

export async function createSpreadsheet(accessToken, title) {
  const res = await fetch(SHEETS_API, {
    method:  'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ properties: { title } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Failed to create spreadsheet');
  return data; // { spreadsheetId, properties.title, sheets[0].properties.title }
}

// Write header row if A1 is empty
export async function ensureHeaders(accessToken, spreadsheetId, sheetName, headers) {
  const range = `'${sheetName}'!A1:ZZ1`;
  const res = await fetch(`${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (data.values && data.values.length > 0) return; // headers already there

  await fetch(`${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
    method:  'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ values: [headers] }),
  });
}

export async function appendRow(accessToken, spreadsheetId, sheetName, values) {
  const range = `'${sheetName}'!A1`;
  const res = await fetch(
    `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ values: [values] }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Failed to append row');
  return data;
}
