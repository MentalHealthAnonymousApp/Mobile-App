import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { topics as topicTemplates } from '@/data/topics';
import type {
  Article,
  CheckoutSessionResult,
  CheckoutStatus,
  CommunityPostItem,
  CommunityReplyItem,
  CreateSharePayload,
  CreateShareResponse,
  HistoryEntry,
  PackageCredit,
  PackagePrice,
  PackageTierId,
  ShareStatus,
  Topic,
  TopicTone,
} from '@/types';
import {
  backendPage,
  backendRequest,
  BackendApiError,
  type PageMeta,
} from '@/utils/backendApi';

interface ApiTopic {
  _id: string;
  slug: string;
  name: string;
  shortDescription: string;
  tone?: string;
  icon?: string;
}

interface ApiResource {
  _id: string;
  slug?: string;
  title: string;
  shortDescription?: string;
  readingTime?: number;
}

function mapTopic(item: ApiTopic): Topic {
  const template = topicTemplates.find(
    (topic) =>
      topic.id === item.slug ||
      topic.name.trim().toLowerCase() === item.name.trim().toLowerCase()
  );
  if (template) {
    return { ...template, apiId: item._id, slug: item.slug, name: item.name };
  }

  const tones: TopicTone[] = ['mist', 'lavender', 'sky', 'sand', 'blush'];
  return {
    id: item.slug,
    apiId: item._id,
    slug: item.slug,
    name: item.name,
    shortDescription: item.shortDescription || item.name,
    intro: item.shortDescription || item.name,
    packetTitle: item.name,
    packetItems: [item.shortDescription || item.name],
    tone: tones.includes(item.tone as TopicTone) ? (item.tone as TopicTone) : 'mist',
    icon: item.icon || 'heart',
  };
}

function mapResource(item: ApiResource, topicId: string): Article {
  const websiteUrl =
    process.env.EXPO_PUBLIC_WEBSITE_URL?.trim().replace(/\/+$/, '') ||
    'https://mentalhealthanonymous.org';
  return {
    id: item._id,
    topicId,
    slug: item.slug,
    title: item.title,
    excerpt: item.shortDescription || '',
    readTime: `${item.readingTime || 5} min read`,
    category: 'Mental health resource',
    url: `${websiteUrl}/resources/${encodeURIComponent(item.slug || item._id)}`,
  };
}

interface ApiMessage {
  _id: string;
  channel: 'email' | 'sms';
  maskedRecipient?: string;
  status: 'pending' | 'approved' | 'rejected' | 'delivered';
  deliveryStatus?: 'queued' | 'delivered' | 'failed';
  rejectionReason?: string;
  submittedAt?: string;
  createdAt?: string;
  topic?: { _id?: string; name?: string; slug?: string } | string | null;
  articles?: Array<{ _id: string; title?: string; slug?: string } | string>;
}

function messageStatus(item: ApiMessage): ShareStatus {
  if (item.status === 'pending') return 'PENDING_REVIEW';
  if (item.status === 'rejected') return 'REJECTED';
  if (item.deliveryStatus === 'failed') return 'FAILED';
  if (item.status === 'delivered' || item.deliveryStatus === 'delivered') return 'SENT';
  return 'QUEUED';
}

function mapMessage(item: ApiMessage): HistoryEntry {
  const topic = typeof item.topic === 'object' && item.topic ? item.topic : undefined;
  return {
    id: item._id,
    topicId: topic?.slug || topic?._id || '',
    topicName: topic?.name || 'Support message',
    extraResourcesCount: item.articles?.length ?? 0,
    method: item.channel === 'sms' ? 'SMS' : 'EMAIL',
    maskedRecipient: item.maskedRecipient || 'Hidden recipient',
    sentAt: item.submittedAt || item.createdAt || new Date().toISOString(),
    status: messageStatus(item),
    rejectionReason: item.rejectionReason,
  };
}

type ApiAuthor = { fullName?: string; firstName?: string; lastName?: string } | string | null;

interface ApiCommunityPost {
  _id: string;
  title: string;
  content: string;
  category: string;
  image?: string;
  likesCount?: number;
  repliesCount?: number;
  isPinned?: boolean;
  createdAt?: string;
  author?: ApiAuthor;
}

