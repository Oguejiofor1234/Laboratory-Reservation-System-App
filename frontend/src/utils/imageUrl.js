/**
 * Resolves an image URL so it always points to the right host.
 *
 * - Cloudinary / any absolute URL  → returned as-is
 * - Relative path (/uploads/...)   → prepend backend base URL (VITE_SOCKET_URL)
 *                                    In local dev VITE_SOCKET_URL is empty and
 *                                    Vite's proxy handles /uploads → backend.
 * - null / undefined               → null
 */
export const resolveImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
  // Relative path — prepend backend origin for production
  const backendBase = (import.meta.env.VITE_SOCKET_URL || '').replace(/\/$/, '');
  return backendBase ? `${backendBase}${imageUrl}` : imageUrl;
};
