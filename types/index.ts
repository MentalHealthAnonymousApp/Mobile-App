export type TopicId =
  | 'anxiety'
  | 'depression'
  | 'stress-burnout'
  | 'substance-abuse'
  | 'grief-loss'
  | 'dementia'
  | 'trauma'
  | 'eating-disorders';

export type TopicTone = 'mist' | 'lavender' | 'sky' | 'sand' | 'blush';

export interface Topic {
  id: string;
  apiId?: string;
  slug?: string;
  name: string;
  shortDescription: string;
  intro: string;
  packetTitle: string;
  packetItems: string[];
  tone: TopicTone;
  icon: string;
}

export interface Article {
  id: string;
  topicId: string;
  slug?: string;
  title: string;
  excerpt: string;
  readTime: string;
  category: string;
  url: string;
  featured?: boolean;
}

export type DeliveryMethod = 'EMAIL' | 'SMS';

export type ShareStatus = 'PENDING_REVIEW' | 'QUEUED' | 'SENT' | 'FAILED' | 'REJECTED';

export interface Recipient {
  method: DeliveryMethod;
  name?: string;
  email?: string;
  countryCode?: string;
  phone?: string;
}

export interface CreateSharePayload {
  topic: string;
  channel: 'email' | 'sms';
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  customNote?: string;
  articles: string[];
  senderAttestation: true;
  packagePurchaseId: string;
  idempotencyKey: string;
}

export interface CreateShareResponse {
  success: boolean;
  messageId: string;
  status: ShareStatus;
}

export interface MobileUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  avatarColor?: string;
}

export interface HistoryEntry {
  id: string;
  userId?: string;
  userEmail?: string;
  topicId: string;
  topicName: string;
  articles?: Article[];
  extraResourcesCount?: number;
  method: DeliveryMethod;
  maskedRecipient: string;
  sentAt: string;
  formattedDate?: string;
  status: ShareStatus;
  rejectionReason?: string;
}

export interface PackageTier {
  id: string;
  name: string;
  price: number;
  currency: string;
  badge?: string;
  popular?: boolean;
  tagline: string;
  description: string;
  features: string[];
  ctaLabel: string;
}

export type PackageTierId = 'basic' | 'standard' | 'premium';

export interface PackagePrice {
  tier: PackageTierId;
  available: boolean;
  amountMinor: number | null;
  currency: string | null;
}

/** A paid package that has not been used to send a message yet. */
export interface PackageCredit {
  purchaseId: string;
  packageTier: PackageTierId;
  paidAt?: string;
}

export interface CheckoutSessionResult {
  checkoutUrl: string;
  sessionId: string;
}

export interface CheckoutStatus {
  purchaseId: string;
  packageTier: PackageTierId;
  amountMinor: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'canceled' | 'refunded' | 'partially_refunded' | 'disputed';
  fulfillmentStatus: 'pending' | 'fulfilled' | 'failed';
  messageId?: string;
}

export interface CommunityPostItem {
  id: string;
  author: string;
  title: string;
  content: string;
  category: string;
  imageUrl?: string;
  createdAt?: string;
  likes: number;
  repliesCount: number;
  isPinned?: boolean;
}

export interface CommunityReplyItem {
  id: string;
  author: string;
  content: string;
  createdAt?: string;
}
