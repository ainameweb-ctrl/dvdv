import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_AD_SETTINGS } from '../data/seedAds';
import type {
  AdUnlockRecord,
  CustomAdItem,
  EpisodeItem,
  MovieItem,
  SubscriptionPlan,
  UserProfile,
  VastAdItem,
} from '../types/streaming';
import {
  applyBulkQuickRulePreview,
  canConsumeUnlockQuota,
  canWatch,
  deriveSeriesAccessSummary,
  isUnlockRecordValid,
  pruneExpiredUnlocks,
  resolveEffectiveAccessRule,
  resolveTitleBadges,
} from './access';
import { selectUnlockAd } from './adEngine';

const TEST_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-plus',
    name: 'Plus Plan',
    slug: 'plus-plan',
    pricePerMonth: 9.99,
    currency: 'USD',
    billingInterval: 'monthly',
    description: 'HD streaming tier',
    features: ['1080p HD'],
    badgeColor: '#e50914',
    isActive: true,
    order: 1,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
  },
];

const TEST_SERIES: MovieItem = {
  id: 'series-test-1',
  title: 'Test Series',
  slug: 'test-series',
  type: 'series',
  description: 'Serialized test fixture.',
  releaseYear: 2026,
  duration: 24,
  rating: 9.0,
  ageRating: 'TV-MA',
  language: 'English',
  country: 'United States',
  genres: ['Sci-Fi'],
  cast: [],
  director: 'Director',
  tags: [],
  posterUrl: 'https://example.com/poster.jpg',
  bannerUrl: 'https://example.com/banner.jpg',
  trailerUrl: '',
  videoSources: [{ label: '1080p', url: 'https://example.com/video.mp4', type: 'mp4' }],
  subtitles: [],
  isFeatured: true,
  isTrending: true,
  isPremium: true,
  requiresSignIn: false,
  requiredPlanId: 'plan-plus',
  requiredPlanName: 'Plus Plan',
  access: {
    mode: 'sub_or_ad',
    requiredPlanId: 'plan-plus',
    requiredPlanName: 'Plus Plan',
    adFormat: 'video',
    adSourceMode: 'manual',
    videoAdIds: ['vast-reward-1'],
    bannerAdIds: ['ad-banner-1'],
    adsRequired: 1,
    unlockHours: 24,
  },
  seasonAccess: {
    'season-1': {
      mode: 'sub_or_ad',
      requiredPlanId: 'plan-plus',
      requiredPlanName: 'Plus Plan',
      adFormat: 'video',
      adSourceMode: 'manual',
      videoAdIds: ['vast-reward-1'],
      adsRequired: 1,
      unlockHours: 24,
    },
    'season-2': {
      mode: 'sub_or_ad',
      requiredPlanId: 'plan-plus',
      requiredPlanName: 'Plus Plan',
      adFormat: 'banner',
      adSourceMode: 'manual',
      bannerAdIds: ['ad-banner-1'],
      adsRequired: 1,
      unlockHours: 24,
    },
  },
  defaultAdFormat: 'video',
  status: 'published',
  views: 100,
  likesCount: 10,
  createdAt: '2026-11-10T10:00:00Z',
  updatedAt: '2026-11-16T10:00:00Z',
};

const TEST_FREE_MOVIE: MovieItem = {
  ...TEST_SERIES,
  id: 'movie-free-1',
  title: 'Free Feature',
  slug: 'free-feature',
  type: 'movie',
  isPremium: false,
  requiredPlanId: null,
  requiredPlanName: null,
  access: undefined,
  seasonAccess: undefined,
};

