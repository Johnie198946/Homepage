import { fetchPhotoPresigned } from "./portfolio";

export interface PhotoMediaRef {
  id?: number;
  imageUrl?: string | null;
  thumbUrl?: string | null;
}

interface CachedPhotoMedia {
  imageUrl: string;
  thumbUrl: string | null;
  expiresAtMs: number;
}

interface ResolvePhotoMediaOptions {
  preferFull?: boolean;
  forceRefresh?: boolean;
}

const EXPIRY_BUFFER_MS = 30_000;
const mediaCache = new Map<number, CachedPhotoMedia>();

function resolveFallbackUrl(photo: PhotoMediaRef, preferFull: boolean): string | null {
  if (preferFull) {
    return photo.imageUrl ?? null;
  }

  return photo.thumbUrl || photo.imageUrl || null;
}

function isCacheValid(media: CachedPhotoMedia | undefined): media is CachedPhotoMedia {
  return Boolean(media && media.expiresAtMs - Date.now() > EXPIRY_BUFFER_MS);
}

export async function resolvePhotoMediaUrl(
  photo: PhotoMediaRef,
  options: ResolvePhotoMediaOptions = {}
): Promise<string | null> {
  const preferFull = options.preferFull ?? false;
  const directUrl = resolveFallbackUrl(photo, preferFull);

  // Same-domain media endpoints are stable and already handle redirect/protection.
  // Use them directly to avoid an extra presigned-URL request per image.
  if (directUrl) {
    return directUrl;
  }

  if (!photo.id) {
    return null;
  }

  const cached = mediaCache.get(photo.id);
  if (!options.forceRefresh && isCacheValid(cached)) {
    return preferFull ? cached.imageUrl : cached.thumbUrl || cached.imageUrl;
  }

  const media = await fetchPhotoPresigned(photo.id);
  const expiresAtMs = Date.parse(media.expiresAt);
  mediaCache.set(photo.id, {
    imageUrl: media.imageUrl,
    thumbUrl: media.thumbUrl,
    expiresAtMs: Number.isFinite(expiresAtMs) ? expiresAtMs : Date.now() + media.expiresIn * 1000,
  });

  const refreshed = mediaCache.get(photo.id);
  return refreshed ? (preferFull ? refreshed.imageUrl : refreshed.thumbUrl || refreshed.imageUrl) : null;
}
