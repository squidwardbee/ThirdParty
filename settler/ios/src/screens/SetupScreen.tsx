import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows, getParticipantColors } from '../lib/theme';
import { useAppStore, Persona } from '../lib/store';
import { RootStackParamList } from '../navigation';
import * as Haptics from 'expo-haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'Setup'>;

interface PersonaOption {
  id: Persona;
  name: string;
  description: string;
  icon: string;
  iconType: 'FontAwesome5' | 'MaterialCommunityIcons';
}

const PERSONAS: PersonaOption[] = [
  {
    id: 'mediator',
    name: 'The Mediator',
    description: 'Fair, diplomatic, and balanced. Considers both sides thoughtfully.',
    icon: 'balance-scale',
    iconType: 'FontAwesome5',
  },
  {
    id: 'judge_judy',
    name: 'Judge Judy',
    description: 'Direct, no-nonsense, and brutally honest. Cuts through the BS.',
    icon: 'gavel',
    iconType: 'FontAwesome5',
  },
  {
    id: 'comedic',
    name: 'The Comedian',
    description: 'Witty and humorous while still giving a real verdict.',
    icon: 'drama-masks',
    iconType: 'MaterialCommunityIcons',
  },
];

function PersonaCard({
  persona,
  isSelected,
  onPress,
  delay,
}: {
  persona: PersonaOption;
  isSelected: boolean;
  onPress: () => void;
  delay: number;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay,
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

  const renderIcon = () => {
    const iconColor = isSelected ? colors.primary : colors.textSecondary;
    if (persona.iconType === 'FontAwesome5') {
      return <FontAwesome5 name={persona.icon} size={24} color={iconColor} />;
    }
    return <MaterialCommunityIcons name={persona.icon as any} size={26} color={iconColor} />;
  };

  return (
    <Animated.View
      style={[
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }, { translateX: slideAnim }],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View
          style={[
            styles.personaCard,
            isSelected && styles.personaCardSelected,
          ]}
        >
          <View style={[styles.personaIconContainer, isSelected && styles.personaIconContainerSelected]}>
            {renderIcon()}
          </View>
          <View style={styles.personaContent}>
            <Text style={[styles.personaName, isSelected && styles.personaNameSelected]}>
              {persona.name}
            </Text>
            <Text style={styles.personaDescription}>{persona.description}</Text>
          </View>
          <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
            {isSelected && <View style={styles.radioInner} />}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function SetupScreen({ navigation, route }: Props) {
  const { mode } = route.params;
  const startNewArgument = useAppStore((state) => state.startNewArgument);

  const [personAName, setPersonAName] = useState('');
  const [personBName, setPersonBName] = useState('');
  const [selectedPersona, setSelectedPersona] = useState<Persona>('mediator');
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const personAColors = getParticipantColors('person_a');
  const personBColors = getParticipantColors('person_b');

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
  }, []);

  const canProceed = personAName.trim().length > 0 && personBName.trim().length > 0;

  const handleStart = () => {
    if (!canProceed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.goBack();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.headerContent}>
              <Text style={styles.overline}>
                {mode === 'live' ? 'LIVE DEBATE' : 'TURN-BASED'}
              </Text>
              <Text style={styles.title}>Set the Stage</Text>
            </View>
          </Animated.View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Participants Section */}
            <Animated.View
              style={[
                styles.section,
                { opacity: fadeAnim },
              ]}
            >
              <Text style={styles.sectionTitle}>PARTICIPANTS</Text>

              {/* Person A Input */}
              <View
                style={[
                  styles.inputContainer,
                  focusedInput === 'personA' && styles.inputContainerFocused,
                ]}
              >
                <View style={[styles.indicator, { backgroundColor: personAColors.main }]} />
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="person"
                    size={18}
                    color={focusedInput === 'personA' ? personAColors.main : colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="First person's name"
                    placeholderTextColor={colors.textMuted}
                    value={personAName}
                    onChangeText={setPersonAName}
                    autoCapitalize="words"
                    onFocus={() => setFocusedInput('personA')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
              </View>

              {/* VS Divider */}
              <View style={styles.vsDivider}>
                <View style={styles.vsLine} />
                <Text style={styles.vsText}>VS</Text>
                <View style={styles.vsLine} />
              </View>

              {/* Person B Input */}
              <View
                style={[
                  styles.inputContainer,
                  focusedInput === 'personB' && styles.inputContainerFocused,
                ]}
              >
                <View style={[styles.indicator, { backgroundColor: personBColors.main }]} />
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="person"
                    size={18}
                    color={focusedInput === 'personB' ? personBColors.main : colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Second person's name"
                    placeholderTextColor={colors.textMuted}
                    value={personBName}
                    onChangeText={setPersonBName}
                    autoCapitalize="words"
                    onFocus={() => setFocusedInput('personB')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
              </View>
            </Animated.View>

            {/* Judge Section */}
            <Animated.View
              style={[
                styles.section,
                { opacity: fadeAnim },
              ]}
            >
              <Text style={styles.sectionTitle}>CHOOSE YOUR JUDGE</Text>

              {PERSONAS.map((persona, index) => (
                <PersonaCard
                  key={persona.id}
                  persona={persona}
                  isSelected={selectedPersona === persona.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedPersona(persona.id);
                  }}
                  delay={100 + index * 100}
                />
              ))}
            </Animated.View>
          </ScrollView>

          {/* Footer Button */}
          <Animated.View
            style={[
              styles.footer,
              { opacity: fadeAnim },
            ]}
          >
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <Pressable
                style={[styles.startButton, !canProceed && styles.startButtonDisabled]}
                onPress={handleStart}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={!canProceed}
              >
                <LinearGradient
                  colors={canProceed ? [colors.primary, colors.primaryDark] : [colors.bgTertiary, colors.bgTertiary]}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={[styles.startButtonText, !canProceed && styles.startButtonTextDisabled]}>
                    {mode === 'live' ? 'Start Recording' : 'Begin Argument'}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={canProceed ? colors.textInverse : colors.textMuted}
                  />
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </KeyboardAvoidingView>
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
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xl,
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
    top: 100,
    right: -100,
    backgroundColor: colors.primary,
    opacity: 0.06,
  },
  glowPink: {
    bottom: 150,
    left: -100,
    backgroundColor: colors.secondary,
    opacity: 0.06,
  },

  // Header
  header: {
    flexDirection: 'row',
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
    backgroundColor: colors.bgTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  overline: {
    ...typography.overline,
    color: colors.primary,
    marginBottom: spacing.xxs,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },

  // Section
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.overline,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },

  // Inputs
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  inputContainerFocused: {
    borderColor: colors.borderLight,
    backgroundColor: colors.bgElevated,
  },
  indicator: {
    width: 4,
    alignSelf: 'stretch',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.md + 2,
  },

  // VS Divider
  vsDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: spacing.md,
  },
  vsLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  vsText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 2,
  },

  // Persona Cards
  personaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.sm,
  },
  personaCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
  },
  personaIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.bgTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  personaIconContainerSelected: {
    backgroundColor: `${colors.primary}20`,
  },
  personaContent: {
    flex: 1,
  },
  personaName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  personaNameSelected: {
    color: colors.primary,
  },
  personaDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },

  // Footer
  footer: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  startButton: {
    borderRadius: borderRadius.button,
    overflow: 'hidden',
    ...shadows.glow,
  },
  startButtonDisabled: {
    ...shadows.sm,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 2,
    gap: spacing.sm,
  },
  startButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
  startButtonTextDisabled: {
    color: colors.textMuted,
  },
});
