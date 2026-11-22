import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  type User,
} from 'firebase/auth';
import type {
  ActivityLogItem,
  BannerItem,
  CommentItem,
  ContactMessage,
  CustomPage,
  EpisodeItem,
  GenreItem,
  MovieItem,
  ReportItem,
  SiteSettings,
  SubscriptionPlan,
  UserProfile,
  WatchHistoryItem,
  WatchlistItem,
} from '../types/streaming';
import { DEFAULT_SITE_SETTINGS } from '../data/seedCatalog';
import { mergeSiteSettings } from '../utils/customization';
import { mapFirebaseAuthError } from '../utils/authError';

const firebaseConfig = {
  apiKey: 'AIzaSyCaamGgKek0SOHfxqnU-00joLX-dA9DFh4',
  authDomain: 'ainame-76af5.firebaseapp.com',
  projectId: 'ainame-76af5',
  storageBucket: 'ainame-76af5.firebasestorage.app',
  messagingSenderId: '74950641528',
  appId: '1:74950641528:web:c08ec4344ec7c6519b6a8d',
  measurementId: 'G-62Z2BFRNMF',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

if (typeof window !== 'undefined') {
  isAnalyticsSupported()
    .then((supported) => {
      if (supported) getAnalytics(app);
    })
    .catch(() => undefined);
}

export const BOOTSTRAPPED_ADMIN_EMAIL = 'krushnachaware84@gmail.com';
export const BOOTSTRAPPED_ADMIN_EMAILS = [
  'krushnachaware84@gmail.com',
  'ainameweb@gmail.com',
] as const;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export type Unsubscribe = () => void;

export function isBootstrappedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return (BOOTSTRAPPED_ADMIN_EMAILS as readonly string[]).includes(email.toLowerCase());
}

export function isUserAdmin(profile: UserProfile | null, authUser: User | null): boolean {
  if (!authUser) return false;
  if (isBootstrappedAdminEmail(authUser.email) && authUser.emailVerified) return true;
  if (profile?.status === 'banned') return false;
  return profile?.role === 'admin';
}

export function buildUserFromAuth(user: User): UserProfile {
  const isBootstrapAdmin = isBootstrappedAdminEmail(user.email) && user.emailVerified;
  return {
    uid: user.uid,
    displayName: user.displayName || user.email?.split('@')[0] || 'Member',
    email: user.email || '',
    photoURL: user.photoURL || '',
    role: isBootstrapAdmin ? 'admin' : 'user',
    status: 'active',
    plan: isBootstrapAdmin ? 'premium' : 'free',
    subscriptionPlanId: null,
    subscriptionPlanName: null,
    planExpiresAt: null,
    createdAt: user.metadata.creationTime || new Date().toISOString(),
    lastLoginAt: user.metadata.lastSignInTime || new Date().toISOString(),
  };
}

// --- Firebase Authentication (Auth Only — no Firestore/Storage/profile persistence) ---

export async function signInWithGooglePopup(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error, 'signin'));
  }
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error, 'signin'));
  }
}

export async function registerWithEmail(
  email: string,
  password: string,
  _displayName?: string
): Promise<User> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error, 'signup'));
  }
}

export async function sendResetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error, 'other'));
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function updateCurrentUserPassword(newPassword: string): Promise<void> {
  if (!auth.currentUser) throw new Error('Something went wrong. Please try again.');
  try {
    await updatePassword(auth.currentUser, newPassword);
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error, 'other'));
  }
}

export async function deleteCurrentUserAccount(): Promise<void> {
  const current = auth.currentUser;
  if (!current) throw new Error('Something went wrong. Please try again.');
  try {
    await deleteUser(current);
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error, 'other'));
  }
}

export async function syncUserProfileOnLogin(user: User): Promise<UserProfile> {
  return buildUserFromAuth(user);
}

export async function updateOwnUserProfile(
  _uid: string,
  _updates: { displayName?: string; photoURL?: string }
): Promise<void> {
  // Firebase Authentication only: do not create or save user profile data anywhere.
}

export async function uploadFileWithProgress(
  _storagePath: string,
  _file: File,
  _onProgress?: (pct: number) => void
): Promise<string> {
  throw new Error('Firebase Storage is disabled in Authentication-only mode.');
}

