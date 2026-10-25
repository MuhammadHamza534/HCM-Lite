import { createHash, randomBytes } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import { AppError } from '../shared/errors.js';

export type DbClient = PrismaClient | Prisma.TransactionClient;

export function normalizedEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function publicUser(user: { id: string; email: string; role: string; mustChangePassword: boolean; employee?: { id: string } | null }) {
  return { id: user.id, email: user.email, role: user.role, mustChangePassword: user.mustChangePassword, employeeId: user.employee?.id ?? null };
}

export function tempPassword(): string {
  return `Hcm!${randomBytes(9).toString('base64url')}`;
}

export function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function asDate(value: string): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf())) throw new AppError(400, 'VALIDATION_ERROR', 'A valid ISO date is required.');
  return parsed;
}

export function localDate(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = (part: string) => parts.find((item) => item.type === part)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function localMinutes(now: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const value = (part: string) => Number(parts.find((item) => item.type === part)?.value ?? 0);
  return value('hour') * 60 + value('minute');
}

export function weekday(date: Date): number { return date.getUTCDay(); }

export function roundMoney(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }

export function annualTax(annualGross: number): number {
  if (annualGross <= 600000) return 0;
  if (annualGross <= 1200000) return (annualGross - 600000) * 0.05;
  if (annualGross <= 2400000) return 30000 + (annualGross - 1200000) * 0.15;
  if (annualGross <= 3600000) return 210000 + (annualGross - 2400000) * 0.25;
  return 510000 + (annualGross - 3600000) * 0.35;
}

export function payrollMath(input: { basic: number; totalWorkingDays: number; eligibleWorkingDays: number; absentDays: number; unpaidDays: number; halfDays: number }) {
  const hra = roundMoney(input.basic * 0.4);
  const medical = roundMoney(input.basic * 0.1);
  const gross = roundMoney(input.basic + hra + medical);
  const eligibleGross = input.totalWorkingDays ? roundMoney(gross * input.eligibleWorkingDays / input.totalWorkingDays) : 0;
  const deductionDays = input.absentDays + input.unpaidDays + (input.halfDays * 0.5);
  const absenceDeduction = input.totalWorkingDays ? roundMoney((gross / input.totalWorkingDays) * deductionDays) : 0;
  const beforeTax = Math.max(0, roundMoney(eligibleGross - absenceDeduction));
  const incomeTax = roundMoney(annualTax(gross * 12) / 12);
  const net = Math.max(0, roundMoney(beforeTax - incomeTax));
  return { hra, medical, gross, eligibleGross, deductionDays, absenceDeduction, incomeTax, net };
}

export async function currentSettings(db: DbClient, companyId: string) {
  const settings = await db.companySettingsVersion.findFirst({ where: { companyId }, orderBy: { effectiveFrom: 'desc' } });
  if (!settings) throw new AppError(409, 'SETTINGS_MISSING', 'Company settings are not available.');
  return settings;
}

export async function writeAudit(db: DbClient, input: { companyId: string; actorUserId?: string; action: string; entityType: string; entityId: string; before?: Prisma.InputJsonValue; after?: Prisma.InputJsonValue }) {
  await db.auditLog.create({ data: { companyId: input.companyId, actorUserId: input.actorUserId, action: input.action, entityType: input.entityType, entityId: input.entityId, beforeJson: input.before, afterJson: input.after } });
}

export function safeSnapshot(value: Record<string, unknown>): Prisma.InputJsonValue {
  const { password, passwordHash, token, ...safe } = value;
  void password; void passwordHash; void token;
  return safe as Prisma.InputJsonValue;
}

export function oneTimeCredentialFingerprint(password: string): string {
  return createHash('sha256').update(password).digest('hex').slice(0, 12);
}
