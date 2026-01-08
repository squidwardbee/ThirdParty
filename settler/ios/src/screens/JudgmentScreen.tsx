import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Audio } from 'expo-av';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { colors, typography, spacing, borderRadius } from '../lib/theme';
import { api } from '../lib/api';
import { useAppStore } from '../lib/store';
import { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Judgment'>;

interface ArgumentData {
  id: string;
  personAName: string;
  personBName: string;
  judgment: {
    winner: 'person_a' | 'person_b' | 'tie';
    winnerName: string;
    reasoning: string;
    fullResponse: string;
    audioUrl?: string;
    researchPerformed: boolean;
    sources?: string[];
  } | null;
}

export default function JudgmentScreen({ navigation, route }: Props) {
  const { argumentId } = route.params;
  const [argument, setArgument] = useState<ArgumentData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);

  const soundRef = useRef<Audio.Sound | null>(null);
  const viewShotRef = useRef<ViewShot>(null);
  const addArgument = useAppStore((state) => state.addArgument);

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

      // Convert null to undefined for optional fields
      const judgment = data.judgment ? {
        ...data.judgment,
        audioUrl: data.judgment.audioUrl || undefined,
        sources: data.judgment.sources || undefined,
      } : null;

      setArgument({
        id: data.id,
        personAName: data.personAName,
        personBName: data.personBName,
        judgment,
      });

      // Add to local history
      const turns = (data.turns || []).map((t: any) => ({
        id: t.id,
        speaker: t.speaker,
        speakerName: t.speaker === 'person_a' ? data.personAName : data.personBName,
        transcription: t.transcription,
        audioUri: t.audioUrl || undefined,
        durationSeconds: t.durationSeconds || undefined,
      }));

      const storeJudgment = judgment ? {
        id: judgment.id,
        winner: judgment.winner as 'person_a' | 'person_b' | 'tie',
        winnerName: judgment.winnerName,
        reasoning: judgment.reasoning,
        fullResponse: judgment.fullResponse,
        audioUrl: judgment.audioUrl,
        researchPerformed: judgment.researchPerformed,
        sources: judgment.sources,
      } : undefined;

      addArgument({
        id: data.id,
        mode: data.mode as 'live' | 'turn_based',
        personAName: data.personAName,
        personBName: data.personBName,
        persona: data.persona as any,
        status: data.status as any,
        turns,
        judgment: storeJudgment,
        createdAt: data.createdAt,
      });
    } catch (error) {
      console.error('Failed to load argument:', error);
      Alert.alert('Error', 'Failed to load judgment');
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
      Alert.alert('Error', 'Failed to play audio');
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

  const handleScreenshot = async () => {
    if (!viewShotRef.current) return;

    try {
      // Capture the view as an image
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1,
      });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share Verdict Screenshot',
        });
      } else {
        // Fallback: Save to camera roll
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(uri);
          Alert.alert('Saved!', 'Screenshot saved to your photo library');
        } else {
          Alert.alert('Permission Required', 'Please grant permission to save photos');
        }
      }
    } catch (error) {
      console.error('Screenshot error:', error);
      Alert.alert('Error', 'Failed to capture screenshot');
    }
  };

  const handleDone = () => {
    navigation.popToTop();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading judgment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!argument?.judgment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>No judgment found</Text>
          <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const winnerColor =
    argument.judgment.winner === 'person_a'
      ? colors.personA
      : argument.judgment.winner === 'person_b'
      ? colors.personB
      : colors.secondary;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Capturable content */}
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
          <View style={styles.captureArea}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>The Verdict</Text>
              <Text style={styles.participants}>
                {argument.personAName} vs {argument.personBName}
              </Text>
            </View>

            {/* Winner Announcement */}
            <View style={[styles.winnerCard, { borderColor: winnerColor }]}>
              <Text style={styles.winnerEmoji}>🏆</Text>
              <Text style={styles.winnerLabel}>Winner</Text>
              <Text style={[styles.winnerName, { color: winnerColor }]}>
                {argument.judgment.winnerName}
              </Text>
            </View>

            {/* Reasoning */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reasoning</Text>
              <View style={styles.reasoningCard}>
                <Text style={styles.reasoningText}>
                  {argument.judgment.fullResponse || argument.judgment.reasoning}
                </Text>
              </View>
            </View>

            {/* Research Sources */}
            {argument.judgment.researchPerformed && argument.judgment.sources && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sources Consulted</Text>
                {argument.judgment.sources.map((source, index) => (
                  <Text key={index} style={styles.sourceText}>
                    • {source}
                  </Text>
                ))}
              </View>
            )}

            {/* Branding for screenshot */}
            <View style={styles.branding}>
              <Text style={styles.brandingText}>Settled with Settler</Text>
            </View>
          </View>
        </ViewShot>

        {/* Audio Playback - outside capture area */}
        {argument.judgment.audioUrl && (
          <TouchableOpacity style={styles.playButton} onPress={playAudio}>
            <Text style={styles.playButtonText}>
              {isPlaying ? '⏸️ Pause' : '▶️ Play Verdict'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.screenshotButton} onPress={handleScreenshot}>
            <Text style={styles.shareButtonText}>📸</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>📤 Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: spacing.lg,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  participants: {
    ...typography.body,
    color: colors.textSecondary,
  },
  winnerCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 3,
  },
  winnerEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  winnerLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  winnerName: {
    ...typography.h1,
  },
  playButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
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
  reasoningCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  reasoningText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  sourceText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  shareButton: {
    flex: 1,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  shareButtonText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  doneButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  doneButtonText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  captureArea: {
    backgroundColor: colors.bgPrimary,
    padding: spacing.md,
  },
  branding: {
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  brandingText: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  screenshotButton: {
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
  },
});