export async function deleteStorageFileByUrl(_url?: string | null): Promise<void> {
  // No-op: Storage is disabled
}

// --- Clean Empty In-Memory Fallbacks (No Firestore) ---

export async function fetchSiteSettings(): Promise<SiteSettings> {
  return mergeSiteSettings(DEFAULT_SITE_SETTINGS);
}

export async function fetchPublishedPages(): Promise<CustomPage[]> {
  return [];
}

export async function createContactMessage(
  msg: Omit<ContactMessage, 'id' | 'status' | 'createdAt'>
): Promise<ContactMessage> {
  return {
    id: `msg-${Date.now()}`,
    name: msg.name.trim().slice(0, 100),
    email: msg.email.trim().slice(0, 200),
    subject: msg.subject.trim().slice(0, 160),
    message: msg.message.trim().slice(0, 3000),
    pageSlug: (msg.pageSlug || 'contact').slice(0, 80),
    status: 'unread',
    createdAt: new Date().toISOString(),
  };
}

export async function fetchPublishedCatalog(_maxCount = 60): Promise<{
  movies: MovieItem[];
  genres: GenreItem[];
  banners: BannerItem[];
  plans: SubscriptionPlan[];
  fromSeed: boolean;
}> {
  return {
    movies: [],
    genres: [],
    banners: [],
    plans: [],
    fromSeed: false,
  };
}

export function subscribeToSiteSettings(
  onData: (settings: SiteSettings) => void,
  _onError?: (err: Error) => void
): Unsubscribe {
  onData(mergeSiteSettings(DEFAULT_SITE_SETTINGS));
  return () => undefined;
}

export function subscribeToPublishedMovies(
  _maxCount: number,
  onData: (movies: MovieItem[]) => void,
  _onError?: (err: Error) => void
): Unsubscribe {
  onData([]);
  return () => undefined;
}

export function subscribeToGenres(
  onData: (genres: GenreItem[]) => void,
  _onError?: (err: Error) => void
): Unsubscribe {
  onData([]);
  return () => undefined;
}

export function subscribeToActiveBanners(
  onData: (banners: BannerItem[]) => void,
  _onError?: (err: Error) => void
): Unsubscribe {
  onData([]);
  return () => undefined;
}

export function subscribeToActivePlans(
  onData: (plans: SubscriptionPlan[]) => void,
  _onError?: (err: Error) => void
): Unsubscribe {
  onData([]);
  return () => undefined;
}

export function subscribeToPublishedPages(
  onData: (pages: CustomPage[]) => void,
  _onError?: (err: Error) => void
): Unsubscribe {
  onData([]);
  return () => undefined;
}

export async function cancelUserSubscription(_uid: string): Promise<void> {
  // No-op: Firestore disabled
}

export async function fetchSeriesEpisodes(_seriesId: string): Promise<EpisodeItem[]> {
  return [];
}

export async function fetchUserPersonalData(_uid: string): Promise<{
  watchlist: WatchlistItem[];
  history: WatchHistoryItem[];
  ratings: Record<string, number>;
  likes: string[];
}> {
  return { watchlist: [], history: [], ratings: {}, likes: [] };
}

export async function mergeGuestDataOnFirstSignIn(
  _uid: string,
  _moviesMap: Record<string, MovieItem>,
  remotePersonal: {
    watchlist: WatchlistItem[];
    history: WatchHistoryItem[];
  }
): Promise<{
  merged: boolean;
  watchlist: WatchlistItem[];
  history: WatchHistoryItem[];
}> {
  return {
    merged: false,
    watchlist: remotePersonal.watchlist,
    history: remotePersonal.history,
  };
}

export async function toggleUserWatchlist(
  _uid: string,
  _movieId: string,
  _add: boolean
): Promise<void> {}

export async function saveUserWatchHistory(
  _uid: string,
  _item: WatchHistoryItem
): Promise<void> {}

export async function removeUserHistoryItem(_uid: string, _movieId: string): Promise<void> {}

export async function clearUserHistory(_uid: string, _movieIds: string[]): Promise<void> {}

export async function saveUserRating(
  _uid: string,
  _movieId: string,
  _rating: number
): Promise<void> {}

