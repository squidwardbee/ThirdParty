import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
  Animated,
  Pressable,
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
import { RootStackParamList } from '../navigation';
import * as Haptics from 'expo-haptics';
import leftLaurel from '../../assets/left_laurel.png';
import rightLaurel from '../../assets/right_laurel.png';

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
    description: '24/7 access to an impartial mediator',
  },
  {
    icon: 'search',
    title: 'AI Research',
    description: 'Fact-checking with web search',
  },
  {
    icon: 'mic',
    title: 'Premium Voices',
    description: 'High-quality AI narrator voices',
  },
  {
    icon: 'analytics',
    title: 'Detailed Analysis',
    description: 'In-depth reasoning and sources',
  },
];

function FeatureRow({ feature, index }: { feature: FeatureItem; index: number }) {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: 200 + index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: 200 + index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.featureRow,
        {
          opacity: opacityAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <View style={styles.featureIconWrapper}>
        <Ionicons name={feature.icon as any} size={22} color={colors.primary} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{feature.title}</Text>
        <Text style={styles.featureDescription}>{feature.description}</Text>
      </View>
      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
    </Animated.View>
  );
}

export default function PaywallScreen({ navigation }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL');
  const [purchasing, setPurchasing] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.5,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePurchase = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPurchasing(true);
    try {
      const success = await purchasePackage(selectedPlan);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success!', 'Welcome to ThirdParty Pro!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
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
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Restored!', 'Your subscription has been restored.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('No Subscription Found', 'We could not find an active subscription.');
      }
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

      {/* Glow orbs */}
      <View style={styles.glowOrbContainer} pointerEvents="none">
        <Animated.View style={[styles.glowOrb, styles.glowGreen, { opacity: glowAnim }]} />
        <Animated.View style={[styles.glowOrb, styles.glowPink, { opacity: glowAnim }]} />
      </View>

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

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
            <View style={styles.laurelWrapper}>
              <Image source={leftLaurel} style={styles.laurelIcon} />
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="crown" size={32} color={colors.primary} />
              </View>
              <Image source={rightLaurel} style={styles.laurelIcon} />
            </View>

            <Text style={styles.title}>ThirdParty Pro</Text>
            <Text style={styles.subtitle}>Unlock the full courtroom experience</Text>
          </Animated.View>

          {/* Features */}
          <View style={styles.featuresCard}>
            {PREMIUM_FEATURES.map((feature, index) => (
              <FeatureRow key={feature.title} feature={feature} index={index} />
            ))}
          </View>

          {/* Plans */}
          <Animated.View style={[styles.planStack, { opacity: fadeAnim }]}>
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

            {/* Annual Plan */}
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
                    <Text style={styles.purchaseButtonText}>Start 3-Day Free Trial</Text>
                    <Ionicons name="arrow-forward" size={20} color={colors.textInverse} />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <Text style={styles.trialNote}>
            No payment now. Cancel anytime during trial.
          </Text>

          {/* Restore */}
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={purchasing}
          >
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          </TouchableOpacity>

          {/* Legal */}
          <Text style={styles.legalText}>
            Payment will be charged to your Apple ID account at confirmation of purchase.
            Subscription automatically renews unless canceled at least 24 hours before
            the end of the current period.
          </Text>

          <View style={styles.legalLinks}>
            <TouchableOpacity onPress={() => Linking.openURL('https://thirdparty.app/privacy')}>
              <Text style={styles.legalLink}>Privacy</Text>
            </TouchableOpacity>
            <View style={styles.legalDot} />
            <TouchableOpacity onPress={() => Linking.openURL('https://thirdparty.app/terms')}>
              <Text style={styles.legalLink}>Terms</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },

  // Glow effects
  glowOrbContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  glowGreen: {
    top: -80,
    right: -80,
    backgroundColor: colors.primary,
    opacity: 0.12,
  },
  glowPink: {
    top: 150,
    left: -120,
    backgroundColor: colors.secondary,
    opacity: 0.1,
  },

  // Close button
  closeButton: {
    position: 'absolute',
    top: spacing.xl + 44, // SafeAreaView offset
    right: spacing.screenPadding,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  laurelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  laurelIcon: {
    width: 64,
    height: 64,
    tintColor: colors.primary,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    borderWidth: 2,
    borderColor: `${colors.primary}30`,
  },
  title: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },

  // Features
  featuresCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  featureIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  featureDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  // Plans
  planStack: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
    overflow: 'visible',
    ...shadows.sm,
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
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  bestValueText: {
    ...typography.small,
    color: colors.textInverse,
    fontWeight: '700',
    letterSpacing: 1,
  },
  planLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  planTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  planSub: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  strikePrice: {
    ...typography.caption,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: `${colors.success}20`,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  discountText: {
    ...typography.small,
    color: colors.success,
    fontWeight: '700',
  },
  priceRight: {
    alignItems: 'flex-end',
  },
  planPrice: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  perYear: {
    ...typography.caption,
    color: colors.textMuted,
  },

  // Purchase button
  purchaseButton: {
    borderRadius: borderRadius.button,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    ...shadows.glow,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 2,
    gap: spacing.sm,
  },
  purchaseButtonText: {
    ...typography.button,
    color: colors.textInverse,
    fontSize: 17,
  },
  trialNote: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  // Restore
  restoreButton: {
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  restoreButtonText: {
    ...typography.body,
    color: colors.textSecondary,
  },

  // Legal
  legalText: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legalLink: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  legalDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textMuted,
  },
});
