/**
 * Only allows same-site relative paths as post-login destinations
 * (blocks open redirects like `//evil.com` or `https://evil.com`).
 */
export function safeRedirect(target, fallback = '/') {
  if (typeof target !== 'string' || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) {
    return fallback;
  }
  return target;
}
