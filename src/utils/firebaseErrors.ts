/**
 * Recursively strips `undefined` object keys while leaving `null` and valid falsy values intact,
 * preventing Firestore SDK crashes on optional fields (e.g. `advertiserName?: string`).
 */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto === Object.prototype || proto === null) {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (v !== undefined) {
          out[k] = stripUndefined(v);
        }
      }
      return out as T;
    }
  }
  return value;
}

/**
 * Extracts structured code/message fields from Firebase, JSON-wrapped FirestoreErrorInfo, or generic errors
 * and maps them to human-readable actionable text.
 */
export function formatFirebaseError(err: unknown, fallback = 'Operation failed. Please try again.'): string {
  if (!err) return fallback;

  let rawCode = '';
  let rawMessage = '';

  if (typeof err === 'string') {
    rawMessage = err;
  } else if (err instanceof Error) {
    rawMessage = err.message || '';
    const maybeCode = (err as { code?: unknown }).code;
    if (typeof maybeCode === 'string') rawCode = maybeCode;
  } else if (typeof err === 'object') {
    const obj = err as { code?: unknown; message?: unknown };
    if (typeof obj.code === 'string') rawCode = obj.code;
    if (typeof obj.message === 'string') rawMessage = obj.message;
  }

  // Unwrap JSON-encoded FirestoreErrorInfo if thrown by handleFirestoreError
  let pathContext = '';
  if (rawMessage.startsWith('{') && rawMessage.includes('"operationType"')) {
    try {
      const parsed = JSON.parse(rawMessage) as { error?: string; path?: string };
      if (parsed.error) rawMessage = parsed.error;
      if (parsed.path) pathContext = parsed.path;
    } catch {
      // keep original rawMessage
    }
  }

  const combined = `${rawCode} ${rawMessage}`.toLowerCase();
  const suffix = pathContext ? ` (${pathContext})` : '';

  if (combined.includes('quota exceeded for quota metric')) {
    const dbLink =
      'https://console.firebase.google.com/project/ainame-76af5/firestore/databases/(default)/data?openUpgradeDialog=true';
    return `Firestore daily free-tier read/write quota exceeded. Quota resets tomorrow, or upgrade here: ${dbLink}`;
  }

  if (rawCode === 'resource-exhausted' || combined.includes('quota exceeded')) {
    return 'Firebase usage quota exceeded. Quotas reset the next day — check your Firebase Spark/Blaze plan.';
  }

  if (rawCode === 'permission-denied' || combined.includes('missing or insufficient permissions')) {
    return `Permission denied${suffix}. Verify you are signed in with a verified admin account and all required fields match security rules.`;
  }

  if (rawCode === 'unauthenticated' || combined.includes('unauthenticated')) {
    return 'Your session has expired or you are signed out. Please sign in again to continue.';
  }

  if (
    rawCode === 'unavailable' ||
    combined.includes('client is offline') ||
    combined.includes('network-request-failed') ||
    combined.includes('failed to fetch')
  ) {
    return 'Network unavailable or Firestore is offline. Check your internet connection and retry.';
  }

  if (rawCode === 'invalid-argument' || combined.includes('invalid data')) {
    return `Validation error${suffix}: some input fields violate Firestore schema limits or types.`;
  }

  if (rawCode === 'failed-precondition' || combined.includes('requires an index')) {
    return 'Database index required or precondition failed. Deploy firestore.indexes.json and try again.';
  }

  if (rawCode === 'not-found' || combined.includes('no document to update')) {
    return `Record not found${suffix}. It may have been deleted in another session.`;
  }

  if (rawCode === 'storage/unauthorized') {
    return 'Storage upload denied: confirm you are signed in as a verified admin and uploading to a permitted media folder.';
  }

  if (rawCode === 'storage/canceled') {
    return 'File upload was canceled.';
  }

  if (rawCode === 'storage/quota-exceeded') {
    return 'Firebase Storage bucket quota exceeded. Free up space or upgrade your Firebase plan.';
  }

  if (rawCode === 'storage/retry-limit-exceeded') {
    return 'Upload timed out due to unstable network. Please retry.';
  }

  if (rawMessage.trim()) return rawMessage;
  return fallback;
}

const IMAGE_MIME_ALLOWED = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

export function validateImageUpload(
  file: { type: string; size: number; name?: string },
  maxMb = 5
): { valid: boolean; error?: string } {
  const ext = file.name?.split('.').pop()?.toLowerCase() ?? '';
  const extAllowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext);
  if (!file.type.startsWith('image/') && !IMAGE_MIME_ALLOWED.has(file.type) && !extAllowed) {
    return { valid: false, error: 'Only image files (JPG, PNG, WebP, GIF, SVG) are allowed.' };
  }
  if (file.size <= 0) {
    return { valid: false, error: 'Selected image file is empty.' };
  }
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: `Image exceeds the ${maxMb} MB storage rule limit.` };
  }
  return { valid: true };
}

export function validateSubtitleUpload(file: {
  size: number;
  name?: string;
}): { valid: boolean; error?: string } {
  const ext = file.name?.split('.').pop()?.toLowerCase() ?? '';
  if (!['vtt', 'srt', 'ass', 'txt'].includes(ext)) {
    return { valid: false, error: 'Subtitle files must be .vtt, .srt, .ass, or .txt.' };
  }
  if (file.size <= 0) {
    return { valid: false, error: 'Selected subtitle file is empty.' };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { valid: false, error: 'Subtitle file exceeds the 2 MB storage rule limit.' };
  }
  return { valid: true };
}

export function validateGenreDraft(draft: {
  name: string;
  slug: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = draft.name.trim();
  const slug = draft.slug.trim();
  if (!name) errors.name = 'Genre name is required.';
  else if (name.length > 60) errors.name = 'Genre name must be 60 characters or fewer.';
  if (!slug) errors.slug = 'Genre slug is required.';
  else if (slug.length > 60) errors.slug = 'Genre slug must be 60 characters or fewer.';
  return errors;
}

export function validateBannerDraft(draft: {
  movieId: string;
  imageUrl: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  const movieId = draft.movieId.trim();
  const imageUrl = draft.imageUrl.trim();
  if (!movieId || movieId.length > 128) errors.movieId = 'Select a target movie or series.';
  if (!imageUrl) errors.imageUrl = 'Banner image URL is required.';
  else if (imageUrl.length > 1500) errors.imageUrl = 'Banner image URL must be 1500 characters or fewer.';
  return errors;
}

export function validateCustomPageDraft(draft: {
  title: string;
  slug: string;
  contentHtml: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  const title = draft.title.trim();
  const slug = draft.slug.trim();
  if (!title) errors.title = 'Page title is required.';
  else if (title.length > 120) errors.title = 'Page title must be 120 characters or fewer.';
  if (!slug) errors.slug = 'Page slug is required.';
  else if (slug.length > 80) errors.slug = 'Page slug must be 80 characters or fewer.';
  else if (!/^[a-z0-9-]+$/.test(slug)) errors.slug = 'Slug may only contain lowercase letters, numbers, and hyphens.';
  if (draft.contentHtml.length > 50000) {
    errors.contentHtml = 'Page HTML must be 50,000 characters or fewer.';
  }
  return errors;
}

export function isFirebaseStorageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  return (
    url.startsWith('https://firebasestorage.googleapis.com/') ||
    url.startsWith('https://storage.googleapis.com/') ||
    url.startsWith('gs://')
  );
}