const TEST_EPISODES: EpisodeItem[] = [
  {
    id: 'ep-s1-1',
    seriesId: 'series-test-1',
    seasonId: 'season-1',
    seasonNumber: 1,
    number: 1,
    title: 'Episode 1',
    description: 'Free episode',
    duration: 24,
    thumbnailUrl: '',
    videoSources: [{ label: '1080p', url: 'https://example.com/1.mp4', type: 'mp4' }],
    subtitles: [],
    access: { mode: 'free' },
    createdAt: '2026-11-10T10:00:00Z',
  },
  {
    id: 'ep-s1-2',
    seriesId: 'series-test-1',
    seasonId: 'season-1',
    seasonNumber: 1,
    number: 2,
    title: 'Episode 2',
    description: 'Sub or video ad',
    duration: 24,
    thumbnailUrl: '',
    videoSources: [{ label: '1080p', url: 'https://example.com/2.mp4', type: 'mp4' }],
    subtitles: [],
    access: {
      mode: 'sub_or_ad',
      requiredPlanId: 'plan-plus',
      requiredPlanName: 'Plus Plan',
      adFormat: 'video',
      adSourceMode: 'manual',
      videoAdIds: ['vast-reward-1'],
      adsRequired: 1,
      unlockHours: 24,
    },
    createdAt: '2026-11-11T10:00:00Z',
  },
  {
    id: 'ep-s1-3',
    seriesId: 'series-test-1',
    seasonId: 'season-1',
    seasonNumber: 1,
    number: 3,
    title: 'Episode 3',
    description: 'Sub or banner ad',
    duration: 24,
    thumbnailUrl: '',
    videoSources: [{ label: '1080p', url: 'https://example.com/3.mp4', type: 'mp4' }],
    subtitles: [],
    access: {
      mode: 'sub_or_ad',
      requiredPlanId: 'plan-plus',
      requiredPlanName: 'Plus Plan',
      adFormat: 'banner',
      adSourceMode: 'manual',
      bannerAdIds: ['ad-banner-1'],
      adsRequired: 1,
      unlockHours: 24,
    },
    createdAt: '2026-11-12T10:00:00Z',
  },
  {
    id: 'ep-s1-4',
    seriesId: 'series-test-1',
    seasonId: 'season-1',
    seasonNumber: 1,
    number: 4,
    title: 'Episode 4',
    description: 'Subscription only',
    duration: 24,
    thumbnailUrl: '',
    videoSources: [{ label: '1080p', url: 'https://example.com/4.mp4', type: 'mp4' }],
    subtitles: [],
    access: {
      mode: 'subscription',
      requiredPlanId: 'plan-plus',
      requiredPlanName: 'Plus Plan',
    },
    createdAt: '2026-11-13T10:00:00Z',
  },
  {
    id: 'ep-s1-5',
    seriesId: 'series-test-1',
    seasonId: 'season-1',
    seasonNumber: 1,
    number: 5,
    title: 'Episode 5',
    description: 'Ad unlock only',
    duration: 24,
    thumbnailUrl: '',
    videoSources: [{ label: '1080p', url: 'https://example.com/5.mp4', type: 'mp4' }],
    subtitles: [],
    access: {
      mode: 'ad_unlock',
      adFormat: 'banner',
      adSourceMode: 'manual',
      bannerAdIds: ['ad-banner-1'],
      adsRequired: 1,
      unlockHours: 24,
    },
    createdAt: '2026-11-14T10:00:00Z',
  },
  {
    id: 'ep-s2-1',
    seriesId: 'series-test-1',
    seasonId: 'season-2',
    seasonNumber: 2,
    number: 1,
    title: 'Season 2 Episode 1',
    description: 'S2 premiere',
    duration: 24,
    thumbnailUrl: '',
    videoSources: [{ label: '1080p', url: 'https://example.com/6.mp4', type: 'mp4' }],
    subtitles: [],
    access: { mode: 'inherit' },
    createdAt: '2026-11-15T10:00:00Z',
  },
];

