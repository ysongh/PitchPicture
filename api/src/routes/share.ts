import { Router } from 'express';
import { supabase } from '../services/supabase.js';

const router = Router();

// GET /api/share/:token  → public, no auth
router.get('/:token', async (req, res) => {
  const { token } = req.params;
  const { data, error } = await supabase()
    .from('sessions')
    .select(
      'id, status, title, diagram_type, diagram_reasoning, mermaid_code, summary, key_concepts, created_at'
    )
    .eq('share_token', token)
    .single();
  if (error || !data) return res.status(404).json({ error: 'not found' });
  if (data.status !== 'ready') {
    return res.status(404).json({ error: 'not ready' });
  }
  res.json(data);
});

export default router;
