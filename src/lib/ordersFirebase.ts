import type {
  AdminLiveMetrics,
  BlogPostItem,
  BlogPostStatus,
  MovieItem,
  OrderItem,
  OrderPaymentMethod,
  OrderPaymentStatus,
  SubscriptionPlan,
  TitleStatus,
  UserPlan,
  UserProfile,
  UserRole,
} from '../types/streaming';
import { exportOrdersToCsv, roundCurrency } from '../utils/orders';
import { exportUsersToCsv } from '../utils/catalog';
import { sanitizeHtml } from '../utils/customization';
import type { Unsubscribe } from './firebase';

export type QueryDocumentSnapshot = unknown;

export interface PaginatedResult<T> {
  items: T[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

export async function createPendingOrder(params: {
  user: UserProfile;
  plan: SubscriptionPlan;
  paymentMethod?: OrderPaymentMethod;
  reference?: string | null;
}): Promise<OrderItem> {
  const { user, plan, paymentMethod = 'manual', reference } = params;
  const nowIso = new Date().toISOString();
  const cleanRef = reference?.trim().slice(0, 100) || null;
  return {
    id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId: user.uid,
    userEmail: user.email,
    userName: user.displayName,
    planId: plan.id,
    planName: plan.name,
    amount: roundCurrency(plan.pricePerMonth),
    currency: plan.currency.trim().toUpperCase(),
    paymentStatus: 'pending',
    paymentMethod,
    ...(cleanRef ? { reference: cleanRef } : {}),
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function subscribeToUserOrders(
  _uid: string,
  onData: (orders: OrderItem[]) => void,
  _onError?: (err: Error) => void
): Unsubscribe {
  onData([]);
  return () => undefined;
}

export function subscribeToPublishedPosts(
  onData: (posts: BlogPostItem[]) => void,
  _onError?: (err: Error) => void
): Unsubscribe {
  onData([]);
  return () => undefined;
}

export interface AdminAggregateSnapshot extends AdminLiveMetrics {
  premiumUsersCount: number;
  freeUsersCount: number;
}

export async function fetchAdminAggregateMetrics(): Promise<AdminAggregateSnapshot> {
  return {
    publishedTitles: 0,
    totalStudents: 0,
    newStudents7d: 0,
    premiumUsersCount: 0,
    freeUsersCount: 0,
    totalRevenue: 0,
    refundedTotal: 0,
    primaryCurrency: 'USD',
    newOrdersToday: 0,
    pendingOrdersCount: 0,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function subscribeToRecentPaidSales(
  onData: (orders: OrderItem[]) => void,
  _onError?: (err: Error) => void
): Unsubscribe {
  onData([]);
  return () => undefined;
}

export function subscribeToPendingOrders(
  onData: (count: number, pendingOrders: OrderItem[]) => void,
  _onError?: (err: Error) => void
): Unsubscribe {
  onData(0, []);
  return () => undefined;
}

export async function fetchOrdersPage(_options: {
  statusFilter?: OrderPaymentStatus | 'all';
  cursor?: QueryDocumentSnapshot | null;
  pageSize?: number;
}): Promise<PaginatedResult<OrderItem>> {
  return { items: [], lastDoc: null, hasMore: false };
}

export async function fetchUsersPage(_options: {
  roleFilter?: UserRole | 'all';
  planFilter?: UserPlan | 'all';
  cursor?: QueryDocumentSnapshot | null;
  pageSize?: number;
}): Promise<PaginatedResult<UserProfile>> {
  return { items: [], lastDoc: null, hasMore: false };
}

export async function exportOrdersCsvAndLog(_params: {
  statusFilter: OrderPaymentStatus | 'all';
  adminUid: string;
}): Promise<{ csv: string; count: number }> {
  return { csv: exportOrdersToCsv([]), count: 0 };
}

export async function exportUsersCsvAndLog(_params: {
  roleFilter: UserRole | 'all';
  planFilter: UserPlan | 'all';
  adminUid: string;
}): Promise<{ csv: string; count: number }> {
  return { csv: exportUsersToCsv([]), count: 0 };
}

export async function markOrderPaidBatch(params: {
  order: OrderItem;
  adminUid: string;
  paymentMethod: OrderPaymentMethod;
  reference?: string;
}): Promise<OrderItem> {
  const nowIso = new Date().toISOString();
  return {
    ...params.order,
    paymentStatus: 'paid',
    paymentMethod: params.paymentMethod,
    reference: params.reference?.trim().slice(0, 100) || null,
    paidAt: nowIso,
    updatedAt: nowIso,
  };
}

export async function markOrderFailedBatch(params: {
  order: OrderItem;
  adminUid: string;
  reference?: string;
}): Promise<OrderItem> {
  return {
    ...params.order,
    paymentStatus: 'failed',
    reference: params.reference?.trim().slice(0, 100) || params.order.reference || null,
    updatedAt: new Date().toISOString(),
  };
}

export async function retryFailedOrderBatch(params: {
  order: OrderItem;
  adminUid: string;
}): Promise<OrderItem> {
  return {
    ...params.order,
    paymentStatus: 'pending',
    updatedAt: new Date().toISOString(),
  };
}

export async function refundOrderBatch(params: {
  order: OrderItem;
  adminUid: string;
  reference?: string;
}): Promise<OrderItem> {
  return {
    ...params.order,
    paymentStatus: 'refunded',
    reference: params.reference?.trim().slice(0, 100) || params.order.reference || null,
    updatedAt: new Date().toISOString(),
  };
}

export async function createManualPaidOrderBatch(params: {
  user: UserProfile;
  plan: SubscriptionPlan;
  paymentMethod: OrderPaymentMethod;
  reference?: string;
  adminUid: string;
}): Promise<OrderItem> {
  const { user, plan, paymentMethod, reference } = params;
  const nowIso = new Date().toISOString();
  const cleanRef = reference?.trim().slice(0, 100) || null;
  return {
    id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId: user.uid,
    userEmail: user.email,
    userName: user.displayName,
    planId: plan.id,
    planName: plan.name,
    amount: roundCurrency(plan.pricePerMonth),
    currency: plan.currency.trim().toUpperCase(),
    paymentStatus: 'paid',
    paymentMethod,
    ...(cleanRef ? { reference: cleanRef } : {}),
    createdAt: nowIso,
    paidAt: nowIso,
    updatedAt: nowIso,
  };
}

export async function updateTitleStatusBatch(params: {
  movie: MovieItem;
  status: TitleStatus;
  adminUid: string;
}): Promise<MovieItem> {
  return { ...params.movie, status: params.status, updatedAt: new Date().toISOString() };
}

export async function updatePlanPricingBatch(params: {
  plan: SubscriptionPlan;
  pricePerMonth: number;
  currency: string;
  isActive: boolean;
  adminUid: string;
}): Promise<SubscriptionPlan> {
  return {
    ...params.plan,
    pricePerMonth: roundCurrency(params.pricePerMonth),
    currency: params.currency.trim().toUpperCase(),
    isActive: params.isActive,
    updatedAt: new Date().toISOString(),
  };
}

export async function updateAdminUserBatch(_params: {
  targetUid: string;
  updates: Partial<UserProfile>;
  adminUid: string;
  action: string;
}): Promise<void> {}

export async function deleteAdminUserBatch(_params: {
  targetUid: string;
  adminUid: string;
}): Promise<void> {}

export async function fetchBlogPostsPage(_options: {
  statusFilter?: BlogPostStatus | 'all';
  cursor?: QueryDocumentSnapshot | null;
  pageSize?: number;
}): Promise<PaginatedResult<BlogPostItem>> {
  return { items: [], lastDoc: null, hasMore: false };
}

export async function saveBlogPostBatch(params: {
  post: BlogPostItem;
  isNew: boolean;
  adminUid: string;
}): Promise<BlogPostItem> {
  const { post } = params;
  const nowIso = new Date().toISOString();
  return {
    ...post,
    title: post.title.trim().slice(0, 160),
    slug: post.slug.trim().slice(0, 100),
    excerpt: post.excerpt.trim().slice(0, 500),
    contentHtml: sanitizeHtml(post.contentHtml).slice(0, 50000),
    coverUrl: post.coverUrl?.trim() ? post.coverUrl.trim().slice(0, 1500) : null,
    updatedAt: nowIso,
    publishedAt: post.status === 'published' ? post.publishedAt || nowIso : null,
  };
}

export async function deleteBlogPostBatch(_params: {
  postId: string;
  adminUid: string;
}): Promise<void> {}
