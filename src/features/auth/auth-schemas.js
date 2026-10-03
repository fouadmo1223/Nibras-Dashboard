import { z } from 'zod';

// Instant feedback only; the API remains the authority. Built per language from the page's `t`.
const emailField = (t) => z.string().trim().min(1, t('validation.emailRequired')).pipe(z.email(t('validation.emailInvalid')));

export const loginSchema = (t) =>
  z.object({
    email: emailField(t),
    password: z.string().min(1, t('validation.passwordRequired')),
  });

export const forgotPasswordSchema = (t) => z.object({ email: emailField(t) });

/** Rough strength meter (0–4) for UX only — length and character variety. */
export function passwordStrength(value = '') {
  if (!value) return 0;
  let score = value.length >= 10 ? 1 : 0;
  if (value.length >= 14) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value) || /[^A-Za-z0-9]/.test(value)) score++;
  return Math.min(score, 4);
}
