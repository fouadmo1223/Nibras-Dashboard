import { ApiError } from '@/services/api-client';

/**
 * The message to show for a failed request: the API's own (already translated) message
 * whenever the server answered; local copy, via `t`, only without a usable response.
 */
export function errorMessage(error, t) {
  if (!(error instanceof ApiError)) return t('common.genericError');
  if (error.code === 'NETWORK_ERROR') return t('common.offline');
  return error.code === 'UNKNOWN_ERROR' ? t('common.genericError') : error.message;
}

/**
 * Copies 422 field errors from the API onto react-hook-form fields.
 * Returns true when at least one field error was applied.
 */
export function applyFieldErrors(error, setError, fields) {
  if (!(error instanceof ApiError) || error.code !== 'VALIDATION_ERROR' || !Array.isArray(error.details)) return false;
  let applied = false;
  for (const { field, messages } of error.details) {
    if (fields.includes(field)) {
      setError(field, { type: 'server', message: messages[0] });
      applied = true;
    }
  }
  return applied;
}
