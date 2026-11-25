import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '@/store/hooks';
import { ALL_DISCUSSIONS, communityCategories, postCategories } from '@/data/community';
import {
  useCreateCommunityPostMutation,
  useCreateCommunityReplyMutation,
  useGetCommunityPostsQuery,
  useGetCommunityRepliesQuery,
  useToggleCommunityLikeMutation,
} from '@/store/api/baseApi';
import { AppCard } from '@/components/ui/shared/AppCard';
import { AppButton } from '@/components/ui/shared/AppButton';
import { getApiErrorMessage } from '@/utils/format';
import Toast from 'react-native-toast-message';

function formatPostDate(value?: string): string {
  if (!value) return 'Recently';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Recently'
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function PostReplies({ postId }: { postId: string }) {
  const { data: replies = [], isLoading, isError, refetch } = useGetCommunityRepliesQuery(postId);

  if (isLoading) {
    return <ActivityIndicator size="small" color="#2E5E52" style={{ marginBottom: 12 }} />;
  }
  if (isError) {
    return (
      <TouchableOpacity onPress={() => void refetch()} className="mb-3">
        <Text className="text-[12px] font-medium text-danger">
          Replies could not be loaded. Tap to try again.
        </Text>
      </TouchableOpacity>
    );
  }
  if (replies.length === 0) return null;

  return (
    <View className="gap-2.5 mb-3">
      {replies.map((rep) => (
        <View key={rep.id} className="rounded-2xl bg-canvas border border-line/70 p-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-[12px] font-bold text-ink">
              {rep.author}
            </Text>
            <Text className="text-[10px] text-ink-tertiary">{formatPostDate(rep.createdAt)}</Text>
          </View>
          <Text className="mt-1 text-[12px] leading-relaxed text-ink-secondary">{rep.content}</Text>
        </View>
      ))}
    </View>
  );
}

export default function CommunityTabScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState(ALL_DISCUSSIONS);
  const [expandedPostIds, setExpandedPostIds] = useState<Record<string, boolean>>({});
  const [likeOverrides, setLikeOverrides] = useState<Record<string, number>>({});
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

  // Reply Drafts
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});

  // Create Post Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState(postCategories[0]);
  const [newImageUrl, setNewImageUrl] = useState('');

  // Image Zoom Lightbox
  const [zoomedImageUri, setZoomedImageUri] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useGetCommunityPostsQuery({
    page: 1,
    category: category === ALL_DISCUSSIONS ? undefined : category,
    search: debouncedSearch,
  });
  const posts = data?.posts ?? [];

  const [createPost, { isLoading: isPosting }] = useCreateCommunityPostMutation();
  const [toggleLike] = useToggleCommunityLikeMutation();
  const [createReply, { isLoading: isReplying }] = useCreateCommunityReplyMutation();

  const requireSignIn = (message: string) => {
    Toast.show({ type: 'info', text1: 'Sign In Required', text2: message });
    router.push({ pathname: '/login', params: { redirect: '/(tabs)/community' } });
  };

  const toggleExpand = (postId: string) => {
    setExpandedPostIds((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handleLike = async (postId: string, currentLikes: number) => {
    if (!isAuthenticated || !user) {
      requireSignIn('Please sign in to mark posts as helpful.');
      return;
    }
    try {
      const updated = await toggleLike(postId).unwrap();
      setLikeOverrides((prev) => ({ ...prev, [postId]: updated.likes }));
      setLikedPosts((prev) => ({ ...prev, [postId]: updated.likes > currentLikes }));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could Not Update',
        text2: getApiErrorMessage(error, 'Please try again.'),
      });
    }
  };

  const handleOpenAskModal = () => {
    if (!isAuthenticated || !user) {
      requireSignIn('Please sign in to post questions or share suggestions in the community.');
      return;
    }

    setIsModalOpen(true);
  };

  const handleSubmitPost = async () => {
    if (isPosting) return;
    if (!newTitle.trim() || !newContent.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Missing Information',
        text2: 'Please enter a title and description for your question.',
      });
      return;
    }
    const image = newImageUrl.trim();
    if (image && !/^https:\/\//i.test(image)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Image Link',
        text2: 'Image links must start with https://',
      });
      return;
    }

    try {
      await createPost({
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        ...(image ? { image } : {}),
      }).unwrap();

      setNewTitle('');
      setNewContent('');
      setNewImageUrl('');
      setIsModalOpen(false);

      Toast.show({
        type: 'success',
        text1: 'Post Submitted',
        text2: 'Your post is waiting for moderator review.',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could Not Post',
        text2: getApiErrorMessage(error, 'Please try again.'),
      });
    }
  };

  const handleAddReply = async (postId: string) => {
    if (!isAuthenticated || !user) {
      requireSignIn('Please sign in to reply to community discussions.');
      return;
    }

    const text = (replyInputs[postId] || '').trim();
    if (!text || isReplying) return;

    try {
      await createReply({ postId, content: text }).unwrap();
      setReplyInputs((prev) => ({ ...prev, [postId]: '' }));
      Toast.show({
        type: 'success',
        text1: 'Reply Shared',
        text2: 'Thank you for replying.',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could Not Reply',
        text2: getApiErrorMessage(error, 'Please try again.'),
      });
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      {/* Top Bar */}
      <View className="flex-row items-center justify-between px-5 pb-3 pt-3 border-b border-line bg-surface">
        <View className="flex-row items-center gap-2.5">
          <View className="h-8 w-8 items-center justify-center rounded-xl bg-primary">
            <Ionicons name="chatbubbles" size={16} color="#FFFFFF" />
          </View>
          <View>
            <Text className="text-[14px] font-bold text-ink">Community Forum</Text>
            <Text className="text-[10px] font-semibold tracking-wider text-sage uppercase">
              Peer & Supporter Exchange
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleOpenAskModal}
          style={{ backgroundColor: '#2E5E52' }}
          className="flex-row items-center gap-1.5 rounded-xl px-3 py-1.5 shadow-xs active:opacity-90">
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text className="text-[12px] font-bold text-white">Create Post</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input (Clean, No Filters) */}
      <View className="px-5 py-3 bg-surface border-b border-line">
        <View className="flex-row items-center rounded-2xl bg-canvas border border-line px-3.5 py-2">
          <Ionicons name="search-outline" size={16} color="#6B7A75" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search discussions and questions..."
            placeholderTextColor="#9AA5A0"
            className="ml-2.5 flex-1 text-[13px] text-ink font-medium"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#9AA5A0" />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-2.5"
          contentContainerClassName="gap-2">
          {communityCategories.map((item) => {
            const active = item === category;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => setCategory(item)}
                className={`rounded-full border px-3 py-1.5 ${
                  active ? 'border-forest bg-primary' : 'border-line bg-canvas'
                }`}>
                <Text className={`text-[11.5px] font-semibold ${active ? 'text-white' : 'text-ink-secondary'}`}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Posts List */}
      <ScrollView
        className="flex-1 px-5"
        contentContainerClassName="pb-16 pt-4 gap-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => { void refetch(); }}
            tintColor="#2E5E52"
          />
        }>
        {isLoading ? (
          <ActivityIndicator size="large" color="#2E5E52" style={{ marginTop: 40 }} />
        ) : isError ? (
          <AppCard className="p-8 items-center text-center">
            <Ionicons name="cloud-offline-outline" size={32} color="#A9524A" />
            <Text className="mt-3 text-[16px] font-bold text-ink">Community unavailable</Text>
            <Text className="mt-1 text-[12.5px] text-ink-secondary text-center">
              Discussions could not be loaded right now.
            </Text>
            <TouchableOpacity
              onPress={() => void refetch()}
              className="mt-4 rounded-xl border border-line bg-surface px-4 py-2">
              <Text className="text-[12px] font-semibold text-ink">Try again</Text>
            </TouchableOpacity>
          </AppCard>
        ) : posts.length === 0 ? (
          <AppCard className="p-8 items-center text-center">
            <Ionicons name="search-outline" size={32} color="#9AA5A0" />
            <Text className="mt-3 text-[16px] font-bold text-ink">
              No discussions found
            </Text>
            <Text className="mt-1 text-[12.5px] text-ink-secondary text-center">
              {searchQuery || category !== ALL_DISCUSSIONS
                ? 'Try a different search or category.'
                : 'Be the first to start a discussion.'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setCategory(ALL_DISCUSSIONS);
              }}
              className="mt-4 rounded-xl border border-line bg-surface px-4 py-2">
              <Text className="text-[12px] font-semibold text-ink">Clear Search</Text>
            </TouchableOpacity>
          </AppCard>
        ) : (
          posts.map((post) => {
            const isExpanded = !!expandedPostIds[post.id];
            const likes = likeOverrides[post.id] ?? post.likes;
            const isLiked = !!likedPosts[post.id];
            return (
              <AppCard key={post.id} className="p-4 bg-surface border-line">
                {/* Header: Author & Time */}
                <View className="flex-row items-center gap-2.5">
                  <View className="h-8 w-8 items-center justify-center rounded-xl bg-mist">
                    <Text className="text-[12px] font-bold text-forest">
                      {post.author.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[13.5px] font-bold text-ink">
                      {post.author}
                    </Text>
                    <Text className="text-[11px] text-ink-tertiary">
                      {formatPostDate(post.createdAt)} · {post.category}
                    </Text>
                  </View>
                </View>

                {/* Question Title & Content */}
                <Text className="mt-3 text-[15.5px] font-bold text-ink leading-snug">
                  {post.title}
                </Text>
                <Text className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
                  {post.content}
                </Text>

                {/* Attached Image Thumbnail (if any) */}
                {post.imageUrl && (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setZoomedImageUri(post.imageUrl || null)}
                    className="mt-3 overflow-hidden rounded-2xl border border-line bg-black/5">
                    <Image
                      source={{ uri: post.imageUrl }}
                      className="h-44 w-full object-cover"
                    />
                    <View className="absolute bottom-2 right-2 flex-row items-center gap-1 rounded-full bg-black/60 px-2.5 py-1">
                      <Ionicons name="scan-outline" size={11} color="#FFFFFF" />
                      <Text className="text-[10px] font-semibold text-white">
                        Tap to zoom
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Post Footer Action Bar */}
                <View className="mt-4 flex-row items-center justify-between border-t border-line/60 pt-3">
                  <View className="flex-row items-center gap-2">
                    {/* Like Button */}
                    <TouchableOpacity
                      onPress={() => void handleLike(post.id, likes)}
                      className="flex-row items-center gap-1.5 rounded-full bg-canvas border border-line px-3 py-1 active:bg-elevated">
                      <Ionicons name={isLiked ? 'thumbs-up' : 'thumbs-up-outline'} size={13} color="#2E5E52" />
                      <Text className="text-[11.5px] font-bold text-forest">
                        {likes} Helpful
                      </Text>
                    </TouchableOpacity>

                    {/* Replies Toggle */}
                    <TouchableOpacity
                      onPress={() => toggleExpand(post.id)}
                      className="flex-row items-center gap-1 rounded-full bg-canvas border border-line px-3 py-1 active:bg-elevated">
                      <Ionicons name="chatbubble-outline" size={13} color="#6B7A75" />
                      <Text className="text-[11.5px] font-semibold text-ink-secondary">
                        {post.repliesCount} {post.repliesCount === 1 ? 'Answer' : 'Answers'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => toggleExpand(post.id)}
                    className="flex-row items-center gap-1">
                    <Text className="text-[11.5px] font-bold text-primary">
                      {isExpanded ? 'Hide' : 'View Thread'}
                    </Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={13}
                      color="#2E5E52"
                    />
                  </TouchableOpacity>
                </View>

                {/* Expandable Answers & Suggestion Thread */}
                {isExpanded && (
                  <View className="mt-3.5 border-t border-line/60 pt-3">
                    <PostReplies postId={post.id} />

                    {/* Inline Reply Input Box */}
                    <View className="flex-row items-center gap-2 rounded-2xl bg-canvas border border-line p-1.5 pl-3">
                      <TextInput
                        value={replyInputs[post.id] || ''}
                        onChangeText={(t) =>
                          setReplyInputs((prev) => ({ ...prev, [post.id]: t }))
                        }
                        placeholder="Write a supportive suggestion or reply..."
                        placeholderTextColor="#9AA5A0"
                        className="flex-1 text-[12px] text-ink font-medium"
                      />
                      <TouchableOpacity
                        onPress={() => void handleAddReply(post.id)}
                        disabled={isReplying}
                        style={{ backgroundColor: '#2E5E52' }}
                        className="rounded-xl px-3 py-2 shadow-xs active:opacity-90">
                        <Text className="text-[11.5px] font-bold text-white">
                          Reply
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </AppCard>
            );
          })
        )}
      </ScrollView>

      {/* Ask a Question Modal (Simple: Title, Context, Image) */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/60">
          <View className="rounded-t-3xl bg-surface p-5 pb-9 border-t border-line max-h-[90%]">
            <View className="flex-row items-center justify-between pb-3 border-b border-line">
              <View>
                <Text className="text-[17px] font-bold text-ink">
                  Create a Post
                </Text>
                <Text className="text-[11.5px] text-ink-secondary">
                  Share a question or helpful coping experience.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsModalOpen(false)}
                className="h-8 w-8 items-center justify-center rounded-full bg-canvas border border-line">
                <Ionicons name="close" size={17} color="#6B7A75" />
              </TouchableOpacity>
            </View>

            <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
              {/* Title Input */}
              <Text className="text-[11.5px] font-bold uppercase tracking-wider text-sage mb-1.5">
                Post Title
              </Text>
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="What is your question or reflection?"
                placeholderTextColor="#9AA5A0"
                className="rounded-2xl border border-line bg-canvas px-3.5 py-2.5 text-[13px] text-ink font-medium mb-3"
              />

              {/* Details Content Input */}
              <Text className="text-[11.5px] font-bold uppercase tracking-wider text-sage mb-1.5">
                Details & Story
              </Text>
              <TextInput
                value={newContent}
                onChangeText={setNewContent}
                placeholder="Share your thoughts, what you are experiencing, or what helped..."
                placeholderTextColor="#9AA5A0"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="h-28 rounded-2xl border border-line bg-canvas p-3.5 text-[13px] text-ink font-medium mb-3"
              />

              {/* Category */}
              <Text className="text-[11.5px] font-bold uppercase tracking-wider text-sage mb-1.5">
                Category
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-3">
                {postCategories.map((item) => {
                  const active = item === newCategory;
                  return (
                    <TouchableOpacity
                      key={item}
                      onPress={() => setNewCategory(item)}
                      className={`rounded-full border px-3 py-1.5 ${
                        active ? 'border-forest bg-primary' : 'border-line bg-canvas'
                      }`}>
                      <Text className={`text-[11.5px] font-semibold ${active ? 'text-white' : 'text-ink-secondary'}`}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Optional image link (the community API accepts public image URLs only) */}
              <View className="mb-4">
                <Text className="text-[11.5px] font-bold uppercase tracking-wider text-sage mb-1.5">
                  Image Link (Optional)
                </Text>
                <TextInput
                  value={newImageUrl}
                  onChangeText={setNewImageUrl}
                  placeholder="https://example.com/image.jpg"
                  placeholderTextColor="#9AA5A0"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  className="rounded-2xl border border-line bg-canvas px-3.5 py-2.5 text-[13px] text-ink font-medium"
                />
                {/^https:\/\//i.test(newImageUrl.trim()) && (
                  <Image
                    source={{ uri: newImageUrl.trim() }}
                    className="mt-2 h-36 w-full rounded-2xl"
                    resizeMode="cover"
                  />
                )}
              </View>

              <Text className="text-[11.5px] leading-4 text-ink-tertiary mb-3">
                Posts are reviewed by a moderator before they appear in the community.
              </Text>

              {/* Submit Button */}
              <AppButton
                onPress={() => void handleSubmitPost()}
                loading={isPosting}
                disabled={isPosting}
                style={{ backgroundColor: '#2E5E52' }}>
                Submit for Review
              </AppButton>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Lightbox Zoom Modal */}
      <Modal
        visible={!!zoomedImageUri}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setZoomedImageUri(null)}>
        <View className="flex-1 items-center justify-center bg-black/90 p-4">
          <TouchableOpacity
            onPress={() => setZoomedImageUri(null)}
            className="absolute top-12 right-6 h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {zoomedImageUri && (
            <Image
              source={{ uri: zoomedImageUri }}
              className="h-[75%] w-full rounded-2xl"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
