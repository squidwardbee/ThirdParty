import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Pressable,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows } from '../lib/theme';
import { api } from '../lib/api';
import { RootStackParamList } from '../navigation';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation
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

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      cleanupRecording();
    };
  }, []);

  // Pulsing animation when recording
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.8,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      pulse.start();
      glow.start();

      return () => {
        pulse.stop();
        glow.stop();
        pulseAnim.setValue(1);
        glowAnim.setValue(0.3);
      };
    }
  }, [isRecording]);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const handleButtonPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handleButtonPressOut = () => {
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
          <Pressable onPress={handleCancel} hitSlop={12}>
            <View style={styles.cancelButton}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </View>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.overline}>LIVE MODE</Text>
            <Text style={styles.title}>Recording</Text>
          </View>
          <View style={{ width: 40 }} />
        </Animated.View>

        {/* Participants */}
        <Animated.View
          style={[
            styles.participants,
            { opacity: fadeAnim },
          ]}
        >
          <View style={styles.participant}>
            <View style={[styles.participantDot, { backgroundColor: colors.personA }]} />
            <Text style={styles.participantName}>{personAName}</Text>
          </View>
          <View style={styles.vsDivider}>
            <View style={styles.vsLine} />
            <Text style={styles.vs}>VS</Text>
            <View style={styles.vsLine} />
          </View>
          <View style={styles.participant}>
            <View style={[styles.participantDot, { backgroundColor: colors.personB }]} />
            <Text style={styles.participantName}>{personBName}</Text>
          </View>
        </Animated.View>

        {/* Recording Status */}
        <Animated.View
          style={[
            styles.statusSection,
            { opacity: fadeAnim },
          ]}
        >
          {isRecording ? (
            <View style={styles.recordingDisplay}>
              {/* Pulsing glow ring */}
              <Animated.View
                style={[
                  styles.glowRing,
                  {
                    opacity: glowAnim,
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.recordingIndicator,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <View style={styles.recordingDotOuter}>
                  <View style={styles.recordingDot} />
                </View>
              </Animated.View>
              <Text style={styles.duration}>{formatDuration(recordingDuration)}</Text>
              <Text style={styles.recordingLabel}>Recording in progress</Text>
            </View>
          ) : (
            <View style={styles.idleDisplay}>
              <View style={styles.micIconContainer}>
                <Ionicons name="mic-outline" size={48} color={colors.primary} />
              </View>
              <Text style={styles.instructionText}>
                Tap to start recording your conversation
              </Text>
              <Text style={styles.instructionSubtext}>
                Both participants should speak clearly
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Live Transcript */}
        <Animated.View style={[styles.transcriptWrapper, { opacity: fadeAnim }]}>
          <Text style={styles.transcriptLabel}>TRANSCRIPT</Text>
          <ScrollView
            style={styles.transcriptContainer}
            contentContainerStyle={styles.transcriptContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.transcriptBox}>
              {transcript ? (
                <Text style={styles.transcriptText}>{transcript}</Text>
              ) : (
                <View style={styles.transcriptPlaceholderContainer}>
                  <MaterialCommunityIcons
                    name="text-box-outline"
                    size={24}
                    color={colors.textMuted}
                  />
                  <Text style={styles.transcriptPlaceholder}>
                    Transcript will appear here as you speak...
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </Animated.View>

        {/* Controls */}
        <Animated.View
          style={[
            styles.controls,
            { opacity: fadeAnim },
          ]}
        >
          {isSubmitting ? (
            <View style={styles.submittingContainer}>
              <View style={styles.submittingIndicator}>
                <MaterialCommunityIcons
                  name="scale-balance"
                  size={32}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.submittingText}>Preparing judgment...</Text>
            </View>
          ) : !isRecording ? (
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <Pressable
                onPress={startRecording}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.startButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="mic" size={24} color={colors.textInverse} />
                  <Text style={styles.startButtonText}>Start Recording</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          ) : (
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <Pressable
                onPress={stopAndJudge}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
              >
                <View style={styles.stopButton}>
                  <MaterialCommunityIcons
                    name="gavel"
                    size={24}
                    color={colors.textPrimary}
                  />
                  <Text style={styles.stopButtonText}>End & Get Judgment</Text>
                </View>
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>
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
    bottom: 100,
    left: -100,
    backgroundColor: colors.secondary,
    opacity: 0.06,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerCenter: {
    alignItems: 'center',
  },
  overline: {
    ...typography.overline,
    color: colors.primary,
    marginBottom: spacing.xxs,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },

  // Participants
  participants: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.screenPadding,
  },
  participant: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  participantDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  participantName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  vsDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  vsLine: {
    width: 20,
    height: 1,
    backgroundColor: colors.border,
  },
  vs: {
    ...typography.overline,
    color: colors.textMuted,
    marginHorizontal: spacing.sm,
  },

  // Status Section
  statusSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    minHeight: 200,
  },
  recordingDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.error,
  },
  recordingIndicator: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${colors.error}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  recordingDotOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${colors.error}40`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.error,
  },
  duration: {
    ...typography.hero,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  recordingLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  idleDisplay: {
    alignItems: 'center',
  },
  micIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  instructionText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  instructionSubtext: {
    ...typography.caption,
    color: colors.textMuted,
  },

  // Transcript
  transcriptWrapper: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
  },
  transcriptLabel: {
    ...typography.overline,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  transcriptContainer: {
    flex: 1,
  },
  transcriptContent: {
    flexGrow: 1,
  },
  transcriptBox: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 120,
  },
  transcriptText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  transcriptPlaceholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  transcriptPlaceholder: {
    ...typography.body,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Controls
  controls: {
    padding: spacing.screenPadding,
    alignItems: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.button,
    gap: spacing.sm,
    ...shadows.glow,
  },
  startButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.button,
    backgroundColor: colors.bgCard,
    borderWidth: 2,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  stopButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  submittingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  submittingIndicator: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  submittingText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
});
