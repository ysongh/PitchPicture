import { Router } from 'express';
import multer from 'multer';
import { supabase, AUDIO_BUCKET } from '../services/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { processSession } from '../pipeline.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB cap, ~30 min @ 64kbps webm
});

const EXT_BY_MIME: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/flac': 'flac',
};

router.use(requireAuth);

// POST /api/sessions  → create a new session in 'uploading' state
router.post('/', async (req, res) => {
  const userId = req.user!.id;
  const { data, error } = await supabase()
    .from('sessions')
    .insert({ user_id: userId, status: 'uploading' })
    .select('id, status')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/sessions/:id/audio  → multipart upload, kick off pipeline
router.post('/:id/audio', upload.single('audio'), async (req, res) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'audio file required' });

  // Ownership check
  const { data: session, error: sErr } = await supabase()
    .from('sessions')
    .select('id, user_id, status')
    .eq('id', id)
    .single();
  if (sErr || !session) return res.status(404).json({ error: 'session not found' });
  if (session.user_id !== userId) return res.status(403).json({ error: 'forbidden' });

  const mime = file.mimetype || 'audio/webm';
  const ext = EXT_BY_MIME[mime] || 'webm';
  const path = `${userId}/${id}.${ext}`;

  const { error: upErr } = await supabase().storage
    .from(AUDIO_BUCKET)
    .upload(path, file.buffer, { contentType: mime, upsert: true });
  if (upErr) return res.status(500).json({ error: `upload failed: ${upErr.message}` });

  const { error: updErr } = await supabase()
    .from('sessions')
    .update({
      audio_path: path,
      status: 'transcribing',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (updErr) return res.status(500).json({ error: updErr.message });

  // Fire and forget — pipeline owns its own error handling
  processSession(id).catch((e) => console.error('[pipeline] unhandled', e));

  res.json({ id, status: 'transcribing' });
});

// POST /api/sessions/:id/retry  → re-run the pipeline against the existing audio
router.post('/:id/retry', async (req, res) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const { data: session, error: sErr } = await supabase()
    .from('sessions')
    .select('id, user_id, status, audio_path')
    .eq('id', id)
    .single();
  if (sErr || !session) return res.status(404).json({ error: 'session not found' });
  if (session.user_id !== userId) return res.status(403).json({ error: 'forbidden' });
  if (!session.audio_path) return res.status(400).json({ error: 'no audio to retry' });
  if (session.status !== 'failed') {
    return res.status(409).json({ error: `cannot retry from status: ${session.status}` });
  }

  const { error: updErr } = await supabase()
    .from('sessions')
    .update({
      status: 'transcribing',
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (updErr) return res.status(500).json({ error: updErr.message });

  processSession(id).catch((e) => console.error('[pipeline] unhandled', e));

  res.json({ id, status: 'transcribing' });
});

// GET /api/sessions/:id  → full session
router.get('/:id', async (req, res) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { data, error } = await supabase()
    .from('sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  if (error || !data) return res.status(404).json({ error: 'session not found' });
  res.json(data);
});

// GET /api/sessions  → list current user's sessions, newest first
router.get('/', async (req, res) => {
  const userId = req.user!.id;
  const { data, error } = await supabase()
    .from('sessions')
    .select('id, status, title, diagram_type, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/sessions/:id  → remove row + audio file
router.delete('/:id', async (req, res) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const { data: session, error: sErr } = await supabase()
    .from('sessions')
    .select('audio_path, user_id')
    .eq('id', id)
    .single();
  if (sErr || !session) return res.status(404).json({ error: 'session not found' });
  if (session.user_id !== userId) return res.status(403).json({ error: 'forbidden' });

  if (session.audio_path) {
    await supabase().storage.from(AUDIO_BUCKET).remove([session.audio_path as string]);
  }

  const { error: delErr } = await supabase()
    .from('sessions')
    .delete()
    .eq('id', id);
  if (delErr) return res.status(500).json({ error: delErr.message });

  res.json({ ok: true });
});

export default router;
