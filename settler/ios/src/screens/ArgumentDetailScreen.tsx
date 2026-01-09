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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows } from '../lib/theme';
import { api } from '../lib/api';
import { RootStackParamList } from '../navigation';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

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

function TurnCard({
  turn,
  speakerName,
  expanded,
  onToggle,
  index,
}: {
  turn: ArgumentData['turns'][0];
  speakerName: string;
  expanded: boolean;
  onToggle: () => void;
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
            {speakerName}
          </Text>
        </View>
        <Text
          style={styles.turnText}
          numberOfLines={expanded ? undefined : 4}
        >
          {turn.transcription}
        </Text>
        <Pressable onPress={onToggle} hitSlop={8}>
          <Text style={styles.readMore}>
            {expanded ? 'Show less' : 'Show more'}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default function ArgumentDetailScreen({ navigation, route }: Props) {
  const { argumentId } = route.params;
  const [argument, setArgument] = useState<ArgumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [expandedTurns, setExpandedTurns] = useState<Record<string, boolean>>({});
  const [judgmentExpanded, setJudgmentExpanded] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
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

    loadArgument();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [argumentId]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  const loadArgument = async () => {
    try {
      const data = await api.getArgument(argumentId);
      setArgument(data as ArgumentData);
    } catch {
      Alert.alert('Error', 'Failed to load argument details');
    } finally {
      setLoading(false);
    }
  };

  const playAudio = async () => {
    if (!argument?.judgment?.audioUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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
  };

  const handleShare = async () => {
    if (!argument?.judgment) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    await Share.share({
      message: `Settler Judgment:\n\n${argument.personAName} vs ${argument.personBName}\n\nWinner: ${argument.judgment.winnerName}\n\n${argument.judgment.reasoning}`,
    });
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Alert.alert(
      'Delete Argument',
      'Are you sure you want to delete this argument? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await api.deleteArgument(argumentId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  if (loading || !argument) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0D0D0F', '#141416', '#0D0D0F']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <MaterialCommunityIcons
              name="scale-balance"
              size={48}
              color={colors.primary}
            />
            <Text style={styles.loadingText}>
              {loading ? 'Loading...' : 'Argument not found'}
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const winnerColor =
    argument.judgment?.winner === 'person_a'
      ? colors.personA
      : argument.judgment?.winner === 'person_b'
      ? colors.personB
      : colors.primary;

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={['#0D0D0F', '#141416', '#0D0D0F']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

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
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <View style={styles.backButton}>
              <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            </View>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.overline}>CASE DETAILS</Text>
          </View>
          <Pressable onPress={handleDelete} hitSlop={12}>
            <View style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </View>
          </Pressable>
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Title Section */}
          <Animated.View
            style={[
              styles.titleSection,
              { opacity: fadeAnim },
            ]}
          >
            <View style={styles.participantsRow}>
              <View style={styles.participantBadge}>
                <View style={[styles.participantDot, { backgroundColor: colors.personA }]} />
                <Text style={styles.participantName}>{argument.personAName}</Text>
              </View>
              <Text style={styles.vs}>VS</Text>
              <View style={styles.participantBadge}>
                <View style={[styles.participantDot, { backgroundColor: colors.personB }]} />
                <Text style={styles.participantName}>{argument.personBName}</Text>
              </View>
            </View>
            <Text style={styles.meta}>
              {new Date(argument.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </Animated.View>

          {/* Winner Card */}
          {argument.judgment && (
            <Animated.View
              style={[
                styles.winnerCard,
                { opacity: fadeAnim },
              ]}
            >
              <View style={[styles.winnerAccent, { backgroundColor: winnerColor }]} />
              <View style={styles.winnerContent}>
                <View style={styles.winnerHeader}>
                  <MaterialCommunityIcons
                    name={argument.judgment.winner === 'tie' ? 'scale-balance' : 'trophy'}
                    size={24}
                    color={winnerColor}
                  />
                  <Text style={styles.winnerLabel}>
                    {argument.judgment.winner === 'tie' ? 'TIE' : 'WINNER'}
                  </Text>
                </View>
                <Text style={[styles.winnerName, { color: winnerColor }]}>
                  {argument.judgment.winnerName}
                </Text>

                {argument.judgment.audioUrl && (
                  <Pressable onPress={playAudio}>
                    <LinearGradient
                      colors={[colors.primary, colors.primaryDark]}
                      style={styles.playButton}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons
                        name={isPlaying ? 'pause' : 'play'}
                        size={18}
                        color={colors.textInverse}
                      />
                      <Text style={styles.playButtonText}>
                        {isPlaying ? 'Pause Audio' : 'Play Verdict'}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                )}
              </View>
            </Animated.View>
          )}

          {/* Arguments Section */}
          <Animated.View
            style={[
              styles.section,
              { opacity: fadeAnim },
            ]}
          >
            <Text style={styles.sectionTitle}>ARGUMENTS</Text>
            {argument.turns.map((turn, index) => {
              const expanded = expandedTurns[turn.id];
              const speakerName = turn.speaker === 'person_a'
                ? argument.personAName
                : argument.personBName;
              return (
                <TurnCard
                  key={turn.id}
                  turn={turn}
                  speakerName={speakerName}
                  expanded={!!expanded}
                  onToggle={() =>
                    setExpandedTurns((p) => ({
                      ...p,
                      [turn.id]: !expanded,
                    }))
                  }
                  index={index}
                />
              );
            })}
          </Animated.View>

          {/* Judgment Section */}
          {argument.judgment && (
            <Animated.View
              style={[
                styles.section,
                { opacity: fadeAnim },
              ]}
            >
              <Text style={styles.sectionTitle}>VERDICT REASONING</Text>
              <View style={styles.judgmentCard}>
                <Text
                  style={styles.judgmentText}
                  numberOfLines={judgmentExpanded ? undefined : 6}
                >
                  {argument.judgment.fullResponse || argument.judgment.reasoning}
                </Text>
                <Pressable
                  onPress={() => setJudgmentExpanded((p) => !p)}
                  hitSlop={8}
                >
                  <Text style={styles.readMore}>
                    {judgmentExpanded ? 'Show less' : 'Show more'}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          )}

          {/* Share Button */}
          <Animated.View style={{ opacity: fadeAnim }}>
            <Pressable onPress={handleShare}>
              <View style={styles.shareButton}>
                <Ionicons name="share-outline" size={20} color={colors.textPrimary} />
                <Text style={styles.shareButtonText}>Share Result</Text>
              </View>
            </Pressable>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
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
  backButton: {
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
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.error}15`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${colors.error}30`,
  },

  // Content
  content: {
    padding: spacing.screenPadding,
    paddingBottom: spacing.xxl,
  },

  // Title Section
  titleSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  participantBadge: {
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
    ...typography.overline,
    color: colors.textMuted,
    marginHorizontal: spacing.md,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
  },

  // Winner Card
  winnerCard: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.card,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.md,
  },
  winnerAccent: {
    width: 4,
  },
  winnerContent: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
  },
  winnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  winnerLabel: {
    ...typography.overline,
    color: colors.textMuted,
  },
  winnerName: {
    ...typography.h2,
    marginBottom: spacing.md,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.button,
    ...shadows.glow,
  },
  playButtonText: {
    ...typography.button,
    color: colors.textInverse,
    fontSize: 14,
  },

  // Section
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.overline,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },

  // Turn Card
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
  readMore: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.sm,
  },

  // Judgment Card
  judgmentCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  judgmentText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 24,
  },

  // Share Button
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.button,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  shareButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
});