const TEST_CUSTOM_ADS: CustomAdItem[] = [
  {
    id: 'ad-banner-1',
    name: 'Primary Banner Ad',
    type: 'image',
    placement: 'player',
    imageUrl: 'https://example.com/banner-1.jpg',
    altText: 'Banner 1',
    redirectUrl: 'https://example.com/sponsor-1',
    openInNewTab: true,
    targetContentType: 'all',
    targetIds: [],
    startDate: '2026-09-29',
    endDate: '2027-09-29',
    status: 'active',
    priority: 10,
    weight: 90,
    dailyImpressionCap: 0,
    devices: ['desktop', 'mobile', 'tablet'],
    audience: 'free',
    isMandatoryClickBanner: true,
    requiredViewSeconds: 30,
    autoUnlockAfterCountdown: false,
    impressions: 0,
    clicks: 0,
    completions: 0,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-11-17T00:00:00Z',
    createdBy: 'system',
  },
  {
    id: 'ad-banner-2',
    name: 'Pinned Secondary Banner',
    type: 'image',
    placement: 'player',
    imageUrl: 'https://example.com/banner-2.jpg',
    altText: 'Banner 2',
    redirectUrl: 'https://example.com/sponsor-2',
    openInNewTab: true,
    targetContentType: 'all',
    targetIds: [],
    startDate: '2026-10-21',
    endDate: '2027-09-29',
    status: 'active',
    priority: 6,
    weight: 60,
    dailyImpressionCap: 0,
    devices: ['desktop', 'mobile', 'tablet'],
    audience: 'free',
    isMandatoryClickBanner: true,
    requiredViewSeconds: 20,
    autoUnlockAfterCountdown: true,
    impressions: 0,
    clicks: 0,
    completions: 0,
    createdAt: '2026-10-21T00:00:00Z',
    updatedAt: '2026-11-17T00:00:00Z',
    createdBy: 'system',
  },
];

const TEST_VAST_ADS: VastAdItem[] = [
  {
    id: 'vast-reward-1',
    name: 'Rewarded Video Ad 1',
    type: 'pre-roll',
    vastTagUrl: 'https://example.com/vast-1.xml',
    targetType: 'tvshow',
    targetIds: [],
    midRollAtSeconds: [],
    overlayStartSeconds: 10,
    overlayDurationSeconds: 12,
    skipAfterSeconds: 0,
    unlockDurationSeconds: 15,
    isUnlockEligible: true,
    startDate: '2026-09-29',
    endDate: '2027-09-29',
    status: 'active',
    priority: 10,
    audience: 'free',
    devices: ['desktop', 'mobile', 'tablet'],
    impressions: 0,
    completions: 0,
    skips: 0,
    clicks: 0,
    errors: 0,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-11-17T00:00:00Z',
    createdBy: 'system',
  },
  {
    id: 'vast-reward-2',
    name: 'Rewarded Video Ad 2',
    type: 'pre-roll',
    vastTagUrl: 'https://example.com/vast-2.xml',
    targetType: 'movie',
    targetIds: [],
    midRollAtSeconds: [],
    overlayStartSeconds: 10,
    overlayDurationSeconds: 12,
    skipAfterSeconds: 5,
    unlockDurationSeconds: 15,
    isUnlockEligible: true,
    startDate: '2026-09-29',
    endDate: '2027-09-29',
    status: 'active',
    priority: 8,
    audience: 'free',
    devices: ['desktop', 'mobile', 'tablet'],
    impressions: 0,
    completions: 0,
    skips: 0,
    clicks: 0,
    errors: 0,
    createdAt: '2026-09-29T00:00:00Z',
    updatedAt: '2026-11-17T00:00:00Z',
    createdBy: 'system',
  },
];

const freeUser: UserProfile = {
  uid: 'user-free-1',
  displayName: 'Free Viewer',
  email: 'free@example.com',
  photoURL: '',
  role: 'user',
  status: 'active',
  plan: 'free',
  subscriptionPlanId: null,
  subscriptionPlanName: null,
  planExpiresAt: null,
  createdAt: '2026-10-01T00:00:00Z',
  lastLoginAt: '2026-11-01T00:00:00Z',
};

const subUser: UserProfile = {
  ...freeUser,
  uid: 'user-sub-1',
  displayName: 'Plus Member',
  plan: 'premium',
  subscriptionPlanId: 'plan-plus',
  subscriptionPlanName: 'Plus Plan',
  planExpiresAt: '2027-11-01T00:00:00Z',
};

const expiredSubUser: UserProfile = {
  ...subUser,
  uid: 'user-expired-1',
  planExpiresAt: '2025-01-01T00:00:00Z',
};