interface ApiCommunityReply {
  _id: string;
  content: string;
  createdAt?: string;
  author?: ApiAuthor;
}

function authorName(author: ApiAuthor | undefined): string {
  if (!author || typeof author === 'string') return 'Community Member';
  return (
    author.fullName?.trim() ||
    `${author.firstName || ''} ${author.lastName || ''}`.trim() ||
    'Community Member'
  );
}

function mapCommunityPost(item: ApiCommunityPost): CommunityPostItem {
  return {
    id: item._id,
    author: authorName(item.author),
    title: item.title,
    content: item.content,
    category: item.category,
    imageUrl: item.image || undefined,
    createdAt: item.createdAt,
    likes: item.likesCount ?? 0,
    repliesCount: item.repliesCount ?? 0,
    isPinned: item.isPinned,
  };
}

function mapCommunityReply(item: ApiCommunityReply): CommunityReplyItem {
  return {
    id: item._id,
    author: authorName(item.author),
    content: item.content,
    createdAt: item.createdAt,
  };
}

const jsonRequest = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
});

function errorResult(error: unknown) {
  return {
    error: {
      status: error instanceof BackendApiError ? error.status : 500,
      data:
        error instanceof Error
          ? error.message
          : 'The request could not be completed.',
    },
  };
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Topics', 'Resources', 'Share', 'Credits', 'History', 'Community'],
  endpoints: (builder) => ({
    getTopics: builder.query<Topic[], void>({
      queryFn: async () => {
        try {
          const result = await backendRequest<ApiTopic[]>(
            'topic?page=1&limit=100&sortBy=name&sortOrder=asc'
          );
          return { data: result.map(mapTopic) };
        } catch (error) {
          return errorResult(error);
        }
      },
      providesTags: ['Topics'],
    }),

    getTopicById: builder.query<Topic, string>({
      queryFn: async (id) => {
        try {
          const result = await backendRequest<ApiTopic>(
            `topic/${encodeURIComponent(id)}`
          );
          return { data: mapTopic(result) };
        } catch (error) {
          return errorResult(error);
        }
      },
      providesTags: (_result, _error, id) => [{ type: 'Topics', id }],
    }),

    getResourcesByTopicId: builder.query<Article[], { apiId: string; topicId: string }>({
      queryFn: async ({ apiId, topicId }) => {
        try {
          const result = await backendRequest<ApiResource[]>(
            `resource?status=published&page=1&limit=100&topic=${encodeURIComponent(apiId)}`
          );
          return { data: result.map((resource) => mapResource(resource, topicId)) };
        } catch (error) {
          return errorResult(error);
        }
      },
      providesTags: (_result, _error, { apiId }) => [{ type: 'Resources', id: apiId }],
    }),

    createAnonymousShare: builder.mutation<CreateShareResponse, CreateSharePayload>({
      queryFn: async ({ idempotencyKey, ...payload }) => {
        try {
          const result = await backendRequest<{
            messageId: string;
            status: 'pending' | 'queued' | 'delivered';
          }>(
            'message',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': idempotencyKey,
              },
              body: JSON.stringify(payload),
            },
            true
          );
          return {
            data: {
              success: true,
              messageId: result.messageId,
              status:
                result.status === 'pending'
                  ? 'PENDING_REVIEW'
                  : result.status === 'delivered'
                    ? 'SENT'
                    : 'QUEUED',
            },
          };
        } catch (error) {
          return errorResult(error);
        }
      },
      invalidatesTags: ['Share', 'Credits', 'History'],
    }),

    getPackagePrices: builder.query<PackagePrice[], void>({
      queryFn: async () => {
        try {
          return { data: await backendRequest<PackagePrice[]>('package-purchase/prices') };
        } catch (error) {
          return errorResult(error);
        }
      },
    }),

    getMyCredits: builder.query<PackageCredit[], void>({
      queryFn: async () => {
        try {
          return {
            data: await backendRequest<PackageCredit[]>('package-purchase/my-credits', {}, true),
          };
        } catch (error) {
          return errorResult(error);
        }
      },
      providesTags: ['Credits'],
    }),

    createCheckoutSession: builder.mutation<CheckoutSessionResult, PackageTierId>({
      queryFn: async (packageTier) => {
        try {
          return {
            data: await backendRequest<CheckoutSessionResult>(
              'package-purchase/checkout-session',
              jsonRequest('POST', { packageTier, returnTo: 'app' }),
              true
            ),
          };
        } catch (error) {
          return errorResult(error);
        }
      },
    }),

    getCheckoutStatus: builder.query<CheckoutStatus, string>({
      queryFn: async (sessionId) => {
        try {
          return {
            data: await backendRequest<CheckoutStatus>(
              `package-purchase/session/${encodeURIComponent(sessionId)}`,
              {},
              true
            ),
          };
        } catch (error) {
          return errorResult(error);
        }
      },
    }),

    getMyMessages: builder.query<HistoryEntry[], void>({
      queryFn: async () => {
        try {
          const result = await backendPage<ApiMessage>(
            'message/my-messages?page=1&limit=100',
            {},
            true
          );
          return { data: result.data.map(mapMessage) };
        } catch (error) {
          return errorResult(error);
        }
      },
      providesTags: ['History'],
    }),

    getCommunityPosts: builder.query<
      { posts: CommunityPostItem[]; meta: PageMeta },
      { page: number; category?: string; search?: string }
    >({
      queryFn: async ({ page, category, search }) => {
        try {
          const params = new URLSearchParams({ page: String(page), limit: '50' });
          if (category) params.set('category', category);
          if (search?.trim()) params.set('searchTerm', search.trim());
          const result = await backendPage<ApiCommunityPost>(`community?${params.toString()}`);
          return { data: { posts: result.data.map(mapCommunityPost), meta: result.meta } };
        } catch (error) {
          return errorResult(error);
        }
      },
      providesTags: ['Community'],
    }),

    getCommunityReplies: builder.query<CommunityReplyItem[], string>({
      queryFn: async (postId) => {
        try {
          const result = await backendPage<ApiCommunityReply>(
            `community/${encodeURIComponent(postId)}/replies?page=1&limit=100`
          );
          return { data: result.data.map(mapCommunityReply) };
        } catch (error) {
          return errorResult(error);
        }
      },
      providesTags: (_result, _error, postId) => [{ type: 'Community', id: `replies-${postId}` }],
    }),

    createCommunityPost: builder.mutation<
      CommunityPostItem,
      { title: string; content: string; category: string; image?: string }
    >({
      queryFn: async (body) => {
        try {
          const result = await backendRequest<ApiCommunityPost>(
            'community',
            jsonRequest('POST', body),
            true
          );
          return { data: mapCommunityPost(result) };
        } catch (error) {
          return errorResult(error);
        }
      },
    }),

    toggleCommunityLike: builder.mutation<CommunityPostItem, string>({
      queryFn: async (postId) => {
        try {
          const result = await backendRequest<ApiCommunityPost>(
            `community/${encodeURIComponent(postId)}/like`,
            jsonRequest('POST'),
            true
          );
          return { data: mapCommunityPost(result) };
        } catch (error) {
          return errorResult(error);
        }
      },
    }),

    createCommunityReply: builder.mutation<
      CommunityReplyItem,
      { postId: string; content: string }
    >({
      queryFn: async ({ postId, content }) => {
        try {
          const result = await backendRequest<ApiCommunityReply>(
            `community/${encodeURIComponent(postId)}/replies`,
            jsonRequest('POST', { content }),
            true
          );
          return { data: mapCommunityReply(result) };
        } catch (error) {
          return errorResult(error);
        }
      },
      invalidatesTags: (_result, _error, { postId }) => [
        { type: 'Community', id: `replies-${postId}` },
      ],
    }),
  }),
});

export const {
  useGetTopicsQuery,
  useGetTopicByIdQuery,
  useGetResourcesByTopicIdQuery,
  useCreateAnonymousShareMutation,
  useGetPackagePricesQuery,
  useGetMyCreditsQuery,
  useCreateCheckoutSessionMutation,
  useLazyGetCheckoutStatusQuery,
  useGetMyMessagesQuery,
  useGetCommunityPostsQuery,
  useGetCommunityRepliesQuery,
  useCreateCommunityPostMutation,
  useToggleCommunityLikeMutation,
  useCreateCommunityReplyMutation,
} = baseApi;
