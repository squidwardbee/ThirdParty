import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows, animation } from '../lib/theme';
import { useUser } from '../lib/store';
import { RootStackParamList } from '../navigation';
import * as Haptics from 'expo-haptics';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ModeCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradientColors: string[];
  glowColor: string;
  onPress: () => void;
  delay?: number;
}

function ModeCard({ title, description, icon, gradientColors, glowColor, onPress, delay = 0 }: ModeCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        useNativeDriver: true,
        damping: 15,
        stiffness: 100,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: animation.scalePressed,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 8,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }, { translateY }],
        },
      ]}
    >
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          onPress();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.cardPressable}
      >
        <LinearGradient
          colors={gradientColors}
          style={[styles.card, { shadowColor: glowColor }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Icon */}
          <View style={styles.cardIconContainer}>
            {icon}
          </View>

          {/* Content */}
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardDescription}>{description}</Text>
          </View>

          {/* Arrow */}
          <View style={styles.arrowCircle}>
            <Ionicons name="arrow-forward" size={20} color={colors.textInverse} />
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const user = useUser();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 12,
      }),
    ]).start();
  }, []);

  const handleLiveMode = () => navigation.navigate('Setup', { mode: 'live' });
  const handleTurnBased = () => navigation.navigate('Setup', { mode: 'turn_based' });
  const handleScreenshot = () => navigation.navigate('Screenshot');

  const remainingArguments = 3 - (user?.argumentsToday || 0);
  const isPremium = user?.subscriptionTier === 'premium';

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={['#0A0A0F', '#12121A', '#0A0A0F']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Glow effects */}
      <View style={styles.glowContainer} pointerEvents="none">
        <View style={[styles.glowOrb, styles.glowGreen]} />
        <View style={[styles.glowOrb, styles.glowPink]} />
      </View>

      <SafeAreaView style={styles.safeArea}>
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
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.brandName}>ThirdParty</Text>
            <Text style={styles.tagline}>Let's settle this.</Text>
          </Animated.View>

          {/* Mode Cards */}
          <View style={styles.cardsContainer}>
            <ModeCard
              title="Live Debate"
              description="Record your argument in real-time. AI listens and decides."
              icon={<Ionicons name="mic" size={32} color={colors.textInverse} />}
              gradientColors={[colors.secondary, colors.secondaryDark]}
              glowColor={colors.secondary}
              onPress={handleLiveMode}
              delay={100}
            />

            <ModeCard
              title="Take Turns"
              description="Each side speaks separately. Fair and structured."
              icon={<MaterialCommunityIcons name="account-switch" size={32} color={colors.textInverse} />}
              gradientColors={[colors.primary, colors.primaryDark]}
              glowColor={colors.primary}
              onPress={handleTurnBased}
              delay={200}
            />

            <ModeCard
              title="Screenshot"
              description="Upload a text convo. AI judges who's right."
              icon={<Ionicons name="image" size={32} color={colors.textInverse} />}
              gradientColors={['#6C5CE7', '#5541D7']}
              glowColor="#6C5CE7"
              onPress={handleScreenshot}
              delay={300}
            />
          </View>

          {/* Usage Footer */}
          <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
            <View style={styles.usagePill}>
              {isPremium ? (
                <>
                  <Ionicons name="infinite" size={18} color={colors.primary} />
                  <Text style={styles.usageTextPremium}>Unlimited judgments</Text>
                </>
              ) : (
                <>
                  <View style={styles.usageDots}>
                    {[0, 1, 2].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.usageDot,
                          i < remainingArguments
                            ? styles.usageDotActive
                            : styles.usageDotInactive,
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={styles.usageText}>
                    {remainingArguments} left today
                  </Text>
                </>
              )}
            </View>

            {!isPremium && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  navigation.navigate('Paywall');
                }}
              >
                <LinearGradient
                  colors={[colors.secondary, colors.primary]}
                  style={styles.upgradeButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.upgradeText}>Go Pro</Text>
                  <Ionicons name="sparkles" size={14} color={colors.textInverse} />
                </LinearGradient>
              </Pressable>
            )}
          </Animated.View>
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
    flexGrow: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // Glow effects
  glowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  glowGreen: {
    top: -100,
    right: -100,
    backgroundColor: colors.primary,
    opacity: 0.08,
  },
  glowPink: {
    bottom: 100,
    left: -150,
    backgroundColor: colors.secondary,
    opacity: 0.08,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: spacing.sectionGap,
    paddingTop: spacing.lg,
  },
  brandName: {
    ...typography.hero,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  tagline: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
  },

  // Cards
  cardsContainer: {
    gap: spacing.md,
    marginBottom: spacing.sectionGap,
  },
  cardContainer: {
    borderRadius: borderRadius.card,
  },
  cardPressable: {
    borderRadius: borderRadius.card,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.card,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    ...typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  arrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  usagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  usageDots: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  usageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  usageDotActive: {
    backgroundColor: colors.primary,
  },
  usageDotInactive: {
    backgroundColor: colors.bgTertiary,
  },
  usageText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  usageTextPremium: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  upgradeText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '700',
  },
});
