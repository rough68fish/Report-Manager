import OktaJwtVerifier from '@okta/jwt-verifier';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: { sub: string; email?: string; [key: string]: unknown };
    }
  }
}

const verifier = new OktaJwtVerifier({
  issuer: process.env.OKTA_ISSUER!,
});

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header required' });
    return;
  }
  try {
    const jwt = await verifier.verifyAccessToken(
      authHeader.slice(7),
      process.env.OKTA_AUDIENCE || 'api://default',
    );
    req.user = jwt.claims as Request['user'];
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
