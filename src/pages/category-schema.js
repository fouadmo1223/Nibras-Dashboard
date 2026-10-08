import { z } from 'zod';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Mirrors the API rules for instant feedback; the API stays the authority. */
export const categorySchema = (t) =>
  z.object({
    slug: z.string().trim().min(2, t('validation.slugShort')).max(80).regex(SLUG, t('validation.slug')),
    nameEn: z.string().trim().min(2, t('validation.nameRequired')).max(120),
    nameAr: z.string().trim().min(2, t('validation.nameRequired')).max(120),
    descriptionEn: z.string().trim().max(500).optional(),
    descriptionAr: z.string().trim().max(500).optional(),
    imageUrl: z.union([z.string().trim().url(t('validation.url')), z.literal('')]).optional(),
    isPublished: z.boolean().optional(),
  });
