import { describe, it, expect } from 'vitest';

// LAYER 1: PURE DOMAIN. No framework, no database, no HTTP.
// The Mockito-shaped test a Spring developer writes first. It is fast and it
// proves almost nothing about the system.
describe('layer 1: domain rules', () => {
  const isSupported = (currency: string) => ['USD', 'EUR', 'GBP', 'ZAR'].includes(currency);

  it('accepts a supported currency', () => {
    expect(isSupported('USD')).toBe(true);
  });

  it('rejects an unsupported one', () => {
    expect(isSupported('ZZZ')).toBe(false);
  });
});
