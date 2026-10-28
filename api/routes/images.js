import { Router } from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../lib/auth.js';
import { hasFeature } from '../lib/plans.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
]);
const IMAGE_MIME_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };

const UNSPLASH_API = 'https://api.unsplash.com';
const UTM = 'utm_source=youform&utm_medium=referral';

const CURATED_QUERIES = {
  people:    'professional team business people',
  workspace: 'office desk workspace minimal',
  lifestyle: 'lifestyle calm minimal serene',
  product:   'product photography flat lay',
};

async function fetchUnsplash(path) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) throw new Error('UNSPLASH_ACCESS_KEY not configured');
  const res = await fetch(`${UNSPLASH_API}${path}`, {
    headers: { Authorization: `Client-ID ${key}` },
  });
  if (!res.ok) throw new Error(`Unsplash API error: ${res.status}`);
  return res.json();
}

function formatPhoto(photo) {
  return {
    id: photo.id,
    url: photo.urls.regular,
    thumb: photo.urls.small,
    alt: photo.alt_description ?? photo.description ?? '',
    photographer: photo.user.name,
    photographerUrl: `${photo.user.links.html}?${UTM}`,
    unsplashUrl: `https://unsplash.com/photos/${photo.id}?${UTM}`,
  };
}

async function getWorkspacePlan(userId, workspaceId) {
  const { data } = await supabaseAdmin
    .from('workspace_members')
    .select('workspaces(plan)')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();
  return data?.workspaces?.plan ?? 'free';
}

// GET /api/images/unsplash/curated?category=people — free for all authenticated users
router.get('/images/unsplash/curated', requireAuth, async (req, res, next) => {
  try {
    const category = req.query.category || 'people';
    const query = CURATED_QUERIES[category] ?? CURATED_QUERIES.people;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const data = await fetchUnsplash(
      `/search/photos?query=${encodeURIComponent(query)}&per_page=12&page=${page}&orientation=landscape`
    );
    res.json({ photos: data.results.map(formatPhoto), total: data.total, totalPages: data.total_pages });
  } catch (err) { next(err); }
});

// GET /api/images/unsplash/search?q=...&workspaceId=... — Pro+ only
router.get('/images/unsplash/search', requireAuth, async (req, res, next) => {
  try {
    const { q, workspaceId } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    if (!q?.trim()) return res.json({ photos: [], total: 0, totalPages: 0 });
    if (workspaceId) {
      const plan = await getWorkspacePlan(req.user.id, workspaceId);
      if (!hasFeature(plan, 'integrations')) {
        return res.status(403).json({ error: 'pro_required', message: 'Unsplash search requires Pro or higher.' });
      }
    }
    const data = await fetchUnsplash(
      `/search/photos?query=${encodeURIComponent(q)}&per_page=12&page=${page}&orientation=landscape`
    );
    res.json({ photos: data.results.map(formatPhoto), total: data.total, totalPages: data.total_pages });
  } catch (err) { next(err); }
});

// POST /api/images/upload — Pro+ only, multipart/form-data
router.post('/images/upload', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    const { workspaceId } = req.body;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });
    const plan = await getWorkspacePlan(req.user.id, workspaceId);
    if (!hasFeature(plan, 'integrations')) {
      return res.status(403).json({ error: 'pro_required', message: 'Image uploads require Pro or higher.' });
    }
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    if (!ALLOWED_IMAGE_TYPES.has(req.file.mimetype)) return res.status(415).json({ error: `File type "${req.file.mimetype}" is not allowed` });
    const ext = IMAGE_MIME_EXT[req.file.mimetype] ?? 'jpg';
    const path = `design-images/${workspaceId}/${nanoid()}.${ext}`;
    const { data, error } = await supabaseAdmin.storage
      .from('form-uploads')
      .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (error) throw error;
    const { data: { publicUrl } } = supabaseAdmin.storage.from('form-uploads').getPublicUrl(data.path);
    res.json({ url: publicUrl });
  } catch (err) { next(err); }
});

export default router;
