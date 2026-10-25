import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger.js';

export class AppError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: Array<{ field?: string; reason: string }> = []
  ) {
    super(message);
  }
}

export function notFoundHandler(_request: Request, response: Response): void {
  response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found.', details: [] } });
}

export function errorHandler(
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction
): void {
  void _next;
  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: error.issues.map((issue) => ({ field: issue.path.join('.'), reason: issue.message }))
      },
      meta: { requestId: request.requestId }
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details },
      meta: { requestId: request.requestId }
    });
    return;
  }

  logger.error({ requestId: request.requestId, err: error }, 'Unhandled request error');
  response.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.', details: [] },
    meta: { requestId: request.requestId }
  });
}
