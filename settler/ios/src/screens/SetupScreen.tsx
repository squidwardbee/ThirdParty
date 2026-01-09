import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../lib/theme';
import { useAppStore, Persona } from '../lib/store';
import { RootStackParamList } from '../navigation';
import * as Haptics from 'expo-haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'Setup'>;

const PERSONAS: { id: Persona; name: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'mediator',
    name: 'The Mediator',
    description: 'Fair, diplomatic, and balanced. Considers both sides thoughtfully.',
    icon: <FontAwesome5 name="balance-scale" size={28} color={colors.textPrimary} />,
  },
  {
    id: 'judge_judy',
    name: 'Judge Judy',
    description: 'Direct, no-nonsense, and brutally honest. Cuts through the BS.',
    icon: <FontAwesome5 name="gavel" size={24} color={colors.textPrimary} />,
  },
  {
    id: 'comedic',
    name: 'The Comedian',
    description: 'Witty and humorous while still giving a real verdict.',
    icon: <MaterialCommunityIcons name="drama-masks" size={28} color={colors.textPrimary} />,
  },
];

export default function SetupScreen({ navigation, route }: Props) {
  const { mode } = route.params;
  const startNewArgument = useAppStore((state) => state.startNewArgument);

  const [personAName, setPersonAName] = useState('');
  const [personBName, setPersonBName] = useState('');
  const [selectedPersona, setSelectedPersona] = useState<Persona>('mediator');

  const canProceed = personAName.trim().length > 0 && personBName.trim().length > 0;

  const handleStart = () => {
    if (!canProceed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    startNewArgument(mode, personAName.trim(), personBName.trim(), selectedPersona);

    if (mode === 'live') {
      navigation.replace('LiveMode', {
        personAName: personAName.trim(),
        personBName: personBName.trim(),
        persona: selectedPersona,
      });
    } else {
      navigation.replace('TurnBased', {
        personAName: personAName.trim(),
        personBName: personBName.trim(),
        persona: selectedPersona,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>
              {mode === 'live' ? 'Live Conversation' : 'Turn-Based'}
            </Text>
            <Text style={styles.subtitle}>Enter the names of both participants</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Participants</Text>

            <View style={styles.inputContainer}>
              <View style={[styles.indicator, { backgroundColor: colors.personA }]} />
              <TextInput
                style={styles.input}
                placeholder="Person 1's name"
                placeholderTextColor={colors.textMuted}
                value={personAName}
                onChangeText={setPersonAName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={[styles.indicator, { backgroundColor: colors.personB }]} />
              <TextInput
                style={styles.input}
                placeholder="Person 2's name"
                placeholderTextColor={colors.textMuted}
                value={personBName}
                onChangeText={setPersonBName}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose Your Judge</Text>

            {PERSONAS.map((persona) => (
              <TouchableOpacity
                key={persona.id}
                style={[
                  styles.personaCard,
                  selectedPersona === persona.id && styles.personaCardSelected,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedPersona(persona.id);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.personaEmoji}>{persona.icon}</View>
                <View style={styles.personaContent}>
                  <Text style={styles.personaName}>{persona.name}</Text>
                  <Text style={styles.personaDescription}>{persona.description}</Text>
                </View>
                {selectedPersona === persona.id && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.startButton, !canProceed && styles.startButtonDisabled]}
            onPress={handleStart}
            disabled={!canProceed}
          >
            <Text style={styles.startButtonText}>
              {mode === 'live' ? 'Start Recording' : 'Begin Argument'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backButtonText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  indicator: {
    width: 4,
    height: 40,
    borderTopLeftRadius: borderRadius.md,
    borderBottomLeftRadius: borderRadius.md,
    marginRight: spacing.md,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    padding: spacing.md,
    paddingLeft: 0,
  },
  personaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
  },
  personaCardSelected: {
    borderColor: colors.primary,
  },
  personaEmoji: {
    marginRight: spacing.md,
  },
  personaContent: {
    flex: 1,
  },
  personaName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  personaDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
});
