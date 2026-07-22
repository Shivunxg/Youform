import { supabase } from './supabase';

const BASE = '/api';

async function getHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  return headers;
}

async function request(method, path, body) {
  const headers = await getHeaders();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

const get  = (path)        => request('GET', path);
const post = (path, body)  => request('POST', path, body);
const put  = (path, body)  => request('PUT', path, body);
const patch = (path, body) => request('PATCH', path, body);
const del  = (path)        => request('DELETE', path);

// ── Workspaces ──────────────────────────────────────────────
export const api = {
  workspaces: {
    list: ()               => get('/workspaces'),
    get: (id)              => get(`/workspaces/${id}`),
    create: (body)         => post('/workspaces', body),
    update: (id, body)     => patch(`/workspaces/${id}`, body),
    usage: (id)            => get(`/workspaces/${id}/usage`),
    activity: (id, params = {}) => {
      const q = new URLSearchParams(params).toString();
      return get(`/workspaces/${id}/activity${q ? `?${q}` : ''}`);
    },
    members: (id)          => get(`/workspaces/${id}/members`),
    invite: (id, body)     => post(`/workspaces/${id}/invites`, body),
    removeMember: (id, uid) => del(`/workspaces/${id}/members/${uid}`),
    updateMember: (id, uid, body) => patch(`/workspaces/${id}/members/${uid}`, body),
    acceptInvite: (token)  => post(`/workspaces/accept-invite/${token}`),
  },

  // ── Forms ──────────────────────────────────────────────────
  forms: {
    list: (wsId, params = {}) => {
      const q = new URLSearchParams(params).toString();
      return get(`/workspaces/${wsId}/forms${q ? `?${q}` : ''}`);
    },
    get: (id)              => get(`/forms/${id}`),
    create: (wsId, body)   => post(`/workspaces/${wsId}/forms`, body),
    update: (id, body)     => patch(`/forms/${id}`, body),
    delete: (id)           => del(`/forms/${id}`),
    duplicate: (id)        => post(`/forms/${id}/duplicate`),
    setPassword: (id, password) => post(`/forms/${id}/password`, { password }),
    removePassword: (id)   => del(`/forms/${id}/password`),
    saveQuestions: (id, questions) => put(`/forms/${id}/questions`, { questions }),
    addQuestion: (id, body) => post(`/forms/${id}/questions`, body),
    updateQuestion: (fid, qid, body) => patch(`/forms/${fid}/questions/${qid}`, body),
    deleteQuestion: (fid, qid) => del(`/forms/${fid}/questions/${qid}`),
  },

  // ── Responses ──────────────────────────────────────────────
  responses: {
    list: (fid, params = {}) => {
      const q = new URLSearchParams(params).toString();
      return get(`/forms/${fid}/responses${q ? `?${q}` : ''}`);
    },
    get: (fid, rid)        => get(`/forms/${fid}/responses/${rid}`),
    delete: (fid, rid)     => del(`/forms/${fid}/responses/${rid}`),
    analytics: (fid)       => get(`/forms/${fid}/analytics`),
    exportCsv: (fid)       => `${BASE}/forms/${fid}/responses/export/csv`,
  },

  // ── Public (no auth) ───────────────────────────────────────
  public: {
    getForm: (slug)        => get(`/public/forms/${slug}`),
    startForm: (fid)       => post(`/public/forms/${fid}/start`),
    submit: (fid, body)    => post(`/public/forms/${fid}/responses`, body),
    partial: (fid, body)   => post(`/public/forms/${fid}/responses/partial`, body),
    verifyPassword: (slug, password) => post(`/public/forms/${slug}/verify-password`, { password }),
    uploadFile: async (formId, file) => {
      const headers = await getHeaders();
      delete headers['Content-Type']; // let browser set multipart boundary
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${BASE}/public/forms/${formId}/upload`, { method: 'POST', headers, body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      return data;
    },
  },

  // ── Templates ──────────────────────────────────────────────
  templates: {
    list: (params = {})    => {
      const q = new URLSearchParams(params).toString();
      return get(`/templates${q ? `?${q}` : ''}`);
    },
    get: (id)              => get(`/templates/${id}`),
  },

  // ── Integrations ───────────────────────────────────────────
  integrations: {
    list: (fid)            => get(`/forms/${fid}/integrations`),
    create: (fid, body)    => post(`/forms/${fid}/integrations`, body),
    update: (fid, iid, body) => patch(`/forms/${fid}/integrations/${iid}`, body),
    delete: (fid, iid)     => del(`/forms/${fid}/integrations/${iid}`),
    test: (fid, iid)       => post(`/forms/${fid}/integrations/${iid}/test`),
    getNotifications: (fid) => get(`/forms/${fid}/notifications`),
    saveNotifications: (fid, body) => put(`/forms/${fid}/notifications`, body),
    googleOAuthStart: (formId, integrationId) =>
      post('/oauth/google/start', { formId, integrationId: integrationId || null }),
    googleSheets: {
      listSheets:  (fid)       => get(`/forms/${fid}/integrations/google-sheets/sheets`),
      createSheet: (fid, body) => post(`/forms/${fid}/integrations/google-sheets/create-sheet`, body),
    },
  },

  // ── Typeform import ────────────────────────────────────────
  typeform: {
    import: (body) => post('/typeform/import', body),
  },

  // ── Google Forms import ────────────────────────────────────
  googleForms: {
    import: (body) => post('/google-forms/import', body),
  },

  // ── AI form generation ─────────────────────────────────────
  ai: {
    generateForm: (body) => post('/ai/generate-form', body),
  },

  // ── Billing ────────────────────────────────────────────────
  billing: {
    get: (wsId)            => get(`/billing/${wsId}`),
    checkout: (wsId, body) => post(`/billing/${wsId}/checkout`, body),
    portal: (wsId)         => post(`/billing/${wsId}/portal`),
  },

  // ── Platform admin ─────────────────────────────────────────
  admin: {
    stats: () => get('/admin/stats'),
    users: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return get(`/admin/users${q ? `?${q}` : ''}`);
    },
    toggleAdmin: (userId, is_platform_admin) =>
      patch(`/admin/users/${userId}/admin`, { is_platform_admin }),
    workspaces: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return get(`/admin/workspaces${q ? `?${q}` : ''}`);
    },
    workspace: (id) => get(`/admin/workspaces/${id}`),
    overridePlan: (id, plan) => patch(`/admin/workspaces/${id}/plan`, { plan }),
  },
};
