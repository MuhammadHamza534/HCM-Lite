import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { PrismaClient } from '@prisma/client';
import { AppError } from '../shared/errors.js';

export const roles = ['ADMIN', 'HR', 'EMPLOYEE'] as const;
export type Role = (typeof roles)[number];
export interface ActorContext {
  userId: string;
  companyId: string;
  role: Role;
  employeeId?: string;
  mustChangePassword?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      actor?: ActorContext;
    }
  }
}

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (roles as readonly string[]).includes(value);
}

export function createJwtVerifier(jwtSecret?: string) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!jwtSecret) return next(new AppError(503, 'AUTH_NOT_CONFIGURED', 'Authentication is not configured.'));
    const token = request.header('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.'));
    try {
      const decoded = jwt.verify(token, jwtSecret);
      if (
        typeof decoded !== 'object' ||
        !decoded ||
        typeof decoded.sub !== 'string' ||
        typeof decoded.companyId !== 'string' ||
        !isRole(decoded.role)
      ) {
        throw new Error('Invalid claims');
      }
      request.actor = {
        userId: decoded.sub,
        companyId: decoded.companyId,
        role: decoded.role,
        ...(typeof decoded.employeeId === 'string' ? { employeeId: decoded.employeeId } : {})
      };
      next();
    } catch {
      next(new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.'));
    }
  };
}

export function createActiveActorResolver(database: PrismaClient, jwtSecret?: string) {
  const verify = createJwtVerifier(jwtSecret);
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    verify(request, response, async (error?: unknown) => {
      if (error) return next(error);
      if (!request.actor) return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.'));
      try {
        const user = await database.user.findUnique({ where: { id: request.actor.userId }, include: { employee: { select: { id: true } } } });
        if (!user || !user.isActive || user.companyId !== request.actor.companyId || user.role !== request.actor.role) {
          return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.'));
        }
        request.actor = { userId: user.id, companyId: user.companyId, role: user.role, employeeId: user.employee?.id, mustChangePassword: user.mustChangePassword };
        return next();
      } catch (resolverError) { return next(resolverError); }
    });
  };
}

export function requireChangedPassword(request: Request, _response: Response, next: NextFunction): void {
  if (request.actor?.mustChangePassword) return next(new AppError(403, 'PASSWORD_CHANGE_REQUIRED', 'Change the temporary password before using this feature.'));
  next();
}

export function requireRoles(...allowed: Role[]) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.actor || !allowed.includes(request.actor.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
    }
    next();
  };
}

export function requireEmployeeOwnership(targetEmployeeId: string, actor: ActorContext): void {
  if (actor.role === 'EMPLOYEE' && actor.employeeId !== targetEmployeeId) {
    throw new AppError(404, 'NOT_FOUND', 'Resource not found.');
  }
}
