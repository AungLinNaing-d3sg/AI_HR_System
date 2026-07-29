import { cn } from './cn';

describe('cn', () => {
  it('joins simple class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy values', () => {
    expect(cn('a', false && 'b', undefined, null, 'c')).toBe('a c');
  });

  it('merges conflicting tailwind utility classes, keeping the last one', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('supports conditional object syntax', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });

  it('returns an empty string when given no meaningful input', () => {
    expect(cn()).toBe('');
    expect(cn(undefined, null, false)).toBe('');
  });
});
