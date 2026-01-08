import React, { useState, useRef, useEffect } from 'react';
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
import { api } from '../lib/api';
import { RootStackParamList } from '../navigation';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { startRecording as startAudioRecording, stopRecording as stopAudioRecording, cleanupRecording, requestPermissions } from '../lib/audio';
import * as Haptics from 'expo-haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'LiveMode'>;

export default function LiveModeScreen({ navigation, route }: Props) {
  const { personAName, personBName, persona } = route.params;

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      cleanupRecording();
    };
  }, []);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert('Permission Required', 'Microphone access is needed to record.');
        return;
      }

      await startAudioRecording();
      setIsRecording(true);
      setRecordingDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      // Simulate live transcription updates
      setTranscript('Listening to conversation...\n\n');
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopAndJudge = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);
    setTranscript('Stopping recording...');

    try {
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const uri = await stopAudioRecording();
      setIsRecording(false);

      if (!uri) {
        throw new Error('No recording URI');
      }

      // Transcribe the audio
      setTranscript('Transcribing conversation...');
      console.log('[LiveMode] Reading audio file:', uri);
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('[LiveMode] Audio base64 length:', base64Audio.length);

      console.log('[LiveMode] Sending to API for transcription...');
      const transcriptionResult = await api.transcribeAudio(base64Audio);
      const transcriptionText = transcriptionResult.transcription || '[Transcription failed]';
      console.log('[LiveMode] Got transcription:', transcriptionText.substring(0, 100));

      setTranscript('Creating judgment...');

      // Create argument on server
      const argument = await api.createArgument({
        mode: 'live',
        personAName,
        personBName,
        persona,
      });

      // Add a single turn with the transcribed conversation
      await api.addTurn(argument.id, {
        speaker: 'person_a',
        transcription: transcriptionText,
        audioUrl: uri,
        durationSeconds: recordingDuration,
      });

      // Navigate to processing
      navigation.replace('Processing', { argumentId: argument.id });
    } catch (error) {
      console.error('Failed to submit:', error);
      Alert.alert('Error', 'Failed to submit for judgment');
      setIsSubmitting(false);
      setTranscript('');
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Recording',
      'Are you sure? The recording will be lost.',
      [
        { text: 'Keep Recording', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            await cleanupRecording();
            navigation.goBack();
          },
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
          <Text style={styles.title}>Live Mode</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Participants */}
        <View style={styles.participants}>
          <View style={styles.participant}>
            <View style={[styles.participantDot, { backgroundColor: colors.personA }]} />
            <Text style={styles.participantName}>{personAName}</Text>
          </View>
          <Text style={styles.vs}>vs</Text>
          <View style={styles.participant}>
            <View style={[styles.participantDot, { backgroundColor: colors.personB }]} />
            <Text style={styles.participantName}>{personBName}</Text>
          </View>
        </View>

        {/* Recording Status */}
        <View style={styles.statusSection}>
          {isRecording ? (
            <>
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Recording</Text>
              </View>
              <Text style={styles.duration}>{formatDuration(recordingDuration)}</Text>
            </>
          ) : (
            <Text style={styles.instructionText}>
              Tap the button below to start recording your conversation
            </Text>
          )}
        </View>

        {/* Live Transcript */}
        <ScrollView style={styles.transcriptContainer}>
          <Text style={styles.transcriptLabel}>Live Transcript</Text>
          <View style={styles.transcriptBox}>
            {transcript ? (
              <Text style={styles.transcriptText}>{transcript}</Text>
            ) : (
              <Text style={styles.transcriptPlaceholder}>
                Transcript will appear here as you speak...
              </Text>
            )}
          </View>
        </ScrollView>

       {/* Controls */}
        <View style={styles.controls}>
          {!isRecording ? (
            <TouchableOpacity
              style={styles.startButton}
              onPress={startRecording}
              disabled={isSubmitting}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="mic-outline" size={20} color={colors.textPrimary} style={{ marginRight: 8 }} />
                <Text style={styles.startButtonText}>Start Recording</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.stopButton}
              onPress={stopAndJudge}
              disabled={isSubmitting}
            >
              <Text style={styles.stopButtonText}>
                {isSubmitting ? ' Submitting...' : ' End & Get Judgment'}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.hint}>
            {isRecording
              ? 'Have your conversation naturally. Tap when finished.'
              : 'Both people should speak clearly into the device'}
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
  participants: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  participant: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  participantDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  participantName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  vs: {
    ...typography.caption,
    color: colors.textMuted,
  },
  statusSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.error,
    marginRight: spacing.sm,
  },
  recordingText: {
    ...typography.bodyMedium,
    color: colors.error,
  },
  duration: {
    ...typography.hero,
    color: colors.textPrimary,
  },
  instructionText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  transcriptContainer: {
    flex: 1,
    padding: spacing.md,
  },
  transcriptLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  transcriptBox: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    minHeight: 150,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transcriptText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  transcriptPlaceholder: {
    ...typography.body,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  controls: {
    padding: spacing.lg,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  startButtonText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 18,
  },
  stopButton: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  stopButtonText: {
    ...typography.bodyMedium,
    color: colors.textInverse,
    fontSize: 18,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
