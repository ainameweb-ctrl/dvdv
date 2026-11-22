import type {
  BannerItem,
  CommentItem,
  CustomPage,
  EpisodeItem,
  GenreItem,
  MovieItem,
  SiteSettings,
  SubscriptionPlan,
} from '../types/streaming';
import { FULL_DEFAULT_SITE_SETTINGS } from './themePresets';

export const DEFAULT_SITE_SETTINGS: SiteSettings = FULL_DEFAULT_SITE_SETTINGS;

export const SEED_PAGES: CustomPage[] = [];

export const SEED_GENRES: GenreItem[] = [];

export const SEED_PLANS: SubscriptionPlan[] = [];

export const SEED_MOVIES: MovieItem[] = [];

export const SEED_EPISODES: Record<string, EpisodeItem[]> = {};

export const SEED_BANNERS: BannerItem[] = [];

export const SEED_COMMENTS: CommentItem[] = [];
