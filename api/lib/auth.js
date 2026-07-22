import { supabaseAdmin } from './supabase.js';

export async function requirePlatformAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing authorization header' });
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(header.slice(7));
  if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });
  const { data: profile } = await supabaseAdmin.from('profiles').select('is_platform_admin').eq('id', user.id).single();
  if (!profile?.is_platform_admin) return res.status(403).json({ error: 'Platform admin access required' });
  req.user = user;
  next();
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing authorization header' });
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(header.slice(7));
  if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });
  req.user = user; req.accessToken = header.slice(7); next();
}
export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  const { data: { user } } = await supabaseAdmin.auth.getUser(header.slice(7));
  if (user) { req.user = user; req.accessToken = header.slice(7); }
  next();
}
export async function requireWorkspaceMember(req, res, next) {
  const workspaceId = req.params.workspaceId ?? req.body.workspaceId;
  if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });
  const { data: member, error } = await supabaseAdmin.from('workspace_members').select('role, workspaces(*)').eq('workspace_id', workspaceId).eq('user_id', req.user.id).single();
  if (error || !member) return res.status(403).json({ error: 'Not a member of this workspace' });
  req.workspaceMember = member; req.workspace = member.workspaces; next();
}
export function requireEditor(req, res, next) {
  if (!['owner','admin','editor'].includes(req.workspaceMember.role)) return res.status(403).json({ error: 'Editor access required' });
  next();
}
export function requireAdmin(req, res, next) {
  if (!['owner','admin'].includes(req.workspaceMember.role)) return res.status(403).json({ error: 'Admin access required' });
  next();
}
