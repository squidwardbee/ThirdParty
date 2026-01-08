import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Audio } from 'expo-av';
import { colors, typography, spacing, borderRadius } from '../lib/theme';
import { api } from '../lib/api';
import { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ArgumentDetail'>;

interface ArgumentData {
  id: string;
  mode: string;
  personAName: string;
  personBName: string;
  persona: string;
  status: string;
  createdAt: string;
  turns: Array<{
    id: string;
    speaker: string;
    transcription: string;
  }>;
  judgment: {
    winner: string;
    winnerName: string;
    reasoning: string;
    fullResponse: string;
    audioUrl?: string;
    researchPerformed: boolean;
    sources?: string[];
  } | null;
}

export default function ArgumentDetailScreen({ navigation, route }: Props) {
  const { argumentId } = route.params;
  const [argument, setArgument] = useState<ArgumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    loadArgument();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [argumentId]);

  const loadArgument = async () => {
    try {
      const data = await api.getArgument(argumentId);
      setArgument(data as ArgumentData);
    } catch (error) {
      console.error('Failed to load argument:', error);
      Alert.alert('Error', 'Failed to load argument details');
    } finally {
      setLoading(false);
    }
  };

  const playAudio = async () => {
    if (!argument?.judgment?.audioUrl) return;

    try {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
          return;
        }
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: argument.judgment.audioUrl },
        { shouldPlay: true }
      );

      soundRef.current = sound;
      setIsPlaying(true);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  };

  const handleShare = async () => {
    if (!argument?.judgment) return;

    try {
      await Share.share({
        message: `Settler Judgment:\n\n${argument.personAName} vs ${argument.personBName}\n\nWinner: ${argument.judgment.winnerName}\n\n${argument.judgment.reasoning}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Argument',
      'Are you sure you want to delete this argument? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteArgument(argumentId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete argument');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!argument) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Argument not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const winnerColor =
    argument.judgment?.winner === 'person_a'
      ? colors.personA
      : argument.judgment?.winner === 'person_b'
      ? colors.personB
      : colors.secondary;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>
            {argument.personAName} vs {argument.personBName}
          </Text>
          <Text style={styles.meta}>
            {new Date(argument.createdAt).toLocaleDateString()} •{' '}
            {argument.mode === 'live' ? '🎙️ Live' : '🔄 Turn-based'}
          </Text>
        </View>

        {/* Winner */}
        {argument.judgment && (
          <View style={[styles.winnerCard, { borderColor: winnerColor }]}>
            <Text style={styles.winnerLabel}>Winner</Text>
            <Text style={[styles.winnerName, { color: winnerColor }]}>
              {argument.judgment.winnerName}
            </Text>

            {argument.judgment.audioUrl && (
              <TouchableOpacity style={styles.playButton} onPress={playAudio}>
                <Text style={styles.playButtonText}>
                  {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Turns */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Arguments</Text>
          {argument.turns.map((turn, index) => (
            <View
              key={turn.id}
              style={[
                styles.turnCard,
                {
                  borderLeftColor:
                    turn.speaker === 'person_a' ? colors.personA : colors.personB,
                },
              ]}
            >
              <Text style={styles.turnSpeaker}>
                {turn.speaker === 'person_a'
                  ? argument.personAName
                  : argument.personBName}
              </Text>
              <Text style={styles.turnText}>{turn.transcription}</Text>
            </View>
          ))}
        </View>

        {/* Judgment */}
        {argument.judgment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Judgment</Text>
            <View style={styles.judgmentCard}>
              <Text style={styles.judgmentText}>
                {argument.judgment.fullResponse || argument.judgment.reasoning}
              </Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>📤 Share Result</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  deleteText: {
    ...typography.body,
    color: colors.error,
  },
  content: {
    padding: spacing.lg,
  },
  titleSection: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  winnerCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
  },
  winnerLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  winnerName: {
    ...typography.h2,
    marginBottom: spacing.md,
  },
  playButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  playButtonText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  turnCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
  },
  turnSpeaker: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  turnText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  judgmentCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  judgmentText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  shareButton: {
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  shareButtonText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
});
