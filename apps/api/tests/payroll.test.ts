import { describe, expect, it } from 'vitest';
import { annualTax, payrollMath } from '../src/modules/core.js';

describe('payroll calculation rules', () => {
  it('derives the mandated 40% HRA, 10% medical, and 1.5x gross', () => {
    const result = payrollMath({ basic: 50000, totalWorkingDays: 22, eligibleWorkingDays: 22, absentDays: 0, unpaidDays: 0, halfDays: 0 });
    expect(result).toMatchObject({ hra: 20000, medical: 5000, gross: 75000 });
  });

  it('uses the illustrative marginal annual tax boundaries', () => {
    expect(annualTax(600000)).toBe(0);
    expect(annualTax(1200000)).toBe(30000);
    expect(annualTax(2400000)).toBe(210000);
    expect(annualTax(3600000)).toBe(510000);
  });

  it('deducts full absence/unpaid days and half a half-day without negative net pay', () => {
    const result = payrollMath({ basic: 50000, totalWorkingDays: 20, eligibleWorkingDays: 20, absentDays: 1, unpaidDays: 1, halfDays: 1 });
    expect(result.deductionDays).toBe(2.5);
    expect(result.absenceDeduction).toBe(9375);
    expect(result.net).toBeGreaterThanOrEqual(0);
  });
});
