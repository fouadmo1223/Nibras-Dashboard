import { z } from 'zod';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const COURSE_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

/** Mirrors the API rules for instant feedback; the API stays the authority. */
export const courseSchema = (t) =>
  z
    .object({
      slug: z.string().trim().min(2, t('validation.slugShort')).max(120).regex(SLUG, t('validation.slug')),
      titleEn: z.string().trim().min(2, t('validation.nameRequired')).max(160),
      titleAr: z.string().trim().min(2, t('validation.nameRequired')).max(160),
      subtitleEn: z.string().trim().max(240).optional(),
      subtitleAr: z.string().trim().max(240).optional(),
      descriptionEn: z.string().trim().max(4000).optional(),
      descriptionAr: z.string().trim().max(4000).optional(),
      imageUrl: z.union([z.string().trim().url(t('validation.url')), z.literal('')]).optional(),
      level: z.enum(COURSE_LEVELS),
      price: z.coerce.number(t('validation.priceInvalid')).min(0, t('validation.priceInvalid')),
      compareAtPrice: z.union([z.coerce.number(t('validation.priceInvalid')).min(0, t('validation.priceInvalid')), z.literal('')]).optional(),
      categoryId: z.string().trim().min(1, t('validation.required')),
      instructorId: z.string().trim().min(1, t('validation.required')),
      isPublished: z.boolean().optional(),
    })
    .refine((data) => !data.compareAtPrice || data.compareAtPrice > data.price, {
      message: t('validation.compareAtPriceTooLow'),
      path: ['compareAtPrice'],
    });
