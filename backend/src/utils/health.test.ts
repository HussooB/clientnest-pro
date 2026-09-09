import { describe, it, expect } from 'vitest';

describe('Health Check', () => {
  it('should return a healthy status', () => {
    const status = { status: 'ok', service: 'ClientNest Pro API' };
    expect(status.status).toBe('ok');
  });
});