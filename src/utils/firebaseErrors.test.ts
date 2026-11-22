import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatFirebaseError,
  isFirebaseStorageUrl,
  stripUndefined,
  validateBannerDraft,
  validateCustomPageDraft,
  validateGenreDraft,
  validateImageUpload,
  validateSubtitleUpload,
} from './firebaseErrors.ts';

describe('firebaseErrors utilities & rule-aligned validators', () => {
  it('stripUndefined removes undefined keys recursively while preserving null and falsy values', () => {
    const cleaned = stripUndefined({
      name: 'Ad Campaign',
      advertiserName: undefined,
      requiredPlanId: null,
      count: 0,
      enabled: false,
      nested: { a: 1, b: undefined },
      list: [{ id: 'x', extra: undefined }],
    });
    assert.deepEqual(cleaned, {
      name: 'Ad Campaign',
      requiredPlanId: null,
      count: 0,
      enabled: false,
      nested: { a: 1 },
      list: [{ id: 'x' }],
    });
    assert.equal('advertiserName' in cleaned, false);
  });

  it('formatFirebaseError maps Firebase & Storage error codes to human-readable actionable text', () => {
    assert.match(
      formatFirebaseError({ code: 'permission-denied', message: 'Missing or insufficient permissions.' }),
      /Permission denied/i
    );
    assert.match(
      formatFirebaseError(
        new Error(
          JSON.stringify({
            error: "Quota exceeded for quota metric 'Free daily read units per project (free tier database)'",
            operationType: 'list',
            path: 'movies',
          })
        )
      ),
      /openUpgradeDialog=true/
    );
    assert.match(formatFirebaseError({ code: 'unavailable' }), /Network unavailable|offline/i);
    assert.match(formatFirebaseError({ code: 'storage/unauthorized' }), /Storage upload denied/i);
    assert.match(formatFirebaseError({ code: 'storage/quota-exceeded' }), /Storage bucket quota exceeded/i);
  });

  it('validateImageUpload enforces image type, non-empty size, and rule byte caps', () => {
    assert.equal(validateImageUpload({ type: 'image/png', size: 1024, name: 'poster.png' }, 5).valid, true);
    assert.equal(validateImageUpload({ type: 'application/pdf', size: 1024, name: 'doc.pdf' }, 5).valid, false);
    assert.equal(validateImageUpload({ type: 'image/jpeg', size: 0, name: 'empty.jpg' }, 5).valid, false);
    assert.equal(
      validateImageUpload({ type: 'image/webp', size: 6 * 1024 * 1024, name: 'huge.webp' }, 5).valid,
      false
    );
  });

  it('validateSubtitleUpload restricts extensions and enforces 2 MB cap', () => {
    assert.equal(validateSubtitleUpload({ size: 2048, name: 'en.vtt' }).valid, true);
    assert.equal(validateSubtitleUpload({ size: 2048, name: 'en.srt' }).valid, true);
    assert.equal(validateSubtitleUpload({ size: 2048, name: 'script.exe' }).valid, false);
    assert.equal(validateSubtitleUpload({ size: 3 * 1024 * 1024, name: 'huge.vtt' }).valid, false);
  });

  it('validateGenreDraft & validateBannerDraft & validateCustomPageDraft match Firestore rules bounds', () => {
    assert.equal(Object.keys(validateGenreDraft({ name: 'Action', slug: 'action' })).length, 0);
    assert.ok(validateGenreDraft({ name: 'x'.repeat(61), slug: 'x' }).name);

    assert.equal(
      Object.keys(validateBannerDraft({ movieId: 'mov-1', imageUrl: 'https://example.com/b.jpg' })).length,
      0
    );
    assert.ok(validateBannerDraft({ movieId: '', imageUrl: '' }).movieId);

    assert.equal(
      Object.keys(
        validateCustomPageDraft({ title: 'About', slug: 'about-us', contentHtml: '<p>Hi</p>' })
      ).length,
      0
    );
    assert.ok(
      validateCustomPageDraft({ title: 'About', slug: 'Invalid Slug!', contentHtml: '<p>Hi</p>' }).slug
    );
  });

  it('isFirebaseStorageUrl identifies Firebase Storage download URLs', () => {
    assert.equal(
      isFirebaseStorageUrl('https://firebasestorage.googleapis.com/v0/b/meta-fulcrum-35gvv/o/posters%2F1.png'),
      true
    );
    assert.equal(isFirebaseStorageUrl('https://image.tmdb.org/t/p/w500/abc.jpg'), false);
  });
});
