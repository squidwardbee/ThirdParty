import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system/legacy';
import { colors, typography, spacing, borderRadius } from '../lib/theme';
import { useAppStore, Turn } from '../lib/store';
import { api } from '../lib/api';
import { RootStackParamList } from '../navigation';
import { startRecording as startAudioRecording, stopRecording as stopAudioRecording, cleanupRecording, requestPermissions } from '../lib/audio';
import * as Haptics from 'expo-haptics';
import { FontAwesome5 } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'TurnBased'>;

export default function TurnBasedScreen({ navigation, route }: Props) {
  const { personAName, personBName, persona } = route.params;

  const [currentSpeaker, setCurrentSpeaker] = useState<'person_a' | 'person_b'>('person_a');
  const [isRecording, setIsRecording] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentSpeakerName = currentSpeaker === 'person_a' ? personAName : personBName;
  const speakerColor = currentSpeaker === 'person_a' ? colors.personA : colors.personB;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, []);

  const startRecording = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      // Request permissions first
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert('Permission Required', 'Microphone access is needed to record arguments.');
        return;
      }

      await startAudioRecording();
      setIsRecording(true);
      setCurrentTranscript('Recording... Tap stop when finished.');
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
    try {
      setIsRecording(false);
      setCurrentTranscript('Transcribing...');

      const uri = await stopAudioRecording();

      if (!uri) {
        throw new Error('No recording URI');
      }

      // Read audio file and convert to base64
      console.log('[Transcribe] Reading audio file:', uri);
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('[Transcribe] Audio base64 length:', base64Audio.length);

      // Send to API for transcription
      console.log('[Transcribe] Sending to API...');
      const result = await api.transcribeAudio(base64Audio);
      const transcript = result.transcription || `[${currentSpeakerName}'s argument - transcription failed]`;
      console.log('[Transcribe] Got transcription:', transcript.substring(0, 100));

      // Add turn
      const newTurn: Turn = {
        id: `turn-${Date.now()}`,
        speaker: currentSpeaker,
        speakerName: currentSpeakerName,
        transcription: transcript,
        audioUri: uri,
      };

      setTurns((prev) => [...prev, newTurn]);
      setCurrentTranscript('');

      // Switch speaker
      setCurrentSpeaker((prev) => (prev === 'person_a' ? 'person_b' : 'person_a'));
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to transcribe recording. Please try again.');
      setCurrentTranscript('');
    }
  };

  const handleJudge = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (turns.length < 2) {
      Alert.alert('Not Enough Arguments', 'Each person needs to make at least one argument.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create argument on server
      const argument = await api.createArgument({
        mode: 'turn_based',
        personAName,
        personBName,
        persona,
      });

      // Add turns
      for (const turn of turns) {
        await api.addTurn(argument.id, {
          speaker: turn.speaker,
          transcription: turn.transcription,
          audioUrl: turn.audioUri,
        });
      }

      // Navigate to processing screen
      navigation.replace('Processing', { argumentId: argument.id });
    } catch (error) {
      console.error('Failed to submit argument:', error);
      Alert.alert('Error', 'Failed to submit argument for judgment');
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Argument',
      'Are you sure you want to cancel? All recordings will be lost.',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Turn-Based</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Turns List */}
        <ScrollView style={styles.turnsList}>
          {turns.map((turn, index) => (
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
              <Text style={styles.turnSpeaker}>{turn.speakerName}</Text>
              <Text style={styles.turnText}>{turn.transcription}</Text>
            </View>
          ))}

          {turns.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No arguments yet</Text>
              <Text style={styles.emptySubtext}>
                {currentSpeakerName} will go first
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Current Speaker */}
        <View style={styles.currentSpeakerSection}>
          <View style={[styles.speakerBadge, { backgroundColor: speakerColor + '20' }]}>
            <View style={[styles.speakerDot, { backgroundColor: speakerColor }]} />
            <Text style={[styles.speakerName, { color: speakerColor }]}>
              {currentSpeakerName}'s Turn
            </Text>
          </View>

          {/* Transcript Display */}
          {currentTranscript ? (
            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptText}>{currentTranscript}</Text>
            </View>
          ) : null}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Record Button */}
          <TouchableOpacity
            style={[
              styles.recordButton,
              isRecording && styles.recordButtonActive,
            ]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isSubmitting}
          >
            <View style={[styles.recordInner, isRecording && styles.recordInnerActive]} />
          </TouchableOpacity>

          <Text style={styles.recordHint}>
            {isRecording ? 'Tap to stop' : 'Tap to record'}
          </Text>

          {/* Switch Speaker Button */}
          {!isRecording && (
            <TouchableOpacity
              style={styles.switchButton}
              onPress={() =>
                setCurrentSpeaker((prev) =>
                  prev === 'person_a' ? 'person_b' : 'person_a'
                )
              }
            >
              <Text style={styles.switchButtonText}>Switch Speaker</Text>
            </TouchableOpacity>
          )}

          {/* Judge Button */}
          {turns.length >= 2 && !isRecording && (
            <TouchableOpacity
              style={styles.judgeButton}
              onPress={handleJudge}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Text style={styles.judgeButtonText}>Submitting...</Text>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <FontAwesome5
                    name="balance-scale"
                    size={16}
                    color={colors.textInverse}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.judgeButtonText}>Get Judgment</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelText: {
    ...typography.body,
    color: colors.error,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  turnsList: {
    flex: 1,
    padding: spacing.md,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.h3,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textMuted,
  },
  currentSpeakerSection: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  speakerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  speakerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  speakerName: {
    ...typography.bodyMedium,
  },
  transcriptBox: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 60,
  },
  transcriptText: {
    ...typography.body,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  controls: {
    padding: spacing.lg,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.bgTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.error,
  },
  recordButtonActive: {
    borderColor: colors.error,
  },
  recordInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.error,
  },
  recordInnerActive: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  recordHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  switchButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  switchButtonText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  judgeButton: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  judgeButtonText: {
    ...typography.bodyMedium,
    color: colors.textInverse,
  },
});
