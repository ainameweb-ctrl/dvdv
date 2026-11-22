import type {
  AdGlobalSettings,
  BadgeCustomizationSettings,
  CustomAdItem,
  VastAdItem,
} from '../types/streaming';

export const DEFAULT_BADGE_SETTINGS: BadgeCustomizationSettings = {
  showPlanNameOnPaid: true,
  collapseOnMobile: true,
  paid: {
    label: 'PAID',
    color: '#f97316',
    icon: 'lock',
    enabled: true,
  },
  freeWithAds: {
    label: 'FREE WITH ADS',
    color: '#16a34a',
    icon: 'play',
    enabled: true,
  },
  free: {
    label: 'FREE',
    color: '#10b981',
    icon: 'sparkles',
    enabled: false, // OFF by default per spec
  },
  included: {
    label: 'INCLUDED',
    color: '#22c55e',
    icon: 'check',
    enabled: true,
  },
  someEpisodesFree: {
    label: 'Some Episodes Free',
    color: '#0ea5e9',
    icon: 'gift',
    enabled: true,
  },
};

export const DEFAULT_AD_SETTINGS: AdGlobalSettings = {
  adsEnabled: true,
  hideAdsForPremium: true,
  maxAdsPerSession: 6,
  minSecondsBetweenVideoAds: 300,
  adLabelText: 'Ad',
  showAdLabel: true,
  testMode: false,
  defaultDailyCap: 0,
  adUnlockEnabled: true,
  guestAdUnlock: true,
  maxUnlocksPerHour: 20,
  defaultUnlockValidityHours: 24,
  failureFallback: 'keep_locked',
  unlockSkipAllowed: false,
  defaultUnlockAdFormat: 'video',
  bannerCountdownSeconds: 30,
  bannerAutoUnlockAfterCountdown: false,
  gateTitle: 'Unlock this episode',
  gateDescription:
    'Watch a short ad to play this episode for free, or subscribe for unlimited ad-free viewing.',
  watchAdButtonText: 'Watch Ad to Unlock',
  watchAdSubtext: 'Free · About 30 seconds',
  subscribeButtonText: 'View Subscription Plans',
  subscribeSubtext: 'Subscribers watch without ads',
  bannerPromptText: 'Click the advertisement to continue',
  badgeSettings: DEFAULT_BADGE_SETTINGS,
};

export const SEED_CUSTOM_ADS: CustomAdItem[] = [];

export const SEED_VAST_ADS: VastAdItem[] = [];


