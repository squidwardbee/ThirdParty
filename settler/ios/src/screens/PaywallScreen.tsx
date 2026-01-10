import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../lib/theme';
import {
  purchasePackage,
  restorePurchases,
} from '../lib/purchases';
import { useIsPremium, useAppStore } from '../lib/store';
import { RootStackParamList } from '../navigation';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

const PREMIUM_FEATURES: FeatureItem[] = [
  {
    icon: 'infinite',
    title: 'Unlimited Arguments',
    description: 'No daily limits',
  },
  {
    icon: 'search',
    title: 'AI Research',
    description: 'Fact-checking with sources',
  },
  {
    icon: 'mic',
    title: 'Premium Voices',
    description: 'High-quality narration',
  },
];

function FeatureRow({ feature }: { feature: FeatureItem }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIconWrapper}>
        <Ionicons name={feature.icon as any} size={18} color={colors.primary} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{feature.title}</Text>
        <Text style={styles.featureDescription}>{feature.description}</Text>
      </View>
      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
    </View>
  );
}

export default function PaywallScreen({ navigation }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL');
  const [purchasing, setPurchasing] = useState(false);
  const isPremium = useIsPremium();
  const user = useAppStore((state) => state.user);

  // Debug logging
  useEffect(() => {
    console.log('[PaywallScreen] isPremium changed:', isPremium);
    console.log('[PaywallScreen] user.subscriptionTier:', user?.subscriptionTier);
  }, [isPremium, user?.subscriptionTier]);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Auto-close when user becomes premium
  useEffect(() => {
    console.log('[PaywallScreen] Auto-close check - isPremium:', isPremium);
    if (isPremium) {
      console.log('[PaywallScreen] Closing paywall - user is premium!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    }
  }, [isPremium, navigation]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePurchase = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPurchasing(true);
    try {
      await purchasePackage(selectedPlan);
      // Auto-close handled by isPremium useEffect
    } catch (error: any) {
      if (!error.userCancelled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Purchase Failed', error.message || 'Please try again');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPurchasing(true);
    try {
      const success = await restorePurchases();
      if (!success) {
        Alert.alert('No Subscription Found', 'We could not find an active subscription.');
      }
      // Auto-close handled by isPremium useEffect if restored
    } catch (error: any) {
      Alert.alert('Restore Failed', error.message || 'Please try again');
    } finally {
      setPurchasing(false);
    }
  };

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={['#0D0D0F', '#141416', '#0D0D0F']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Header */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="crown" size={28} color={colors.primary} />
            </View>
            <Text style={styles.title}>ThirdParty Pro</Text>
            <Text style={styles.subtitle}>Unlock the full experience</Text>
          </Animated.View>

          {/* Features - Horizontal */}
          <View style={styles.featuresRow}>
            {PREMIUM_FEATURES.map((feature) => (
              <View key={feature.title} style={styles.featureItem}>
                <View style={styles.featureIconWrapper}>
                  <Ionicons name={feature.icon as any} size={20} color={colors.primary} />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
              </View>
            ))}
          </View>

          {/* Plans */}
          <Animated.View style={[styles.planStack, { opacity: fadeAnim }]}>
            {/* Annual Plan - First/Default */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedPlan('ANNUAL');
              }}
            >
              <View
                style={[
                  styles.planRow,
                  selectedPlan === 'ANNUAL' && styles.planSelected,
                ]}
              >
                <View style={styles.bestValueTag}>
                  <Text style={styles.bestValueText}>BEST VALUE</Text>
                </View>
                <View style={styles.planLeft}>
                  <View style={[styles.radioOuter, selectedPlan === 'ANNUAL' && styles.radioOuterSelected]}>
                    {selectedPlan === 'ANNUAL' && <View style={styles.radioInner} />}
                  </View>
                  <View>
                    <Text style={styles.planTitle}>Annual</Text>
                    <View style={styles.savingsRow}>
                      <Text style={styles.strikePrice}>$119.99</Text>
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>50% OFF</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={styles.priceRight}>
                  <Text style={styles.planPrice}>$59.99</Text>
                  <Text style={styles.perYear}>/year</Text>
                </View>
              </View>
            </Pressable>

            {/* Monthly Plan */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedPlan('MONTHLY');
              }}
            >
              <View
                style={[
                  styles.planRow,
                  selectedPlan === 'MONTHLY' && styles.planSelected,
                ]}
              >
                <View style={styles.planLeft}>
                  <View style={[styles.radioOuter, selectedPlan === 'MONTHLY' && styles.radioOuterSelected]}>
                    {selectedPlan === 'MONTHLY' && <View style={styles.radioInner} />}
                  </View>
                  <View>
                    <Text style={styles.planTitle}>Monthly</Text>
                    <Text style={styles.planSub}>Billed monthly</Text>
                  </View>
                </View>
                <Text style={styles.planPrice}>$9.99</Text>
              </View>
            </Pressable>
          </Animated.View>

          {/* Purchase Button */}
          <Animated.View style={[{ opacity: fadeAnim, transform: [{ scale: buttonScale }] }]}>
            <Pressable
              style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
              onPress={handlePurchase}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={purchasing}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.purchaseGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {purchasing ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <>
                    <Text style={styles.purchaseButtonText}>Start Free Trial</Text>
                    <Ionicons name="arrow-forward" size={20} color={colors.textInverse} />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <Text style={styles.trialNote}>
            3-day free trial · Cancel anytime
          </Text>

          {/* Restore */}
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={purchasing}
          >
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          </TouchableOpacity>

          {/* Legal - Bottom */}
          <View style={styles.legalContainer}>
            <Text style={styles.legalText}>
              Payment charged after trial. Auto-renews until canceled.
            </Text>
            <View style={styles.legalLinks}>
              <TouchableOpacity onPress={() => Linking.openURL('https://thirdparty.app/privacy')}>
                <Text style={styles.legalLink}>Privacy</Text>
              </TouchableOpacity>
              <Text style={styles.legalDot}>·</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://thirdparty.app/terms')}>
                <Text style={styles.legalLink}>Terms</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
    justifyContent: 'space-between',
  },

  // Close button
  closeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.screenPadding,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: `${colors.primary}30`,
  },
  title: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: 2,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  // Features - Horizontal row
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  featureTitle: {
    ...typography.small,
    color: colors.textPrimary,
    textAlign: 'center',
    fontWeight: '600',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  featureContent: {
    flex: 1,
  },
  featureDescription: {
    ...typography.small,
    color: colors.textSecondary,
  },

  // Plans
  planStack: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
    overflow: 'visible',
  },
  planSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
  },
  bestValueTag: {
    position: 'absolute',
    top: -10,
    right: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  bestValueText: {
    fontSize: 10,
    color: colors.textInverse,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  planLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  planTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 15,
  },
  planSub: {
    ...typography.small,
    color: colors.textSecondary,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  strikePrice: {
    ...typography.small,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: `${colors.success}20`,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 10,
    color: colors.success,
    fontWeight: '700',
  },
  priceRight: {
    alignItems: 'flex-end',
  },
  planPrice: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  perYear: {
    ...typography.small,
    color: colors.textMuted,
  },

  // Purchase button
  purchaseButton: {
    borderRadius: borderRadius.button,
    overflow: 'hidden',
    marginBottom: spacing.xs,
    ...shadows.glow,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  purchaseButtonText: {
    ...typography.button,
    color: colors.textInverse,
    fontSize: 16,
  },
  trialNote: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  // Restore
  restoreButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  restoreButtonText: {
    ...typography.caption,
    color: colors.textMuted,
  },

  // Legal
  legalContainer: {
    paddingBottom: spacing.sm,
  },
  legalText: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xs,
    fontSize: 11,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legalLink: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
  },
  legalDot: {
    color: colors.textMuted,
    fontSize: 11,
  },
});
