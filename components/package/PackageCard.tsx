import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PackageTier } from '@/types';

interface PackageCardProps {
  pkg: PackageTier;
  /** Live price label from Stripe, e.g. "$49". Falls back to the static price. */
  priceLabel?: string | null;
  available?: boolean;
  loading?: boolean;
  disabled?: boolean;
  ctaLabel?: string;
  onSelect: () => void;
}

export function PackageCard({
  pkg,
  priceLabel,
  available = true,
  loading = false,
  disabled = false,
  ctaLabel,
  onSelect,
}: PackageCardProps) {
  const price = priceLabel ?? `$${pkg.price}`;
  const isDisabled = disabled || loading || !available;

  return (
    <View
      className={`w-full rounded-2xl border p-4 shadow-xs ${
        pkg.popular ? 'border-forest bg-mist/20 ring-1 ring-forest' : 'border-line bg-canvas'
      }`}>
      <View className="w-full">
        {pkg.badge && (
          <View className="self-start mb-2">
            <View className={`rounded-full px-2.5 py-0.5 ${pkg.popular ? 'bg-primary' : 'bg-line'}`}>
              <Text
                className={`text-[9.5px] font-bold uppercase tracking-wider ${
                  pkg.popular ? 'text-white' : 'text-ink-secondary'
                }`}>
                {pkg.badge}
              </Text>
            </View>
          </View>
        )}

        <View className="w-full flex-row items-baseline justify-between gap-2">
          <View className="flex-1 pr-2">
            <Text className="text-[17px] font-bold text-ink leading-snug">{pkg.name}</Text>
            <Text className="mt-0.5 text-[12px] text-ink-secondary leading-snug">{pkg.tagline}</Text>
          </View>

          <View className="items-end shrink-0">
            <Text className="text-[22px] font-bold text-ink leading-tight">{price}</Text>
            <Text className="text-[10px] font-medium text-ink-tertiary">USD · One-Time</Text>
          </View>
        </View>
      </View>

      <View className="mt-3.5 w-full border-t border-line/60 pt-3 gap-2">
        {pkg.features.map((feature) => (
          <View key={feature} className="w-full flex-row items-start gap-2">
            <Ionicons name="checkmark-circle" size={15} color="#2E5E52" style={{ marginTop: 1 }} />
            <Text className="flex-1 text-[12px] leading-snug text-ink-secondary">{feature}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onSelect}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={{
          backgroundColor: pkg.popular ? '#2E5E52' : '#FFFFFF',
          borderColor: pkg.popular ? '#2E5E52' : '#E6E9E2',
          borderWidth: 1,
          opacity: isDisabled && !loading ? 0.55 : 1,
        }}
        className="mt-4 w-full flex-row items-center justify-center rounded-xl py-3.5 px-3 shadow-xs active:opacity-90">
        {loading ? (
          <ActivityIndicator size="small" color={pkg.popular ? '#FFFFFF' : '#2E5E52'} />
        ) : (
          <>
            <Text style={{ color: pkg.popular ? '#FFFFFF' : '#18231F' }} className="text-[13.5px] font-bold">
              {available ? ctaLabel ?? `Select ${pkg.name} · ${price}` : 'Currently unavailable'}
            </Text>
            {available && (
              <Ionicons
                name="arrow-forward"
                size={14}
                color={pkg.popular ? '#FFFFFF' : '#2E5E52'}
                style={{ marginLeft: 6 }}
              />
            )}
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
