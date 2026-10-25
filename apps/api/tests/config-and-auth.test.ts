import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/env.js';
import { requireEmployeeOwnership, type ActorContext } from '../src/middleware/auth.js';

describe('foundation configuration and permission helpers', () => {
  it('rejects non-PostgreSQL database URLs', () => {
    expect(() => loadConfig({ CORS_ORIGIN: 'http://localhost:5173', DATABASE_URL: 'mysql://localhost/hcm' })).toThrow();
  });

  it('allows employee access to only their linked employee identity', () => {
    const actor: ActorContext = { userId: 'user-1', companyId: 'company-1', role: 'EMPLOYEE', employeeId: 'employee-1' };
    expect(() => requireEmployeeOwnership('employee-1', actor)).not.toThrow();
    expect(() => requireEmployeeOwnership('employee-2', actor)).toThrow();
  });
});