test('resolveEffectiveAccessRule follows Episode -> Season -> Series -> Global precedence', () => {
  const baseMovie: MovieItem = {
    ...TEST_SERIES,
    access: {
      mode: 'subscription',
      requiredPlanId: 'plan-plus',
      requiredPlanName: 'Plus Plan',
      adFormat: 'video',
      adsRequired: 1,
      unlockHours: 24,
    },
    seasonAccess: {
      'season-2': {
        mode: 'sub_or_ad',
        adFormat: 'banner',
        adSourceMode: 'manual',
        bannerAdIds: ['ad-banner-1'],
        unlockHours: 12,
      },
    },
  };

  // Episode inheriting everything from Season 2 overrides Series subscription-only rule
  const epInheritS2 = { ...TEST_EPISODES[5], seasonNumber: 2, access: { mode: 'inherit' as const } };
  const resolvedS2 = resolveEffectiveAccessRule(baseMovie, epInheritS2, DEFAULT_AD_SETTINGS);
  assert.equal(resolvedS2.mode, 'sub_or_ad');
  assert.equal(resolvedS2.adFormat, 'banner');
  assert.equal(resolvedS2.unlockHours, 12);
  assert.equal(resolvedS2.sourceLayer, 'season');

  // Episode with explicit rule overrides Season 2
  const epExplicit = {
    ...TEST_EPISODES[5],
    seasonNumber: 2,
    access: { mode: 'ad_unlock' as const, adFormat: 'video' as const, adsRequired: 2 },
  };
  const resolvedEp = resolveEffectiveAccessRule(baseMovie, epExplicit, DEFAULT_AD_SETTINGS);
  assert.equal(resolvedEp.mode, 'ad_unlock');
  assert.equal(resolvedEp.adFormat, 'video');
  assert.equal(resolvedEp.adsRequired, 2);
  assert.equal(resolvedEp.sourceLayer, 'episode');

  // Episode in Season 1 (no season override) inherits Series rule
  const epInheritS1 = { ...TEST_EPISODES[0], seasonNumber: 1, access: { mode: 'inherit' as const } };
  const resolvedS1 = resolveEffectiveAccessRule(baseMovie, epInheritS1, DEFAULT_AD_SETTINGS);
  assert.equal(resolvedS1.mode, 'subscription');
  assert.equal(resolvedS1.sourceLayer, 'series_or_movie');
});

test('canWatch enforces independent per-episode unlocks and subscriber bypass', () => {
  const ep1Free = TEST_EPISODES[0];
  const ep2SubOrAd = TEST_EPISODES[1];
  const ep3SubOrAd = TEST_EPISODES[2];
  const ep4SubOnly = TEST_EPISODES[3];

  assert.equal(
    canWatch({ movie: TEST_SERIES, episode: ep1Free, user: null, plans: TEST_PLANS, settings: DEFAULT_AD_SETTINGS }).allowed,
    true
  );
  const guestEp2 = canWatch({ movie: TEST_SERIES, episode: ep2SubOrAd, user: null, plans: TEST_PLANS, settings: DEFAULT_AD_SETTINGS });
  assert.equal(guestEp2.allowed, false);
  assert.equal(guestEp2.canWatchAdToUnlock, true);
  assert.equal(guestEp2.canSubscribe, true);

  const guestDisabled = canWatch({
    movie: TEST_SERIES,
    episode: ep2SubOrAd,
    user: null,
    plans: TEST_PLANS,
    settings: { ...DEFAULT_AD_SETTINGS, guestAdUnlock: false },
  });
  assert.equal(guestDisabled.canWatchAdToUnlock, false);
  assert.equal(guestDisabled.requiresSignInForAd, true);

  const now = Date.parse('2026-11-18T10:00:00Z');
  const unlocks: Record<string, AdUnlockRecord> = {
    [ep2SubOrAd.id]: {
      contentId: ep2SubOrAd.id,
      seriesId: TEST_SERIES.id,
      contentType: 'episode',
      uid: freeUser.uid,
      unlockedAt: '2026-11-18T09:00:00Z',
      expiresAt: '2026-11-19T09:00:00Z',
      adId: 'vast-reward-1',
      adKind: 'vast',
      format: 'video',
      method: 'rewarded_ad',
    },
  };
  const checkEp2 = canWatch({
    movie: TEST_SERIES,
    episode: ep2SubOrAd,
    user: freeUser,
    plans: TEST_PLANS,
    unlocksMap: unlocks,
    settings: DEFAULT_AD_SETTINGS,
    nowMs: now,
  });
  assert.equal(checkEp2.allowed, true);
  assert.equal(checkEp2.unlockedBy, 'ad_unlock');

  const checkEp3 = canWatch({
    movie: TEST_SERIES,
    episode: ep3SubOrAd,
    user: freeUser,
    plans: TEST_PLANS,
    unlocksMap: unlocks,
    settings: DEFAULT_AD_SETTINGS,
    nowMs: now,
  });
  assert.equal(checkEp3.allowed, false);
  assert.equal(checkEp3.canWatchAdToUnlock, true);

  const checkEp4 = canWatch({
    movie: TEST_SERIES,
    episode: ep4SubOnly,
    user: freeUser,
    plans: TEST_PLANS,
    unlocksMap: unlocks,
    settings: DEFAULT_AD_SETTINGS,
    nowMs: now,
  });
  assert.equal(checkEp4.allowed, false);
  assert.equal(checkEp4.canWatchAdToUnlock, false);
  assert.equal(checkEp4.canSubscribe, true);

  assert.equal(
    canWatch({ movie: TEST_SERIES, episode: ep4SubOnly, user: subUser, plans: TEST_PLANS, settings: DEFAULT_AD_SETTINGS, nowMs: now }).unlockedBy,
    'subscriber'
  );

  const checkExpired = canWatch({
    movie: TEST_SERIES,
    episode: ep4SubOnly,
    user: expiredSubUser,
    plans: TEST_PLANS,
    settings: DEFAULT_AD_SETTINGS,
    nowMs: now,
  });
  assert.equal(checkExpired.allowed, false);
  assert.equal(checkExpired.reason, 'expired');
});

