import { z } from 'zod';

/** Mirrors the API rules for instant feedback; the API stays the authority. */
export const addInstructorSchema = (t) => z.object({ email: z.string().trim().min(1, t('validation.emailRequired')).pipe(z.email(t('validation.emailInvalid'))) });

const optionalUrl = (t) => z.union([z.literal(''), z.string().trim().url(t('validation.url'))]).optional();

export const instructorProfileSchema = (t) =>
  z.object({
    headlineEn: z.string().trim().max(160).optional(),
    headlineAr: z.string().trim().max(160).optional(),
    bioEn: z.string().trim().max(2000).optional(),
    bioAr: z.string().trim().max(2000).optional(),
    websiteUrl: optionalUrl(t),
    linkedinUrl: optionalUrl(t),
    xUrl: optionalUrl(t),
  });
