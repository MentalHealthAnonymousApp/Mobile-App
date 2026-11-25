import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { ScreenWrapper } from '@/components/ui/layouts/ScreenWrapper';
import { AppHeader } from '@/components/ui/shared/AppHeader';
import { PrivacyNotice } from '@/components/ui/shared/PrivacyNotice';
import { PackageCard } from '@/components/package/PackageCard';
import { PACKAGES } from '@/data/packages';
import {
  useCreateCheckoutSessionMutation,
  useGetMyCreditsQuery,
  useGetPackagePricesQuery,
} from '@/store/api/baseApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setCredit } from '@/store/slices/shareSlice';
import { formatPrice, getApiErrorMessage, getApiErrorStatus } from '@/utils/format';
import type { PackageCredit, PackageTierId } from '@/types';

const TIER_NAMES: Record<PackageTierId, string> = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
};

export default function PackagesScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const selectedTopic = useAppSelector((state) => state.share.selectedTopic);

  const { data: prices } = useGetPackagePricesQuery();
  const {
    data: credits = [],
    isLoading: creditsLoading,
    isError: creditsFailed,
    refetch: refetchCredits,
  } = useGetMyCreditsQuery(undefined, { skip: !isAuthenticated });
  const [createCheckout] = useCreateCheckoutSessionMutation();
  const [pendingTier, setPendingTier] = useState<PackageTierId | null>(null);

  // Credits change after a purchase completes, so refresh whenever the screen is shown.
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) void refetchCredits();
    }, [isAuthenticated, refetchCredits])
  );

  const continueWithCredit = (credit: PackageCredit) => {
    dispatch(setCredit(credit));
    router.replace(selectedTopic ? '/send/recipient' : '/(tabs)/topics');
  };

  const handleBuy = async (tier: PackageTierId) => {
    if (pendingTier) return;
    if (!isAuthenticated) {
      Toast.show({
        type: 'info',
        text1: 'Sign In Required',
        text2: 'Sign in before buying a package.',
      });
      router.push({ pathname: '/login', params: { redirect: '/packages' } });
      return;
    }

    setPendingTier(tier);
    try {
      const session = await createCheckout(tier).unwrap();
      router.replace({
        pathname: '/packages/status',
        params: { sessionId: session.sessionId, checkoutUrl: session.checkoutUrl },
      });
    } catch (error) {
      if (getApiErrorStatus(error) === 401) {
        router.push({ pathname: '/login', params: { redirect: '/packages' } });
      }
      Toast.show({
        type: 'error',
        text1: 'Checkout Unavailable',
        text2: getApiErrorMessage(error, 'Could not start checkout. Please try again.'),
      });
    } finally {
      setPendingTier(null);
    }
  };

  return (
    <ScreenWrapper header={<AppHeader title="Packages" />}>
      <Text className="text-[24px] font-bold text-ink">Choose a package</Text>
      <Text className="mt-1.5 text-[13.5px] leading-5 text-ink-secondary">
        Each package is a one-time payment for one anonymous message. No subscriptions.
      </Text>

      {isAuthenticated && (
        <View className="mt-5">
          {creditsLoading ? (
            <View className="flex-row items-center gap-2 rounded-2xl border border-line bg-surface p-4">
              <ActivityIndicator size="small" color="#2E5E52" />
              <Text className="text-[13px] text-ink-secondary">Checking for unused credits…</Text>
            </View>
          ) : creditsFailed ? (
            <TouchableOpacity
              onPress={() => void refetchCredits()}
              className="rounded-2xl border border-danger/30 bg-danger-soft p-4">
              <Text className="text-[13px] font-medium text-danger">
                Your credits could not be loaded. Tap to try again.
              </Text>
            </TouchableOpacity>
          ) : credits.length > 0 ? (
            <View className="rounded-2xl border border-forest bg-primary-tint p-4">
              <Text className="text-[14px] font-bold text-ink">
                You have {credits.length} unused message credit{credits.length === 1 ? '' : 's'}
              </Text>
              <View className="mt-3 gap-2">
                {credits.map((credit) => (
                  <TouchableOpacity
                    key={credit.purchaseId}
                    activeOpacity={0.8}
                    onPress={() => continueWithCredit(credit)}
                    className="flex-row items-center justify-between rounded-xl border border-line bg-surface px-3.5 py-3">
                    <Text className="text-[13.5px] font-semibold text-ink">
                      {TIER_NAMES[credit.packageTier] ?? credit.packageTier} package
                    </Text>
                    <View className="flex-row items-center gap-1">
                      <Text className="text-[13px] font-semibold text-forest">Use this credit</Text>
                      <Ionicons name="arrow-forward" size={14} color="#2E5E52" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      )}

      <View className="mt-5 w-full gap-3.5">
        {PACKAGES.map((pkg) => {
          const tier = pkg.id as PackageTierId;
          const livePrice = prices?.find((price) => price.tier === tier);
          return (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              priceLabel={formatPrice(livePrice?.amountMinor, livePrice?.currency)}
              available={livePrice ? livePrice.available : true}
              loading={pendingTier === tier}
              disabled={pendingTier !== null && pendingTier !== tier}
              ctaLabel={`Buy ${pkg.name} · ${
                formatPrice(livePrice?.amountMinor, livePrice?.currency) ?? `$${pkg.price}`
              }`}
              onSelect={() => void handleBuy(tier)}
            />
          );
        })}
      </View>

      <PrivacyNotice className="mt-5" tone="soft">
        Payments are processed securely by Stripe. Your card details never reach our servers.
      </PrivacyNotice>
    </ScreenWrapper>
  );
}