test('unlock validity pruning & hourly quota caps (20/hr default)', () => {
  const now = Date.parse('2026-11-18T12:00:00Z');
  const map: Record<string, AdUnlockRecord> = {
    valid: {
      contentId: 'valid',
      contentType: 'episode',
      uid: 'u1',
      unlockedAt: '2026-11-18T11:00:00Z',
      expiresAt: '2026-11-19T11:00:00Z',
      adId: 'a1',
      adKind: 'vast',
      format: 'video',
      method: 'rewarded_ad',
    },
    session: {
      contentId: 'session',
      contentType: 'episode',
      uid: 'u1',
      unlockedAt: '2026-11-18T11:00:00Z',
      expiresAt: null,
      sessionOnly: true,
      adId: 'a2',
      adKind: 'custom',
      format: 'banner',
      method: 'rewarded_ad',
    },
    expired: {
      contentId: 'expired',
      contentType: 'episode',
      uid: 'u1',
      unlockedAt: '2026-11-17T10:00:00Z',
      expiresAt: '2026-11-18T10:00:00Z',
      adId: 'a3',
      adKind: 'vast',
      format: 'video',
      method: 'rewarded_ad',
    },
  };
  assert.equal(isUnlockRecordValid(map.expired, now), false);
  assert.equal(isUnlockRecordValid(map.session, now), true);
  const pruned = pruneExpiredUnlocks(map, now);
  assert.deepEqual(Object.keys(pruned).sort(), ['session', 'valid']);

  const twentyTimestamps = Array.from({ length: 20 }, (_, i) => now - i * 60_000);
  const capped = canConsumeUnlockQuota(twentyTimestamps, 20, now);
  assert.equal(capped.allowed, false);
  assert.equal(capped.remaining, 0);

  const okQuota = canConsumeUnlockQuota(twentyTimestamps.slice(0, 19), 20, now);
  assert.equal(okQuota.allowed, true);
  assert.equal(okQuota.remaining, 1);
});

