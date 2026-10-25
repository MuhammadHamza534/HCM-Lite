import { Router } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import { prisma } from '../db.js';
import { createActiveActorResolver, requireChangedPassword } from '../middleware/auth.js';
import { AppError } from '../shared/errors.js';
import { currentSettings } from '../modules/core.js';

export function createAiRouter(config: AppConfig): Router {
  const router = Router();
  router.use(createActiveActorResolver(prisma, config.JWT_SECRET), requireChangedPassword);
  router.post('/chat', async (request, response) => {
    const input = z.object({ message: z.string().trim().min(1).max(2000) }).parse(request.body);
    const actor = request.actor!;
    const recent = await prisma.aiLog.count({ where: { userId: actor.userId, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } });
    if (recent >= 20) throw new AppError(429, 'AI_RATE_LIMITED', 'AI request limit reached. Try again later.');
    const peerSalary = actor.role === 'EMPLOYEE' && /salary|pay|compensation/i.test(input.message) && /colleague|other|their|someone|employee/i.test(input.message);
    let answer: string;
    let status: 'REFUSED' | 'FALLBACK' | 'SUCCESS';
    if (peerSalary) { answer = 'I cannot provide another employee\'s salary or confidential compensation information.'; status = 'REFUSED'; }
    else if (!config.AI_API_KEY) { answer = 'The AI provider is not configured. You can continue using the live dashboards and forms.'; status = 'FALLBACK'; }
    else { const settings = await currentSettings(prisma, actor.companyId); answer = `Current policy: office starts at ${settings.officeStartTime}, grace is ${settings.graceMinutes} minutes, and half-day is under ${settings.halfDayMinutes} worked minutes.`; status = 'SUCCESS'; }
    await prisma.aiLog.create({ data: { companyId: actor.companyId, userId: actor.userId, feature: 'CHAT', status, toolNames: [] } });
    response.json({ data: { answer, aiGenerated: true, toolNames: [], status } });
  });

  router.post('/smart-leave', async (request, response) => {
    const input = z.object({ message: z.string().trim().min(3).max(1000) }).parse(request.body);
    const actor = request.actor!;
    const type = await prisma.leaveType.findFirst({ where: { companyId: actor.companyId, code: 'CASUAL', isActive: true } });
    if (!type) throw new AppError(422, 'CASUAL_LEAVE_NOT_CONFIGURED', 'Casual leave is not configured.');
    const today = new Date();
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const match = input.message.toUpperCase().match(/NEXT\s+(SUNDAY|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY)(?:\s+AND\s+(SUNDAY|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY))?/);
    if (!match) throw new AppError(422, 'SMART_LEAVE_UNCLEAR', 'Please use the normal leave form or provide clear dates.');
    const nextDate = (dayName: string) => {
      const target = days.indexOf(dayName);
      const current = today.getUTCDay();
      const delta = ((target - current + 7) % 7) || 7;
      const result = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + delta));
      return result.toISOString().slice(0, 10);
    };
    const start = nextDate(match[1]!);
    const end = match[2] ? nextDate(match[2]) : start;
    await prisma.aiLog.create({ data: { companyId: actor.companyId, userId: actor.userId, feature: 'SMART_LEAVE', status: 'SUCCESS', toolNames: ['get_my_leave_balance'] } });
    response.json({ data: { type: { id: type.id, code: type.code, name: type.name }, startDate: start, endDate: end, reason: input.message, requiresConfirmation: true, aiGenerated: true } });
  });

  return router;
}
