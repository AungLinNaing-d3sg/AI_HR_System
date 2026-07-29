import { z } from 'zod';
import { zodErrorToFieldErrors } from './zodErrors';

describe('zodErrorToFieldErrors', () => {
  const schema = z.object({
    email: z.string().email('Enter a valid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
  });

  it('maps each invalid field to its list of messages', () => {
    const result = schema.safeParse({ email: 'not-an-email', password: 'short' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodErrorToFieldErrors(result.error)).toEqual({
        email: ['Enter a valid email address.'],
        password: ['Password must be at least 8 characters.'],
      });
    }
  });

  it('omits fields that passed validation', () => {
    const result = schema.safeParse({ email: 'not-an-email', password: 'longenoughpassword' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = zodErrorToFieldErrors(result.error);
      expect(fieldErrors.password).toBeUndefined();
      expect(fieldErrors.email).toEqual(['Enter a valid email address.']);
    }
  });
});
