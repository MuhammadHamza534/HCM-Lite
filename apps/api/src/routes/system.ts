import type { Request, Response } from 'express';
import type { DatabaseHealth } from '../db.js';

export function healthHandler(_request: Request, response: Response): void {
  response.status(200).json({ data: { status: 'ok', service: 'hcm-lite-api' } });
}

export function createReadinessHandler(database: DatabaseHealth) {
  return async (_request: Request, response: Response): Promise<void> => {
    try {
      await database.checkConnection();
      response.status(200).json({ data: { status: 'ready', database: 'available' } });
    } catch {
      response.status(503).json({
        error: { code: 'DATABASE_UNAVAILABLE', message: 'Database is not available.', details: [] }
      });
    }
  };
}
