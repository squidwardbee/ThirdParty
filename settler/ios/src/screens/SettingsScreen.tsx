import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Linking,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows } from '../lib/theme';
import { useAppStore, useUser, useIsPremium, useHasConsentedToAI } from '../lib/store';
import { signOut } from '../lib/firebase';
import { getManagementUrl } from '../lib/purchases';
import { api } from '../lib/api';
import * as Haptics from 'expo-haptics';

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  showChevron = true,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  danger?: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={() => {
          if (onPress) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
          }
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!onPress}
      >
        <View style={[styles.menuItem, danger && styles.menuItemDanger]}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.iconContainer, danger && styles.iconContainerDanger]}>
              {icon}
            </View>
            <Text style={[styles.menuItemText, danger && styles.menuItemTextDanger]}>
              {label}
            </Text>
          </View>
          <View style={styles.menuItemRight}>
            {value && <Text style={styles.menuItemValue}>{value}</Text>}
            {showChevron && onPress && (
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function SettingsScreen({ navigation }: any) {
  const user = useUser();
  const isPremium = useIsPremium();
  const hasConsentedToAI = useHasConsentedToAI();
  const logout = useAppStore((state) => state.logout);
  const revokeAIConsent = useAppStore((state) => state.revokeAIConsent);
  const showAIConsentModal = useAppStore((state) => state.showAIConsentModal);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            logout();
          } catch (error) {
            console.error('Sign out error:', error);
            logout();
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            // Second confirmation for destructive action
            Alert.alert(
              'Final Confirmation',
              'This will permanently delete your account and all associated data. Are you absolutely sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await api.deleteAccount();
                      await signOut();
                      logout();
                    } catch (error) {
                      console.error('Delete account error:', error);
                      Alert.alert('Error', 'Failed to delete account. Please try again or contact support.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Paywall');
  };

  const handleManageSubscription = () => {
    Linking.openURL(getManagementUrl());
  };

  const handleAIDataSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (hasConsentedToAI) {
      Alert.alert(
        'AI Data Sharing',
        'You have consented to share your argument data with AI services for processing. Would you like to revoke this consent?',
        [
          { text: 'Keep Enabled', style: 'cancel' },
          {
            text: 'Revoke Consent',
            style: 'destructive',
            onPress: () => {
              revokeAIConsent();
              Alert.alert(
                'Consent Revoked',
                'AI data sharing has been disabled. You will need to consent again to use judgment features.'
              );
            },
          },
        ]
      );
    } else {
      showAIConsentModal();
    }
  };

  const getPersonaName = () => {
    switch (user?.preferredPersona) {
      case 'judge_judy':
        return 'Judge Judy';
      case 'comedic':
        return 'The Comedian';
      default:
        return 'The Mediator';
    }
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={['#0A0A0F', '#12121A', '#0A0A0F']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Glow orbs */}
      <View style={styles.glowContainer} pointerEvents="none">
        <View style={[styles.glowOrb, styles.glowGreen]} />
        <View style={[styles.glowOrb, styles.glowPink]} />
      </View>

      <SafeAreaView style={styles.safeArea}>
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
          <Text style={styles.overline}>PREFERENCES</Text>
          <Text style={styles.title}>Settings</Text>
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Account Section */}
          <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>ACCOUNT</Text>

            {/* Profile Card */}
            <View style={styles.profileCard}>
              <View style={styles.profileAvatar}>
                <Ionicons name="person" size={24} color={colors.primary} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileEmail}>{user?.email || 'Not signed in'}</Text>
                <View style={styles.subscriptionBadge}>
                  {isPremium ? (
                    <>
                      <Ionicons name="star" size={12} color={colors.primary} />
                      <Text style={styles.subscriptionText}>Premium</Text>
                    </>
                  ) : (
                    <Text style={styles.subscriptionTextFree}>Free Plan</Text>
                  )}
                </View>
              </View>
              {!isPremium && (
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={handleUpgrade}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    style={styles.upgradeGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.upgradeButtonText}>Upgrade</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>

          {/* Preferences Section */}
          <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>PREFERENCES</Text>
            <View style={styles.menuGroup}>
              <SettingsRow
                icon={<MaterialCommunityIcons name="scale-balance" size={20} color={colors.primary} />}
                label="Default Judge"
                value={getPersonaName()}
                onPress={() => {}}
              />
            </View>
          </Animated.View>

          {/* Privacy Section */}
          <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>PRIVACY</Text>
            <View style={styles.menuGroup}>
              <SettingsRow
                icon={<MaterialCommunityIcons name="robot-outline" size={20} color={colors.textSecondary} />}
                label="AI Data Processing"
                value={hasConsentedToAI ? 'Enabled' : 'Disabled'}
                onPress={handleAIDataSettings}
              />
            </View>
          </Animated.View>

          {/* Support Section */}
          <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>SUPPORT</Text>
            <View style={styles.menuGroup}>
              <SettingsRow
                icon={<Ionicons name="shield-checkmark-outline" size={20} color={colors.textSecondary} />}
                label="Privacy Policy"
                onPress={() => Linking.openURL('https://unexpected-freighter-449.notion.site/Privacy-Policy-2e7d32c8c70180d6bac8d8663c6091cf')}
              />
              <SettingsRow
                icon={<Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />}
                label="Terms of Service"
                onPress={() => Linking.openURL('https://unexpected-freighter-449.notion.site/2e7d32c8c701809a8ffae4ad660a1ca0')}
              />
              {isPremium && (
                <SettingsRow
                  icon={<Ionicons name="card-outline" size={20} color={colors.textSecondary} />}
                  label="Manage Subscription"
                  onPress={handleManageSubscription}
                />
              )}
            </View>
          </Animated.View>

          {/* Account Actions */}
          <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>ACCOUNT ACTIONS</Text>
            <View style={styles.menuGroup}>
              <SettingsRow
                icon={<Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />}
                label="Sign Out"
                onPress={handleLogout}
                showChevron={false}
              />
              <SettingsRow
                icon={<Ionicons name="trash-outline" size={20} color={colors.error} />}
                label="Delete Account"
                onPress={handleDeleteAccount}
                showChevron={false}
                danger
              />
            </View>
          </Animated.View>

          {/* Footer */}
          <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
            <View style={styles.footerLine} />
            <Text style={styles.version}>ThirdParty v1.0.0</Text>
            <Text style={styles.copyright}>Fair judgments, every time</Text>
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
    paddingHorizontal: spacing.screenPadding,
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
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  glowGreen: {
    top: -80,
    right: -80,
    backgroundColor: colors.primary,
    opacity: 0.06,
  },
  glowPink: {
    bottom: 200,
    left: -100,
    backgroundColor: colors.secondary,
    opacity: 0.06,
  },

  // Header
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  overline: {
    ...typography.overline,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },

  // Section
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.overline,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },

  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileEmail: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  subscriptionText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  subscriptionTextFree: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  upgradeButton: {
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  upgradeGradient: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  upgradeButtonText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '600',
  },

  // Menu Group
  menuGroup: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemDanger: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconContainerDanger: {
    backgroundColor: `${colors.error}15`,
  },
  menuItemText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  menuItemTextDanger: {
    color: colors.error,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuItemValue: {
    ...typography.body,
    color: colors.textSecondary,
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  footerLine: {
    width: 40,
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  version: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xxs,
  },
  copyright: {
    ...typography.small,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
