import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius, shadows } from '../lib/theme';
import { useUser } from '../lib/store';

export default function HomeScreen() {
  const user = useUser();

  const handleLiveMode = () => {
    // TODO: Navigate to Setup screen with mode: 'live'
    console.log('Start Live Mode');
  };

  const handleTurnBased = () => {
    // TODO: Navigate to Setup screen with mode: 'turn_based'
    console.log('Start Turn-Based Mode');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Hey{user?.displayName ? `, ${user.displayName}` : ''}!
          </Text>
          <Text style={styles.title}>Ready to settle?</Text>
        </View>

        {/* Mode Selection */}
        <View style={styles.modes}>
          <TouchableOpacity
            style={styles.modeCard}
            onPress={handleLiveMode}
            activeOpacity={0.8}
          >
            <View style={[styles.modeIcon, { backgroundColor: colors.personA + '20' }]}>
              <Text style={styles.modeIconText}>🎙️</Text>
            </View>
            <Text style={styles.modeTitle}>Live Conversation</Text>
            <Text style={styles.modeDescription}>
              Record both people talking naturally. AI will identify who said what.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modeCard}
            onPress={handleTurnBased}
            activeOpacity={0.8}
          >
            <View style={[styles.modeIcon, { backgroundColor: colors.personB + '20' }]}>
              <Text style={styles.modeIconText}>🔄</Text>
            </View>
            <Text style={styles.modeTitle}>Turn-Based</Text>
            <Text style={styles.modeDescription}>
              Take turns presenting your argument. Each person records separately.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Usage Info */}
        <View style={styles.usageInfo}>
          <Text style={styles.usageText}>
            {user?.subscriptionTier === 'premium'
              ? 'Unlimited arguments'
              : `${3 - (user?.argumentsToday || 0)} free arguments remaining today`}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  greeting: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  modes: {
    flex: 1,
    gap: spacing.md,
  },
  modeCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  modeIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modeIconText: {
    fontSize: 28,
  },
  modeTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  modeDescription: {
    ...typography.body,
    color: colors.textSecondary,
  },
  usageInfo: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  usageText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
