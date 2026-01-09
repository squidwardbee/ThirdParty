import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows, getParticipantColors } from '../lib/theme';
import { useArguments, Argument, useAppStore } from '../lib/store';
import { RootStackParamList } from '../navigation';
import * as Haptics from 'expo-haptics';
import { api } from '../lib/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function ArgumentCard({
  item,
  index,
  onPress,
}: {
  item: Argument;
  index: number;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const winnerColors = item.judgment
    ? item.judgment.winner === 'tie'
      ? { main: colors.primary, bg: colors.primaryMuted }
      : getParticipantColors(item.judgment.winner)
    : null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Animated.View
      style={[
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.argumentCard}>
          {/* Winner accent line */}
          {winnerColors && (
            <View style={[styles.cardAccent, { backgroundColor: winnerColors.main }]} />
          )}

          <View style={styles.cardContent}>
            {/* Header row */}
            <View style={styles.argumentHeader}>
              <View style={styles.participantsRow}>
                <View style={[styles.personDot, { backgroundColor: colors.personA }]} />
                <Text style={styles.personName}>{item.personAName}</Text>
                <Text style={styles.vsText}>vs</Text>
                <View style={[styles.personDot, { backgroundColor: colors.personB }]} />
                <Text style={styles.personName}>{item.personBName}</Text>
              </View>
              <Text style={styles.argumentDate}>{formatDate(item.createdAt)}</Text>
            </View>

            {/* Verdict */}
            {item.judgment ? (
              <View style={styles.verdictRow}>
                <View
                  style={[
                    styles.winnerBadge,
                    { backgroundColor: `${winnerColors?.main}15` },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={item.judgment.winner === 'tie' ? 'scale-balance' : 'trophy'}
                    size={14}
                    color={winnerColors?.main}
                    style={styles.trophyIcon}
                  />
                  <Text style={[styles.winnerText, { color: winnerColors?.main }]}>
                    {item.judgment.winner === 'tie'
                      ? 'Tie'
                      : `${item.judgment.winnerName} wins`}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.pendingRow}>
                {item.status === 'processing' ? (
                  <>
                    <View style={styles.processingDot} />
                    <Text style={styles.pendingText}>Judging...</Text>
                  </>
                ) : (
                  <Text style={styles.pendingText}>Incomplete</Text>
                )}
              </View>
            )}

            {/* Footer */}
            <View style={styles.footerRow}>
              <View style={styles.modeRow}>
                <View style={styles.modeBadge}>
                  <Ionicons
                    name={item.mode === 'live' ? 'mic' : 'swap-horizontal'}
                    size={12}
                    color={colors.textMuted}
                  />
                  <Text style={styles.modeText}>
                    {item.mode === 'live' ? 'Live' : 'Turn-based'}
                  </Text>
                </View>
                <View style={styles.turnsBadge}>
                  <Ionicons name="chatbubble" size={12} color={colors.textMuted} />
                  <Text style={styles.modeText}>
                    {item.turns.length} turn{item.turns.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function HistoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const arguments_ = useArguments();
  const setArguments = useAppStore((state) => state.setArguments);
  const [refreshing, setRefreshing] = React.useState(false);

  // Animations
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

    loadArguments();
  }, []);

  const loadArguments = async () => {
    try {
      const response = await api.getArguments();
      const normalized: Argument[] = response.map((arg: any) => ({
        id: arg.id,
        mode: arg.mode,
        personAName: arg.personAName,
        personBName: arg.personBName,
        persona: arg.persona,
        status: arg.status,
        createdAt: arg.createdAt,
        turns: (arg.turns || []).map((t: any) => ({
          id: t.id,
          speaker: t.speaker,
          speakerName:
            t.speaker === 'person_a' ? arg.personAName : arg.personBName,
          transcription: t.transcription,
          audioUri: t.audioUrl || undefined,
          durationSeconds: t.durationSeconds || undefined,
        })),
        judgment: arg.judgment
          ? {
              id: arg.judgment.id,
              winner: arg.judgment.winner,
              winnerName: arg.judgment.winnerName,
              reasoning: arg.judgment.reasoning,
              fullResponse: arg.judgment.fullResponse,
              audioUrl: arg.judgment.audioUrl || undefined,
              researchPerformed: arg.judgment.researchPerformed,
              sources: arg.judgment.sources || undefined,
            }
          : undefined,
      }));

      setArguments(normalized);
    } catch (error) {
      console.error('Error fetching arguments:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadArguments();
    setRefreshing(false);
  };

  const renderArgument = ({ item, index }: { item: Argument; index: number }) => (
    <ArgumentCard
      item={item}
      index={index}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('ArgumentDetail', { argumentId: item.id });
      }}
    />
  );

  const renderEmptyState = () => (
    <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
      <View style={styles.emptyIconContainer}>
        <MaterialCommunityIcons
          name="scale-balance"
          size={48}
          color={colors.primary}
        />
      </View>
      <Text style={styles.emptyTitle}>No verdicts yet</Text>
      <Text style={styles.emptyDescription}>
        Start your first argument and let the AI settle the score
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          navigation.navigate('Home');
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.emptyButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.emptyButtonText}>Start an Argument</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

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
          <Text style={styles.overline}>YOUR CASES</Text>
          <Text style={styles.title}>History</Text>
          {arguments_.length > 0 && (
            <Text style={styles.subtitle}>
              {arguments_.length} verdict{arguments_.length !== 1 ? 's' : ''} rendered
            </Text>
          )}
        </Animated.View>

        <FlatList
          data={arguments_}
          keyExtractor={(item) => item.id}
          renderItem={renderArgument}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={
            arguments_.length === 0 ? styles.emptyContainer : styles.listContainer
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
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
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  overline: {
    ...typography.overline,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // List
  listContainer: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },

  // Argument Card
  argumentCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.card,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardAccent: {
    height: 3,
    width: '100%',
  },
  cardContent: {
    padding: spacing.md,
  },
  argumentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  personDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  personName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginRight: spacing.xs,
  },
  vsText: {
    ...typography.caption,
    color: colors.textMuted,
    marginHorizontal: spacing.xs,
  },
  argumentDate: {
    ...typography.caption,
    color: colors.textMuted,
  },
  verdictRow: {
    marginBottom: spacing.sm,
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  trophyIcon: {
    marginRight: spacing.xs,
  },
  winnerText: {
    ...typography.caption,
    fontWeight: '600',
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  processingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
    marginRight: spacing.sm,
  },
  pendingText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bgTertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  turnsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bgTertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  modeText: {
    ...typography.small,
    color: colors.textMuted,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyButton: {
    borderRadius: borderRadius.button,
    overflow: 'hidden',
    ...shadows.glow,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
});
