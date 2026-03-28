import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { QueryFailedError } from 'typeorm';

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation error', details: err.flatten() });
    return;
  }

  if (err instanceof QueryFailedError) {
    // Unique constraint violations (ORA-00001 / PG unique_violation)
    const message = (err as { message?: string }).message ?? '';
    if (message.includes('ORA-00001') || message.includes('unique_violation')) {
      res.status(409).json({ error: 'A record with that value already exists' });
      return;
    }
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database error' });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
};
