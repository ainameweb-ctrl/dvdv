import type {
  AchievementItem,
  EpisodeItem,
  LibraryActivityItem,
  LibraryItem,
  LibraryStatus,
  MovieItem,
  TitleProgressItem,
} from '../types/streaming';
import { computeTitleProgress, getProgressUnitId } from '../utils/library';
import type { Unsubscribe } from './firebase';

export const ACTIVITY_PAGE_SIZE = 50;

export type QueryDocumentSnapshot = unknown;

export interface ActivityPageResult {
  items: LibraryActivityItem[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

export function subscribeToUserLibrary(
  _uid: string,
  onData: (items: LibraryItem[]) => void,
  _onError?: (err: Error) => void
): Unsubscribe {
  onData([]);
  return () => undefined;
}

export function subscribeToUserProgress(
  _uid: string,
  onData: (items: Record<string, TitleProgressItem>) => void,
  _onError?: (err: Error) => void
): Unsubscribe {
  onData({});
  return () => undefined;
}

export function subscribeToUserActivity(
  _uid: string,
  _titleFilterId: string | null,
  onData: (result: ActivityPageResult) => void,
  _onError?: (err: Error) => void
): Unsubscribe {
  onData({ items: [], lastDoc: null, hasMore: false });
  return () => undefined;
}

export async function fetchMoreUserActivity(
  _uid: string,
  _cursor: QueryDocumentSnapshot,
  _titleFilterId: string | null
): Promise<ActivityPageResult> {
  return { items: [], lastDoc: null, hasMore: false };
}

export function subscribeToUserAchievements(
  _uid: string,
  onData: (items: AchievementItem[]) => void,
  _onError?: (err: Error) => void
): Unsubscribe {
  onData([]);
  return () => undefined;
}

export async function addTitleToLibrary(
  _uid: string,
  movie: MovieItem,
  status: LibraryStatus = 'watching'
): Promise<LibraryItem> {
  return {
    titleId: movie.id,
    titleName: movie.title.slice(0, 180),
    titleType: movie.type,
    ...(movie.posterUrl ? { posterUrl: movie.posterUrl.slice(0, 1500) } : {}),
    addedAt: new Date().toISOString(),
    status,
  };
}

export async function updateLibraryStatus(
  _uid: string,
  _item: LibraryItem,
  _status: LibraryStatus
): Promise<void> {}

export async function removeTitleFromLibrary(_uid: string, _titleId: string): Promise<void> {}

export async function rateLibraryTitle(
  _uid: string,
  _movie: MovieItem,
  _rating: number
): Promise<void> {}

export interface RecordCompletionParams {
  uid: string;
  movie: MovieItem;
  episode?: EpisodeItem | null;
  totalEpisodesCount: number;
  durationSeconds: number;
  prevProgress?: TitleProgressItem;
  existingLibraryItem?: LibraryItem;
}

export interface RecordCompletionResult {
  progress: TitleProgressItem;
  didCompleteTitle: boolean;
  achievementIssued: boolean;
}

export async function recordUnitCompletionBatch({
  movie,
  episode,
  totalEpisodesCount,
  prevProgress,
}: RecordCompletionParams): Promise<RecordCompletionResult> {
  const unitId = getProgressUnitId(movie, episode);
  const nowIso = new Date().toISOString();
  const computed = computeTitleProgress({
    titleId: movie.id,
    titleType: movie.type,
    totalEpisodesCount,
    prevCompletedEpisodeIds: prevProgress?.completedEpisodeIds ?? [],
    newlyCompletedUnitId: unitId,
    lastSeasonId: episode?.seasonId ?? null,
    lastEpisodeId: episode?.id ?? null,
    updatedAt: nowIso,
  });

  return {
    progress: computed.progress,
    didCompleteTitle: computed.didCompleteTitle,
    achievementIssued: false,
  };
}

export async function ensureProgressDocForCompletedLibrary(
  _uid: string,
  _movie: MovieItem
): Promise<void> {}
