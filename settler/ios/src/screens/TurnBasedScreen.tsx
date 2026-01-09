import React, { useState, useEffect, useRef } from 'react';
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
import { Turn } from '../lib/store';
import { api } from '../lib/api';
import { RootStackParamList } from '../navigation';
import { startRecording as startAudioRecording, stopRecording as stopAudioRecording, cleanupRecording, requestPermissions } from '../lib/audio';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'TurnBased'>;

function TurnCard({
  turn,
  index,
}: {
  turn: Turn;
  index: number;
}) {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const speakerColor = turn.speaker === 'person_a' ? colors.personA : colors.personB;

  return (
    <Animated.View
      style={[
        styles.turnCard,
        {
          opacity: opacityAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <View style={[styles.turnAccent, { backgroundColor: speakerColor }]} />
      <View style={styles.turnContent}>
        <View style={styles.turnHeader}>
          <View style={[styles.turnDot, { backgroundColor: speakerColor }]} />
          <Text style={[styles.turnSpeaker, { color: speakerColor }]}>
            {turn.speakerName}
          </Text>
        </View>
        <Text style={styles.turnText}>{turn.transcription}</Text>
      </View>
    </Animated.View>
  );
}

export default function TurnBasedScreen({ navigation, route }: Props) {
  const { personAName, personBName, persona } = route.params;

  const [currentSpeaker, setCurrentSpeaker] = useState<'person_a' | 'person_b'>('person_a');
  const [isRecording, setIsRecording] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentSpeakerName = currentSpeaker === 'person_a' ? personAName : personBName;
  const speakerColor = currentSpeaker === 'person_a' ? colors.personA : colors.personB;

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
      cleanupRecording();
    };
  }, []);

  // Pulsing animation when recording
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 800,
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

  const startRecording = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      setIsRecording(false);
      setCurrentTranscript('Transcribing...');

      const uri = await stopAudioRecording();

      if (!uri) {
        throw new Error('No recording URI');
      }

      console.log('[Transcribe] Reading audio file:', uri);
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('[Transcribe] Audio base64 length:', base64Audio.length);

      console.log('[Transcribe] Sending to API...');
      const result = await api.transcribeAudio(base64Audio);
      const transcript = result.transcription || `[${currentSpeakerName}'s argument - transcription failed]`;
      console.log('[Transcribe] Got transcription:', transcript.substring(0, 100));

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (turns.length < 2) {
      Alert.alert('Not Enough Arguments', 'Each person needs to make at least one argument.');
      return;
    }

    setIsSubmitting(true);

    try {
      const argument = await api.createArgument({
        mode: 'turn_based',
        personAName,
        personBName,
        persona,
      });

      for (const turn of turns) {
        await api.addTurn(argument.id, {
          speaker: turn.speaker,
          transcription: turn.transcription,
          audioUrl: turn.audioUri,
        });
      }

      navigation.replace('Processing', { argumentId: argument.id });
    } catch (error) {
      console.error('Failed to submit argument:', error);
      Alert.alert('Error', 'Failed to submit argument for judgment');
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const handleSwitchSpeaker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentSpeaker((prev) => (prev === 'person_a' ? 'person_b' : 'person_a'));
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
            <Text style={styles.overline}>TURN-BASED</Text>
            <Text style={styles.title}>Arguments</Text>
          </View>
          <View style={styles.turnCounter}>
            <Text style={styles.turnCounterText}>{turns.length}</Text>
          </View>
        </Animated.View>

        {/* Turns List */}
        <Animated.View style={[styles.turnsWrapper, { opacity: fadeAnim }]}>
          <ScrollView
            style={styles.turnsList}
            contentContainerStyle={styles.turnsContent}
            showsVerticalScrollIndicator={false}
          >
            {turns.map((turn, index) => (
              <TurnCard key={turn.id} turn={turn} index={index} />
            ))}

            {turns.length === 0 && (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <MaterialCommunityIcons
                    name="microphone-message"
                    size={40}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.emptyTitle}>No arguments yet</Text>
                <Text style={styles.emptySubtext}>
                  {currentSpeakerName} will go first
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>

        {/* Current Speaker Section */}
        <Animated.View
          style={[
            styles.currentSpeakerSection,
            { opacity: fadeAnim },
          ]}
        >
          <View style={styles.speakerRow}>
            <View style={[styles.speakerBadge, { backgroundColor: `${speakerColor}15`, borderColor: `${speakerColor}40` }]}>
              <View style={[styles.speakerDot, { backgroundColor: speakerColor }]} />
              <Text style={[styles.speakerName, { color: speakerColor }]}>
                {currentSpeakerName}'s Turn
              </Text>
            </View>
            {!isRecording && (
              <Pressable onPress={handleSwitchSpeaker} hitSlop={8}>
                <View style={styles.switchButton}>
                  <Ionicons name="swap-horizontal" size={18} color={colors.textSecondary} />
                  <Text style={styles.switchButtonText}>Switch</Text>
                </View>
              </Pressable>
            )}
          </View>

          {/* Transcript Display */}
          {currentTranscript ? (
            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptText}>{currentTranscript}</Text>
            </View>
          ) : null}
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
          ) : (
            <>
              {/* Record Button */}
              <View style={styles.recordButtonContainer}>
                {isRecording && (
                  <Animated.View
                    style={[
                      styles.recordGlow,
                      {
                        opacity: glowAnim,
                        transform: [{ scale: pulseAnim }],
                      },
                    ]}
                  />
                )}
                <Animated.View style={{ transform: [{ scale: isRecording ? pulseAnim : 1 }] }}>
                  <Pressable
                    onPress={isRecording ? stopRecording : startRecording}
                  >
                    <View
                      style={[
                        styles.recordButton,
                        isRecording && styles.recordButtonActive,
                      ]}
                    >
                      <View
                        style={[
                          styles.recordInner,
                          isRecording && styles.recordInnerActive,
                        ]}
                      />
                    </View>
                  </Pressable>
                </Animated.View>
              </View>

              <Text style={styles.recordHint}>
                {isRecording ? 'Tap to stop recording' : 'Tap to start recording'}
              </Text>

              {/* Judge Button */}
              {turns.length >= 2 && !isRecording && (
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <Pressable
                    onPress={handleJudge}
                    onPressIn={handleButtonPressIn}
                    onPressOut={handleButtonPressOut}
                  >
                    <LinearGradient
                      colors={[colors.primary, colors.primaryDark]}
                      style={styles.judgeButton}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <MaterialCommunityIcons
                        name="gavel"
                        size={20}
                        color={colors.textInverse}
                      />
                      <Text style={styles.judgeButtonText}>Get Judgment</Text>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              )}
            </>
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
  turnCounter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  turnCounterText: {
    ...typography.bodyMedium,
    color: colors.primary,
  },

  // Turns List
  turnsWrapper: {
    flex: 1,
  },
  turnsList: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
  },
  turnsContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  turnCard: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.card,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  turnAccent: {
    width: 4,
  },
  turnContent: {
    flex: 1,
    padding: spacing.md,
  },
  turnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  turnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  turnSpeaker: {
    ...typography.caption,
    fontWeight: '600',
  },
  turnText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textMuted,
  },

  // Current Speaker Section
  currentSpeakerSection: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  speakerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  speakerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  speakerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  speakerName: {
    ...typography.bodyMedium,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchButtonText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  transcriptBox: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transcriptText: {
    ...typography.body,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  // Controls
  controls: {
    padding: spacing.screenPadding,
    alignItems: 'center',
  },
  recordButtonContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  recordGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.error,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.error,
    ...shadows.sm,
  },
  recordButtonActive: {
    backgroundColor: `${colors.error}15`,
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
    borderRadius: 6,
  },
  recordHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  judgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.button,
    gap: spacing.sm,
    ...shadows.glow,
  },
  judgeButtonText: {
    ...typography.button,
    color: colors.textInverse,
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
