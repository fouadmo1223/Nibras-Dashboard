import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Joins class names and resolves conflicting Tailwind utilities (last one wins). */
export const cn = (...inputs) => twMerge(clsx(inputs));