test('selectUnlockAd honors manual pinned ad deterministically and never swaps randomly', () => {
  const ctx = {
    contentType: 'tvshow' as const,
    contentId: TEST_SERIES.id,
    episodeId: 'ep-s1-3',
    device: 'desktop' as const,
    user: freeUser,
  };
  const now = Date.parse('2026-11-18T10:00:00Z');

  for (const r of [0, 0.25, 0.5, 0.99]) {
    const choice = selectUnlockAd({
      adFormat: 'banner',
      adSourceMode: 'manual',
      pinnedBannerAdIds: ['ad-banner-2'],
      vastAds: TEST_VAST_ADS,
      customAds: TEST_CUSTOM_ADS,
      ctx,
      nowMs: now,
      rand: () => r,
    });
    assert.ok(choice);
    assert.equal(choice.format, 'banner');
    assert.equal(choice.ad.id, 'ad-banner-2');
    assert.equal(choice.selectionReason, 'pinned');
  }

  const vidChoice = selectUnlockAd({
    adFormat: 'video',
    adSourceMode: 'manual',
    pinnedVideoAdIds: ['vast-reward-2'],
    vastAds: TEST_VAST_ADS,
    customAds: TEST_CUSTOM_ADS,
    ctx,
    nowMs: now,
    rand: () => 0.9,
  });
  assert.ok(vidChoice);
  assert.equal(vidChoice.format, 'video');
  assert.equal(vidChoice.ad.id, 'vast-reward-2');
  assert.equal(vidChoice.selectionReason, 'pinned');
});

test('resolveTitleBadges synchronizes PAID, FREE WITH ADS, INCLUDED, Some Episodes Free & OFF-by-default FREE', () => {
  const summary = deriveSeriesAccessSummary(TEST_SERIES, TEST_EPISODES, DEFAULT_AD_SETTINGS);
  assert.equal(summary.hasFree, true);
  assert.equal(summary.hasAdUnlock, true);
  assert.equal(summary.hasSubOnly, true);

  const seriesBadgesFree = resolveTitleBadges({
    movie: TEST_SERIES,
    episodesSummary: summary,
    user: freeUser,
    plans: TEST_PLANS,
    settings: DEFAULT_AD_SETTINGS,
  });
  assert.ok(seriesBadgesFree.some((b) => b.id === 'some_episodes_free'));
  assert.ok(seriesBadgesFree.some((b) => b.id === 'paid' && b.label.includes('Plus Plan')));
  assert.ok(seriesBadgesFree.some((b) => b.id === 'free_with_ads'));

  assert.equal(
    resolveTitleBadges({ movie: TEST_FREE_MOVIE, user: freeUser, settings: DEFAULT_AD_SETTINGS }).length,
    0
  );

  const withFreeBadgeOn = {
    ...DEFAULT_AD_SETTINGS,
    badgeSettings: {
      ...DEFAULT_AD_SETTINGS.badgeSettings!,
      free: { ...DEFAULT_AD_SETTINGS.badgeSettings!.free, enabled: true },
    },
  };
  assert.equal(
    resolveTitleBadges({ movie: TEST_FREE_MOVIE, user: freeUser, settings: withFreeBadgeOn })[0]?.id,
    'free'
  );

  const epSubBadges = resolveTitleBadges({
    movie: TEST_SERIES,
    episode: TEST_EPISODES[3],
    user: subUser,
    plans: TEST_PLANS,
    settings: DEFAULT_AD_SETTINGS,
  });
  assert.equal(epSubBadges.length, 1);
  assert.equal(epSubBadges[0].id, 'included');
});

test('applyBulkQuickRulePreview generates deterministic first-N-free and every-Nth-free plans', () => {
  const s1Eps = TEST_EPISODES.filter((e) => e.seasonNumber === 1);
  const diff = applyBulkQuickRulePreview({
    movie: TEST_SERIES,
    episodes: s1Eps,
    ruleKind: 'first_n_free_rest_sub_or_ad',
    paramN: 2,
    planId: 'plan-plus',
    planName: 'Plus Plan',
    adFormat: 'banner',
    settings: DEFAULT_AD_SETTINGS,
  });

  assert.equal(diff.length, 5);
  assert.equal(diff[0].afterRule.mode, 'free');
  assert.equal(diff[1].afterRule.mode, 'free');
  assert.equal(diff[2].afterRule.mode, 'sub_or_ad');
  assert.equal(diff[3].afterRule.mode, 'sub_or_ad');
  assert.equal(diff[4].afterRule.adFormat, 'banner');
});
