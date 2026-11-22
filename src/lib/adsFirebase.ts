import { DEFAULT_AD_SETTINGS } from '../data/seedAds';
import type {
  AdEventItem,
  AdGlobalSettings,
  CustomAdItem,
  VastAdItem,
} from '../types/streaming';
import { normalizeAdSettings } from '../utils/access';
import type { Unsubscribe } from './firebase';

const DAILY_CAPS_KEY = 'kv_daily_ad_caps_v1';
const LOCAL_FUNNEL_EVENTS_KEY = 'kv_local_ad_events_v1';

export function clearAdsBundleCache(): void {}

export function getDailyImpressionCounts(): Record<string, number> {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(DAILY_CAPS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { date?: string; counts?: Record<string, number> };
    if (parsed.date !== today) return {};
    return parsed.counts || {};
  } catch {
    return {};
  }
}

export function incrementLocalDailyImpression(adId: string): void {
  const today = new Date().toISOString().slice(0, 10);
  const current = getDailyImpressionCounts();
  const next = { ...current, [adId]: (current[adId] ?? 0) + 1 };
  try {
    localStorage.setItem(DAILY_CAPS_KEY, JSON.stringify({ date: today, counts: next }));
  } catch {
    // Ignore storage failures
  }
}

export async function fetchAdSettings(): Promise<AdGlobalSettings> {
  return normalizeAdSettings(DEFAULT_AD_SETTINGS);
}

export async function saveAdSettings(
  _settings: AdGlobalSettings,
  _adminUid: string
): Promise<void> {}

export async function loadAds(): Promise<{
  customAds: CustomAdItem[];
  vastAds: VastAdItem[];
  adSettings: AdGlobalSettings;
}> {
  return {
    customAds: [],
    vastAds: [],
    adSettings: normalizeAdSettings(DEFAULT_AD_SETTINGS),
  };
}

export function subscribeToLiveAdsData(
  onData: (bundle: {
    customAds?: CustomAdItem[];
    vastAds?: VastAdItem[];
    adSettings?: AdGlobalSettings;
  }) => void,
  _onError?: (err: Error) => void
): Unsubscribe {
  onData({
    customAds: [],
    vastAds: [],
    adSettings: normalizeAdSettings(DEFAULT_AD_SETTINGS),
  });
  return () => undefined;
}

export async function fetchAllAdsAdminData(): Promise<{
  customAds: CustomAdItem[];
  vastAds: VastAdItem[];
  adEvents: AdEventItem[];
  adSettings: AdGlobalSettings;
}> {
  return {
    customAds: [],
    vastAds: [],
    adEvents: readLocalFunnelEvents(),
    adSettings: normalizeAdSettings(DEFAULT_AD_SETTINGS),
  };
}

export async function saveCustomAdDoc(
  _ad: CustomAdItem,
  _adminUid: string,
  _isNew: boolean
): Promise<void> {}

export async function deleteCustomAdDoc(
  _ad: CustomAdItem,
  _adminUid: string
): Promise<void> {}

export async function saveVastAdDoc(
  _ad: VastAdItem,
  _adminUid: string,
  _isNew: boolean
): Promise<void> {}

export async function deleteVastAdDoc(
  _ad: VastAdItem,
  _adminUid: string
): Promise<void> {}

export function readLocalFunnelEvents(): AdEventItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_FUNNEL_EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AdEventItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function trackAdEvent(
  _input: Omit<AdEventItem, 'id' | 'createdAt'>,
  _testMode = false
): void {}

export async function flushAdEvents(): Promise<void> {}
