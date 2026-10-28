import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { createError } from '../lib/errorHandler.js';
const router = Router();
router.get('/', async (req, res, next) => {
  try {
    const { category, featured } = req.query;
    let q = supabaseAdmin.from('templates').select('id, title, description, category, thumbnail_url, is_featured, use_count').order('use_count', { ascending: false });
    if (category) q = q.eq('category', category);
    if (featured === 'true') q = q.eq('is_featured', true);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ templates: data });
  } catch (err) { next(err); }
});
router.get('/:templateId', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('templates').select('*').eq('id', req.params.templateId).single();
    if (error || !data) throw createError(404, 'Template not found');
    res.json({ template: data });
  } catch (err) { next(err); }
});
export default router;
