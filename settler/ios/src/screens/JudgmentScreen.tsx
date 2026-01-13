import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Share,
  Alert,
  Animated,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Audio } from 'expo-av';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows, animation, getParticipantColors } from '../lib/theme';
import { api } from '../lib/api';
import { useAppStore } from '../lib/store';
import { RootStackParamList } from '../navigation';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Image, Dimensions } from 'react-native';

const winnerOverlay = require('../../assets/winner-overlay.png');

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
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const soundRef = useRef<Audio.Sound | null>(null);
  const viewShotRef = useRef<ViewShot>(null);
  const selfieViewShotRef = useRef<ViewShot>(null);
  const addArgument = useAppStore((state) => state.addArgument);

  useEffect(() => {
    loadArgument();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [argumentId]);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'We need access to your camera to take a selfie.'
        );
      }
    })();
  }, []);

  // Entrance animation
  useEffect(() => {
    if (!loading && argument?.judgment) {
      // Dramatic reveal sequence
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      // Glow pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.5,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [loading, argument]);

  // Auto-play audio when judgment loads
  useEffect(() => {
    if (argument?.judgment?.audioUrl && !hasAutoPlayed && !loading) {
      setHasAutoPlayed(true);
      setTimeout(() => playAudioAuto(), 800); // Delay for dramatic effect
    }
  }, [argument, loading, hasAutoPlayed]);

  const playAudioAuto = async () => {
    if (!argument?.judgment?.audioUrl) return;

    try {
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
      console.error('Failed to auto-play audio:', error);
    }
  };

  const loadArgument = async () => {
    try {
      const data = await api.getArgument(argumentId);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!argument?.judgment) return;

    try {
      await Share.share({
        message: `The Verdict\n\n${argument.personAName} vs ${argument.personBName}\n\nWinner: ${argument.judgment.winnerName}\n\n${argument.judgment.reasoning}\n\n— Settled with ThirdParty`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleScreenshot = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Use selfie view if available, otherwise use the judgment card
    const targetRef = selfieUri && selfieViewShotRef.current ? selfieViewShotRef : viewShotRef;
    if (!targetRef.current) return;

    try {
      const uri = await captureRef(targetRef, {
        format: 'png',
        quality: 1,
      });

      // Save to photo library first
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        await MediaLibrary.saveToLibraryAsync(uri);
      }

      // Then open share sheet
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share Your Victory',
        });
      } else {
        Alert.alert('Saved!', 'Image saved to your photo library');
      }
    } catch (error) {
      console.error('Screenshot error:', error);
      Alert.alert('Error', 'Failed to capture screenshot');
    }
  };

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.popToTop();
  };

  const handleTakeSelfie = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 1,
        cameraType: ImagePicker.CameraType.front,
      });

      if (!result.canceled) {
        setSelfieUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.bgPrimary, colors.bgSecondary]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Preparing the verdict...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (!argument?.judgment) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.bgPrimary, colors.bgSecondary]}
          style={StyleSheet.absoluteFillObject}
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
            <Text style={styles.errorText}>No verdict found</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleDone}>
              <Text style={styles.primaryButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const winnerColors = argument.judgment.winner === 'tie'
    ? { main: colors.primary, bg: colors.primaryMuted }
    : getParticipantColors(argument.judgment.winner);

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={[colors.bgPrimary, colors.bgSecondary, colors.bgPrimary]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Spotlight glow behind winner card */}
      <Animated.View style={[styles.spotlightGlow, { opacity: glowAnim }]}>
        <LinearGradient
          colors={[`${winnerColors.main}20`, 'transparent']}
          style={styles.spotlightGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      <SafeAreaView style={styles.safeArea}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={handleDone}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Capturable content */}
          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
            <View style={styles.captureArea}>
              {/* Header */}
              <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                <Text style={styles.overline}>THE VERDICT</Text>
                <Text style={styles.matchup}>
                  {argument.personAName} vs {argument.personBName}
                </Text>
              </Animated.View>

              {/* Winner Card */}
              <Animated.View
                style={[
                  styles.winnerCard,
                  {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                    borderColor: winnerColors.main,
                  },
                ]}
              >
                <View style={[styles.trophyContainer, { backgroundColor: `${winnerColors.main}15` }]}>
                  <MaterialCommunityIcons
                    name={argument.judgment.winner === 'tie' ? 'scale-balance' : 'trophy'}
                    size={40}
                    color={winnerColors.main}
                  />
                </View>

                <Text style={styles.winnerLabel}>
                  {argument.judgment.winner === 'tie' ? "IT'S A TIE" : 'WINNER'}
                </Text>

                <Text style={[styles.winnerName, { color: winnerColors.main }]}>
                  {argument.judgment.winnerName}
                </Text>

                {/* Audio controls inline */}
                {argument.judgment.audioUrl && (
                  <Pressable
                    style={styles.audioControl}
                    onPress={playAudio}
                  >
                    <View style={[styles.audioButton, { backgroundColor: `${winnerColors.main}20` }]}>
                      <Ionicons
                        name={isPlaying ? 'pause' : 'play'}
                        size={18}
                        color={winnerColors.main}
                      />
                    </View>
                    <Text style={styles.audioText}>
                      {isPlaying ? 'Playing...' : 'Listen to verdict'}
                    </Text>
                  </Pressable>
                )}
              </Animated.View>

              {/* Reasoning */}
              <Animated.View
                style={[
                  styles.reasoningSection,
                  { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                ]}
              >
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsReasoningExpanded(!isReasoningExpanded);
                  }}
                >
                  <View style={styles.reasoningHeader}>
                    <Text style={styles.reasoningLabel}>THE REASONING</Text>
                    <Ionicons
                      name={isReasoningExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </View>

                  <View style={styles.reasoningCard}>
                    <Text
                      style={styles.reasoningText}
                      numberOfLines={isReasoningExpanded ? undefined : 4}
                    >
                      {argument.judgment.fullResponse || argument.judgment.reasoning}
                    </Text>

                    {!isReasoningExpanded && (
                      <LinearGradient
                        colors={['transparent', colors.bgCard]}
                        style={styles.reasoningFade}
                      />
                    )}
                  </View>

                  {!isReasoningExpanded && (
                    <Text style={styles.expandHint}>Tap to read full reasoning</Text>
                  )}
                </Pressable>
              </Animated.View>

              {/* Branding */}
              <View style={styles.branding}>
                <View style={styles.brandingLine} />
                <Text style={styles.brandingText}>Settled with ThirdParty</Text>
                <View style={styles.brandingLine} />
              </View>
            </View>

            {selfieUri && (
              <ViewShot ref={selfieViewShotRef} options={{ format: 'png', quality: 1 }} style={styles.selfieContainer}>
                <Image
                  source={{ uri: selfieUri }}
                  style={styles.selfieImage}
                />
                <Image
                  source={winnerOverlay}
                  style={styles.selfieFrame}
                />
              </ViewShot>
            )}
          </ViewShot>

          {/* Actions */}
          <Animated.View style={[styles.actions, { opacity: fadeAnim }]}>
            <TouchableOpacity
              style={[styles.actionButton, selfieUri && styles.actionButtonActive]}
              onPress={handleTakeSelfie}
              activeOpacity={0.7}
            >
              <Feather name="user" size={20} color={selfieUri ? colors.primary : colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleScreenshot}
              activeOpacity={0.7}
            >
              <Feather name="share-2" size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleDone}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Done</Text>
            </TouchableOpacity>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.screenPadding,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },

  // Spotlight
  spotlightGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 500,
    zIndex: 0,
  },
  spotlightGradient: {
    flex: 1,
    borderBottomLeftRadius: 300,
    borderBottomRightRadius: 300,
  },

  // Capture area
  captureArea: {
    backgroundColor: colors.bgPrimary,
    paddingVertical: spacing.lg,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.xl,
  },
  overline: {
    ...typography.overline,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  matchup: {
    ...typography.body,
    color: colors.textSecondary,
  },

  // Winner Card
  winnerCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    borderWidth: 2,
    ...shadows.lg,
  },
  trophyContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  winnerLabel: {
    ...typography.overline,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  winnerName: {
    ...typography.hero,
    fontSize: 36,
    textAlign: 'center',
  },
  audioControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  audioButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioText: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  // Reasoning
  reasoningSection: {
    marginBottom: spacing.lg,
  },
  reasoningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  reasoningLabel: {
    ...typography.overline,
    color: colors.textMuted,
  },
  reasoningCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    overflow: 'hidden',
  },
  reasoningText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 26,
  },
  reasoningFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  expandHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  // Branding
  branding: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  brandingLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
    maxWidth: 60,
  },
  brandingText: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  // Actions
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionButton: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.bgTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGlow,
  },
  primaryButton: {
    flex: 1,
    height: 52,
    borderRadius: borderRadius.button,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.glow,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
  selfieContainer: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    width: 180,
    height: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  selfieImage: {
    position: 'absolute',
    top: '12%',
    left: '5%',
    right: '5%',
    bottom: '12%',
    borderRadius: 4,
  },
  selfieFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'stretch',
  },
});
