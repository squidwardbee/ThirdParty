import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius } from '../lib/theme';
import { useArguments, Argument } from '../lib/store';
import { RootStackParamList } from '../navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HistoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const arguments_ = useArguments();

  const renderArgument = ({ item }: { item: Argument }) => {
    const winnerColor =
      item.judgment?.winner === 'person_a'
        ? colors.personA
        : item.judgment?.winner === 'person_b'
        ? colors.personB
        : colors.textMuted;

    return (
      <TouchableOpacity
        style={styles.argumentCard}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('ArgumentDetail', { argumentId: item.id })}
      >
        <View style={styles.argumentHeader}>
          <Text style={styles.argumentParticipants}>
            {item.personAName} vs {item.personBName}
          </Text>
          <Text style={styles.argumentDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {item.judgment ? (
          <View style={styles.verdictRow}>
            <View
              style={[styles.winnerBadge, { backgroundColor: winnerColor + '20' }]}
            >
              <Text style={[styles.winnerText, { color: winnerColor }]}>
                {item.judgment.winner === 'tie'
                  ? 'Tie'
                  : `${item.judgment.winnerName} wins`}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.pendingText}>
            {item.status === 'processing' ? 'Judging...' : 'Incomplete'}
          </Text>
        )}

        <Text style={styles.argumentMode}>
          {item.mode === 'live' ? '🎙️ Live' : '🔄 Turn-based'} •{' '}
          {item.turns.length} turn{item.turns.length !== 1 ? 's' : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>⚖️</Text>
      <Text style={styles.emptyTitle}>No arguments yet</Text>
      <Text style={styles.emptyDescription}>
        Start your first argument from the home screen
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      <FlatList
        data={arguments_}
        keyExtractor={(item) => item.id}
        renderItem={renderArgument}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          arguments_.length === 0 ? styles.emptyContainer : styles.listContainer
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  argumentCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  argumentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  argumentParticipants: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  argumentDate: {
    ...typography.small,
    color: colors.textMuted,
  },
  verdictRow: {
    marginBottom: spacing.sm,
  },
  winnerBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  winnerText: {
    ...typography.caption,
    fontWeight: '600',
  },
  pendingText: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  argumentMode: {
    ...typography.small,
    color: colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
