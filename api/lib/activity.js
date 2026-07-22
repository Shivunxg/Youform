import { logger } from './logger.js';

export async function logActivity(supabase, { workspace_id, user_id, action, description, resource_type, resource_id, metadata } = {}) {
  try {
    await supabase.from('workspace_activity').insert({
      workspace_id,
      user_id: user_id ?? null,
      action,
      description,
      resource_type: resource_type ?? null,
      resource_id: resource_id ?? null,
      metadata: metadata ?? {},
    });
  } catch (err) {
    logger.warn('Activity log failed (non-critical)', { action, workspace_id, err: err.message });
  }
}