export async function toggleUserLike(
  _uid: string,
  _movieId: string,
  _like: boolean
): Promise<void> {}

export async function incrementMovieViews(_movieId: string): Promise<void> {}

export async function fetchMovieComments(_movieId: string): Promise<CommentItem[]> {
  return [];
}

export async function createComment(comment: Omit<CommentItem, 'id'>): Promise<CommentItem> {
  return { id: `cmt-${Date.now()}`, ...comment };
}

export async function deleteCommentDoc(_commentId: string): Promise<void> {}

export async function createReportDoc(
  _report: Omit<ReportItem, 'id' | 'status' | 'createdAt'>
): Promise<void> {}

export async function logAdminAction(
  _adminUid: string,
  _action: string,
  _targetId: string
): Promise<void> {}

export async function fetchAllAdminData(): Promise<{
  movies: MovieItem[];
  genres: GenreItem[];
  banners: BannerItem[];
  users: UserProfile[];
  comments: CommentItem[];
  reports: ReportItem[];
  logs: ActivityLogItem[];
  plans: SubscriptionPlan[];
  pages: CustomPage[];
  messages: ContactMessage[];
  settings: SiteSettings;
}> {
  return {
    movies: [],
    genres: [],
    banners: [],
    users: [],
    comments: [],
    reports: [],
    logs: [],
    plans: [],
    pages: [],
    messages: [],
    settings: mergeSiteSettings(DEFAULT_SITE_SETTINGS),
  };
}

export async function saveMovieDoc(
  _movie: MovieItem,
  _adminUid: string,
  _isNew: boolean
): Promise<void> {}

export async function deleteMovieDoc(_movieId: string, _adminUid: string): Promise<void> {}

export async function saveEpisodeDoc(_episode: EpisodeItem, _adminUid: string): Promise<void> {}

export async function clearEpisodeAccessOverride(
  _seriesId: string,
  _seasonId: string,
  _episodeId: string,
  _adminUid: string
): Promise<void> {}

export async function deleteEpisodeDoc(
  _seriesId: string,
  _seasonId: string,
  _episodeId: string,
  _adminUid: string
): Promise<void> {}

export async function saveGenreDoc(_genre: GenreItem, _adminUid: string): Promise<void> {}

export async function deleteGenreDoc(_genreId: string, _adminUid: string): Promise<void> {}

export async function saveBannerDoc(_banner: BannerItem, _adminUid: string): Promise<void> {}

export async function deleteBannerDoc(_bannerId: string, _adminUid: string): Promise<void> {}

export async function updateAdminUserDoc(
  _targetUid: string,
  _updates: Partial<UserProfile>,
  _adminUid: string
): Promise<void> {}

export async function deleteAdminUserDoc(_targetUid: string, _adminUid: string): Promise<void> {}

export async function toggleCommentVisibility(
  _commentId: string,
  _isHidden: boolean,
  _adminUid: string
): Promise<void> {}

export async function adminDeleteCommentDoc(_commentId: string, _adminUid: string): Promise<void> {}

export async function updateReportStatus(
  _reportId: string,
  _status: 'open' | 'resolved' | 'dismissed',
  _adminUid: string
): Promise<void> {}

export async function saveSiteSettingsDoc(
  _settings: SiteSettings,
  _adminUid: string
): Promise<void> {}

export async function savePlanDoc(
  _plan: SubscriptionPlan,
  _adminUid: string,
  _isNew: boolean
): Promise<void> {}

export async function deletePlanDoc(_planId: string, _adminUid: string): Promise<void> {}

export async function saveCustomPageDoc(
  _page: CustomPage,
  _adminUid: string,
  _isNew: boolean
): Promise<void> {}

export async function deleteCustomPageDoc(_pageId: string, _adminUid: string): Promise<void> {}

export async function updateContactMessageStatus(
  _msgId: string,
  _status: 'unread' | 'read' | 'archived' | 'resolved',
  _adminUid: string
): Promise<void> {}

export async function deleteContactMessageDoc(_msgId: string, _adminUid: string): Promise<void> {}

export async function resetCatalogAndSettingsToDefaults(_adminUid: string): Promise<void> {}
