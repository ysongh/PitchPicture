import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabase.js';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.header('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  const { data, error } = await supabase().auth.getUser(match[1]);
  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  req.user = { id: data.user.id };
  next();
}
