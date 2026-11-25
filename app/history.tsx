import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '@/store/hooks';
import { formatSentDate } from '@/utils/format';
import { useGetMyMessagesQuery } from '@/store/api/baseApi';
import { AppButton } from '@/components/ui/shared/AppButton';
import { EmptyState, ErrorState } from '@/components/ui/shared/States';
import type { ShareStatus } from '@/types';

const STATUS_DISPLAY: Record<ShareStatus, { label: string; icon: keyof typeof Ionicons.glyphMap; ok: boolean }> = {
  PENDING_REVIEW: { label: 'In review', icon: 'time-outline', ok: true },
  QUEUED: { label: 'Sending', icon: 'paper-plane-outline', ok: true },
  SENT: { label: 'Delivered', icon: 'checkmark-circle-outline', ok: true },
  FAILED: { label: 'Failed', icon: 'close-circle-outline', ok: false },
  REJECTED: { label: 'Not approved', icon: 'close-circle-outline', ok: false },
};

export default function HistoryScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const {
    data: userDispatches = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useGetMyMessagesQuery(undefined, { skip: !isAuthenticated });

  const displayName = user?.name || 'Member';
  const displayEmail = user?.email || '';
  const dispatchCount = userDispatches.length;

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleGoBack}
          style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color="#18231F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send History</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {!isAuthenticated ? (
        <View style={styles.centerState}>
          <EmptyState
            title="Sign in to see your history"
            description="Messages you send from your account appear here with their review and delivery status."
          />
          <AppButton onPress={() => router.push({ pathname: '/login', params: { redirect: '/history' } })}>
            Sign in
          </AppButton>
        </View>
      ) : isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#2E5E52" />
        </View>
      ) : isError ? (
        <View style={styles.centerState}>
          <ErrorState
            title="History unavailable"
            description="Your send history could not be loaded."
            onRetry={() => void refetch()}
          />
        </View>
      ) : (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => { void refetch(); }}
            tintColor="#2E5E52"
          />
        }>
        <View style={styles.contentContainer}>
          {/* User Profile Summary Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileLeft}>
              <View style={[styles.avatarImage, styles.avatarInitial]}>
                <Text style={styles.avatarInitialText}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{displayName}</Text>
                <Text style={styles.profileEmail}>{displayEmail}</Text>
              </View>
            </View>

            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>
                {dispatchCount} {dispatchCount === 1 ? 'Dispatch' : 'Dispatches'}
              </Text>
            </View>
          </View>

          {/* Timeline Section */}
          <View style={styles.timelineSection}>
            <Text style={styles.sectionTitle}>Recent Dispatches</Text>
            {userDispatches.length === 0 && (
              <EmptyState
                title="No messages yet"
                description="When you send an anonymous message, it will appear here."
              />
            )}

            <View style={styles.timelineList}>
              {userDispatches.map((entry, index) => {
                const isLast = index === userDispatches.length - 1;
                const display = STATUS_DISPLAY[entry.status] ?? STATUS_DISPLAY.QUEUED;
                const isAccepted = display.ok;
                const formattedTime =
                  entry.formattedDate || formatSentDate(entry.sentAt);
                const extraCount =
                  entry.extraResourcesCount ?? entry.articles?.length ?? 0;

                return (
                  <View key={entry.id} style={styles.timelineItem}>
                    {/* Left Timeline Track */}
                    <View style={styles.nodeColumn}>
                      <View style={styles.nodeDot} />
                      {!isLast && <View style={styles.verticalLine} />}
                    </View>

                    {/* Dispatch Card */}
                    <View
                      style={[
                        styles.dispatchCard,
                        !isLast && styles.dispatchCardSpacing,
                      ]}>
                      {/* Top Row: Topic Name + Status */}
                      <View style={styles.cardHeader}>
                        <Text style={styles.topicName}>{entry.topicName}</Text>
                        <View
                          style={[
                            styles.statusPill,
                            isAccepted
                              ? styles.statusDelivered
                              : styles.statusFailed,
                          ]}>
                          <Ionicons
                            name={display.icon}
                            size={13}
                            color={isAccepted ? '#265346' : '#A9524A'}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              isAccepted
                                ? styles.statusTextDelivered
                                : styles.statusTextFailed,
                            ]}>
                            {display.label}
                          </Text>
                        </View>
                      </View>

                      {/* Recipient Details */}
                      <Text style={styles.recipientText}>
                        {entry.method === 'EMAIL' ? 'Email' : 'SMS'} ·{' '}
                        {entry.maskedRecipient}
                      </Text>

                      {/* Timestamp */}
                      <Text style={styles.timestampText}>{formattedTime}</Text>
                      {entry.status === 'REJECTED' && (
                        <Text style={styles.rejectionText}>
                          {entry.rejectionReason
                            ? `${entry.rejectionReason} Your package credit was returned.`
                            : 'Your package credit was returned.'}
                        </Text>
                      )}

                      {/* Extra Resources Attached Pill */}
                      {extraCount > 0 && (
                        <View style={styles.resourcePillContainer}>
                          <View style={styles.resourcePill}>
                            <Ionicons
                              name="layers-outline"
                              size={12}
                              color="#265346"
                            />
                            <Text style={styles.resourceText}>
                              {extraCount} extra resource{extraCount === 1 ? '' : 's'}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F8F4',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#18231F',
  },
  headerPlaceholder: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 36,
    alignItems: 'center',
  },
  contentContainer: {
    width: '100%',
    maxWidth: 420,
    gap: 20,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ECEFE8',
    ...Platform.select({
      ios: {
        shadowColor: '#18231F',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 3px 12px rgba(24, 35, 31, 0.04)',
      },
    }),
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  avatarInitial: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E5E52',
  },
  rejectionText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: '#A9524A',
  },
  avatarImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EBF3EE',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#18231F',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 12,
    color: '#6B7A75',
  },
  badgePill: {
    backgroundColor: '#EBF3EE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#34574C',
  },
  timelineSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#5B8678',
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  timelineList: {
    paddingLeft: 2,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  nodeColumn: {
    alignItems: 'center',
    width: 22,
    marginRight: 10,
    paddingTop: 16,
  },
  nodeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#265346',
  },
  verticalLine: {
    width: 1.5,
    flex: 1,
    minHeight: 120,
    backgroundColor: '#D8E2DC',
    marginTop: 6,
  },
  dispatchCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ECEFE8',
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#18231F',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 2px 10px rgba(24, 35, 31, 0.03)',
      },
    }),
  },
  dispatchCardSpacing: {
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  topicName: {
    fontSize: 15.5,
    fontWeight: '600',
    color: '#18231F',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  statusDelivered: {
    backgroundColor: '#EBF3EE',
  },
  statusFailed: {
    backgroundColor: '#FBECEB',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextDelivered: {
    color: '#265346',
  },
  statusTextFailed: {
    color: '#A9524A',
  },
  recipientText: {
    fontSize: 13,
    color: '#6B7A75',
  },
  timestampText: {
    fontSize: 11.5,
    color: '#98A49E',
  },
  resourcePillContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  resourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EDF5F0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resourceText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#285346',
  },
});
