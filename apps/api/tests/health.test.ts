import { describe, expect, it } from 'vitest';
import type { DatabaseHealth } from '../src/db.js';
import { createReadinessHandler, healthHandler } from '../src/routes/system.js';

function responseRecorder() {
  let statusCode = 0;
  let body: unknown;
  const response = {
    status(code: number) { statusCode = code; return response; },
    json(value: unknown) { body = value; return response; }
  };
  return { response, result: () => ({ statusCode, body }) };
}

describe('foundation operational endpoints', () => {
  it('reports true process liveness without querying the database', async () => {
    const recorder = responseRecorder();
    healthHandler({} as never, recorder.response as never);
    expect(recorder.result().statusCode).toBe(200);
    expect(recorder.result().body).toMatchObject({ data: { status: 'ok', service: 'hcm-lite-api' } });
  });

  it('reports readiness only after a successful database probe', async () => {
    const database: DatabaseHealth = { checkConnection: async () => undefined };
    const recorder = responseRecorder();
    await createReadinessHandler(database)({} as never, recorder.response as never);
    expect(recorder.result()).toEqual({ statusCode: 200, body: { data: { status: 'ready', database: 'available' } } });
  });

  it('does not claim ready if a database probe fails', async () => {
    const database: DatabaseHealth = { checkConnection: async () => Promise.reject(new Error('unavailable')) };
    const recorder = responseRecorder();
    await createReadinessHandler(database)({} as never, recorder.response as never);
    expect(recorder.result()).toEqual({ statusCode: 503, body: { error: { code: 'DATABASE_UNAVAILABLE', message: 'Database is not available.', details: [] } } });
  });
});
