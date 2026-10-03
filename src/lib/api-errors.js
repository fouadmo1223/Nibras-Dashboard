import { ApiError } from '@/services/api-client';

const OFFLINE = 'We couldn’t reach Nibras. Check your connection and try again.';
const GENERIC = 'Something went wrong. Please try again.';

/**
 * The message to show for a failed request: the API's own message whenever the
 * server answered; local copy only when there was no usable server response.
 */
export function errorMessage(error) {
  if (!(error instanceof ApiError)) return GENERIC;
  if (error.code === 'NETWORK_ERROR') return OFFLINE;
  return error.code === 'UNKNOWN_ERROR' ? GENERIC : error.message;
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
