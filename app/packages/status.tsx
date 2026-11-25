import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, AppState } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { ScreenWrapper } from '@/components/ui/layouts/ScreenWrapper';
import { AppHeader } from '@/components/ui/shared/AppHeader';
import { AppButton } from '@/components/ui/shared/AppButton';
import { baseApi, useLazyGetCheckoutStatusQuery } from '@/store/api/baseApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setCredit } from '@/store/slices/shareSlice';
import { getApiErrorMessage, getApiErrorStatus } from '@/utils/format';
import type { CheckoutStatus } from '@/types';

const POLL_INTERVAL_MS = 3000;
// Stop polling after about 10 minutes; the person can still check again manually.
const MAX_POLLS = 200;

export default function PackageStatusScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const selectedTopic = useAppSelector((state) => state.share.selectedTopic);
  const { sessionId, checkoutUrl } = useLocalSearchParams<{
    sessionId?: string;
    checkoutUrl?: string;
  }>();

  const [fetchStatus] = useLazyGetCheckoutStatusQuery();
  const [purchase, setPurchase] = useState<CheckoutStatus | null>(null);
  const [error, setError] = useState('');
  const [timedOut, setTimedOut] = useState(false);
  const polls = useRef(0);
  const mounted = useRef(true);
  const openedCheckout = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const isPending = !purchase || purchase.status === 'pending';

  const checkStatus = useCallback(async () => {
    if (!sessionId) return;
    clearTimeout(timer.current);
    try {
      const result = await fetchStatus(sessionId).unwrap();
      if (!mounted.current) return;
      setPurchase(result);
      setError('');
      if (result.status !== 'pending') {
        dispatch(baseApi.util.invalidateTags(['Credits']));
        return;
      }
    } catch (statusError) {
      if (!mounted.current) return;
      if (getApiErrorStatus(statusError) === 401) {
        setError('Your session expired. Sign in again to check this payment.');
        return;
      }
      setError(getApiErrorMessage(statusError, 'Could not check this payment yet.'));
    }

    polls.current += 1;
    if (polls.current < MAX_POLLS) {
      timer.current = setTimeout(() => void checkStatus(), POLL_INTERVAL_MS);
    } else {
      setTimedOut(true);
    }
  }, [dispatch, fetchStatus, sessionId]);

  const openCheckout = useCallback(async () => {
    if (!checkoutUrl) return;
    await WebBrowser.openBrowserAsync(checkoutUrl, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    }).catch(() => undefined);
    // On iOS this resolves when the browser closes; check right away.
    void checkStatus();
  }, [checkStatus, checkoutUrl]);

  useEffect(() => {
    mounted.current = true;
    if (!openedCheckout.current) {
      openedCheckout.current = true;
      void openCheckout();
    }
    void checkStatus();
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, [checkStatus, openCheckout]);

  // On Android the browser does not report closing, so check when the app comes back.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isPending) {
        polls.current = 0;
        setTimedOut(false);
        void checkStatus();
      }
    });
    return () => subscription.remove();
  }, [checkStatus, isPending]);

  const handleContinue = () => {
    if (!purchase) return;
    dispatch(setCredit({ purchaseId: purchase.purchaseId, packageTier: purchase.packageTier }));
    router.replace(selectedTopic ? '/send/recipient' : '/(tabs)/topics');
  };

  const handleCheckAgain = () => {
    polls.current = 0;
    setTimedOut(false);
    void checkStatus();
  };

  if (!sessionId) {
    return (
      <ScreenWrapper header={<AppHeader title="Payment" />}>
        <Text className="text-[15px] text-ink-secondary">No checkout session was found.</Text>
        <AppButton className="mt-6" onPress={() => router.replace('/packages')}>
          Back to packages
        </AppButton>
      </ScreenWrapper>
    );
  }

  const isPaid = purchase?.status === 'completed';
  const hasUnusedCredit = isPaid && purchase.fulfillmentStatus === 'pending';

  let icon: React.ReactNode = <ActivityIndicator size="large" color="#2E5E52" />;
  let title = 'Confirming your payment';
  let description =
    'Complete the payment in the secure Stripe window. This screen updates once Stripe confirms it.';

  if (hasUnusedCredit) {
    icon = <Ionicons name="checkmark-circle" size={56} color="#2E5E52" />;
    title = 'Payment confirmed';
    description = `Your ${purchase.packageTier} package is ready. You can now send one anonymous message.`;
  } else if (isPaid) {
    icon = <Ionicons name="information-circle" size={56} color="#2E5E52" />;
    title = 'Credit already used';
    description = 'This payment is confirmed, but its message credit has already been used.';
  } else if (purchase && purchase.status !== 'pending') {
    icon = <Ionicons name="close-circle" size={56} color="#A9524A" />;
    title = 'Payment not completed';
    description = `This payment is ${purchase.status.replace('_', ' ')}. No message credit was added.`;
  }

  return (
    <ScreenWrapper
      header={<AppHeader title="Payment" onBack={() => router.replace('/packages')} />}
      footer={
        hasUnusedCredit ? (
          <AppButton onPress={handleContinue}>Continue to your message</AppButton>
        ) : isPending ? (
          <View className="gap-3">
            {checkoutUrl ? (
              <AppButton onPress={() => void openCheckout()}>Reopen secure checkout</AppButton>
            ) : null}
            <AppButton variant="outline" onPress={() => router.replace('/packages')}>
              Back to packages
            </AppButton>
          </View>
        ) : (
          <AppButton onPress={() => router.replace('/packages')}>Back to packages</AppButton>
        )
      }>
      <View className="items-center pt-10">
        <View className="h-20 items-center justify-center">{icon}</View>
        <Text className="mt-4 text-center text-[22px] font-bold text-ink">{title}</Text>
        <Text className="mt-2 text-center text-[14px] leading-6 text-ink-secondary">{description}</Text>

        {isPending && timedOut ? (
          <View className="mt-5 items-center">
            <Text className="text-center text-[13px] text-ink-tertiary">
              Confirmation is taking longer than usual. If you cancelled, go back to packages.
            </Text>
            <AppButton className="mt-3" variant="ghost" fullWidth={false} onPress={handleCheckAgain}>
              Check again
            </AppButton>
          </View>
        ) : null}

        {error ? (
          <Text className="mt-5 text-center text-[13px] font-medium text-danger">{error}</Text>
        ) : null}
      </View>
    </ScreenWrapper>
  );
}
