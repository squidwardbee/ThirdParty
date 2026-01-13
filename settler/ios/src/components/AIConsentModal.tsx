import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Linking,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, borderRadius } from '../lib/theme';
import { useAppStore, useIsAIConsentModalVisible } from '../lib/store';

export default function AIConsentModal() {
  const isVisible = useIsAIConsentModalVisible();
  const setAIConsent = useAppStore((state) => state.setAIConsent);
  const hideAIConsentModal = useAppStore((state) => state.hideAIConsentModal);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [isVisible]);

  const handleAllow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAIConsent(true);
  };

  const handleDecline = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAIConsent(false);
    hideAIConsentModal();
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://unexpected-freighter-449.notion.site/Privacy-Policy-2e7d32c8c70180d6bac8d8663c6091cf');
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.modalContent}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name="robot-outline"
                size={40}
                color={colors.primary}
              />
            </View>

            {/* Title */}
            <Text style={styles.title}>AI Data Processing</Text>

            {/* Description */}
            <Text style={styles.description}>
              ThirdParty uses artificial intelligence to analyze your arguments and generate judgments.
            </Text>

            {/* Data disclosure */}
            <View style={styles.disclosureBox}>
              <Text style={styles.disclosureTitle}>What we share:</Text>
              <View style={styles.disclosureItem}>
                <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.disclosureText}>Argument text you submit</Text>
              </View>
              <View style={styles.disclosureItem}>
                <Ionicons name="image-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.disclosureText}>Screenshots you upload</Text>
              </View>
              <View style={styles.disclosureItem}>
                <Ionicons name="mic-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.disclosureText}>Audio transcriptions</Text>
              </View>
            </View>

            {/* Provider disclosure */}
            <View style={styles.providerBox}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              <Text style={styles.providerText}>
                Data is processed by OpenAI's API. Your data is not used to train AI models.
              </Text>
            </View>

            {/* Privacy link */}
            <Pressable onPress={handlePrivacyPolicy} hitSlop={8}>
              <Text style={styles.privacyLink}>Read our Privacy Policy</Text>
            </Pressable>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <Pressable
                style={styles.declineButton}
                onPress={handleDecline}
              >
                <Text style={styles.declineButtonText}>Don't Allow</Text>
              </Pressable>

              <Pressable onPress={handleAllow}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.allowButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.allowButtonText}>Allow</Text>
                </LinearGradient>
              </Pressable>
            </View>

            {/* Note */}
            <Text style={styles.note}>
              You can change this anytime in Settings
            </Text>
          </View>
        </Animated.View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  disclosureBox: {
    width: '100%',
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  disclosureTitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  disclosureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  disclosureText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  providerBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: `${colors.primary}10`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
  },
  providerText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  privacyLink: {
    ...typography.caption,
    color: colors.primary,
    textDecorationLine: 'underline',
    marginBottom: spacing.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  declineButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  declineButtonText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  allowButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.button,
    alignItems: 'center',
  },
  allowButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
  note: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
