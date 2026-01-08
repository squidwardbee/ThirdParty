import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography, spacing } from '../lib/theme';
import { api } from '../lib/api';
import { RootStackParamList } from '../navigation';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Processing'>;

const PROCESSING_MESSAGES = [
  'Analyzing arguments...',
  'Weighing the evidence...',
  'Consulting legal precedents...',
  'Considering both perspectives...',
  'Researching relevant facts...',
  'Formulating judgment...',
  'Preparing verdict...',
];

export default function ProcessingScreen({ navigation, route }: Props) {
  const { argumentId } = route.params;
  const [messageIndex, setMessageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Cycle through messages
    const messageTimer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % PROCESSING_MESSAGES.length);
    }, 2500);

    // Request judgment
    const requestJudgment = async () => {
      try {
        await api.requestJudgment(argumentId);
        // Navigate to judgment screen
        navigation.replace('Judgment', { argumentId });
      } catch (err) {
        console.error('Judgment error:', err);
        setError('Failed to get judgment. Please try again.');
      }
    };

    requestJudgment();

    return () => {
      clearInterval(messageTimer);
    };
  }, [argumentId, navigation]);

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <MaterialIcons name="warning" size={64} color={colors.error} style={styles.errorEmoji} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Animated Gavel */}
       <View style={styles.iconContainer}>
          <FontAwesome5 name="balance-scale" size={80} color={colors.textPrimary} />
        </View>

        {/* Loading Indicator */}
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.spinner}
        />

        {/* Status Messages */}
        <Text style={styles.statusText}>
          {PROCESSING_MESSAGES[messageIndex]}
        </Text>

        <Text style={styles.hint}>
          This may take a moment as our AI carefully considers both sides
        </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  icon: {
    fontSize: 80,
  },
  spinner: {
    marginBottom: spacing.lg,
  },
  statusText: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  hint: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
});
