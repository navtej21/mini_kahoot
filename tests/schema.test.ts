import { describe, it, expect } from 'vitest';
import { questionInput, joinBody, codeParams } from '../src/schemas.js';

describe('schemas', () => {
  it('fills the default time limit', () => {
    const r = questionInput.parse({ text: 'Capital of France?', options: ['Paris', 'Rome'], correctIndex: 0 });
    expect(r.timeLimitSec).toBe(20);
  });

  it('rejects a correctIndex outside the options', () => {
    const r = questionInput.safeParse({ text: 'Q?', options: ['a', 'b'], correctIndex: 5 });
    expect(r.success).toBe(false);
  });

  it('trims nicknames and rejects too-short ones', () => {
    expect(joinBody.parse({ nickname: '  Asha  ' }).nickname).toBe('Asha');
    expect(joinBody.safeParse({ nickname: ' a ' }).success).toBe(false);
  });

  it('normalises room codes', () => {
    expect(codeParams.parse({ code: ' k7m2qx ' }).code).toBe('K7M2QX');
  });
});