import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Alert,
  Animated,
  Pressable,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../lib/theme';
import { api } from '../lib/api';
import { useAppStore } from '../lib/store';
import { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Screenshot'>;

export default function ScreenshotScreen({ navigation }: Props) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const setArgumentsToday = useAppStore((state) => state.setArgumentsToday);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

  // Pulsing animation when processing
  useEffect(() => {
    if (isProcessing) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
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
      pulse.start();
      return () => {
        pulse.stop();
        pulseAnim.setValue(1);
      };
    }
  }, [isProcessing]);

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!selectedImage) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsProcessing(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets[0]?.base64) {
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        const reader = new FileReader();

        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
        });

        reader.readAsDataURL(blob);
        const base64 = await base64Promise;

        const mimeType = selectedImage.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg';

        const response2 = await api.judgeScreenshot(base64, mimeType);
        setArgumentsToday(3 - response2.remainingToday);
        navigation.replace('Judgment', { argumentId: response2.argument.id });
      } else {
        const base64 = result.assets[0].base64;
        const mimeType = result.assets[0].mimeType || 'image/jpeg';

        const response = await api.judgeScreenshot(base64, mimeType);
        setArgumentsToday(3 - response.remainingToday);
        navigation.replace('Judgment', { argumentId: response.argument.id });
      }
    } catch (error) {
      console.error('Failed to process screenshot:', error);
      Alert.alert('Error', 'Failed to analyze screenshot. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
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
          <Pressable onPress={handleClose} hitSlop={12}>
            <View style={styles.closeButton}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </View>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.overline}>SCREENSHOT</Text>
            <Text style={styles.title}>Text Judge</Text>
          </View>
          <View style={{ width: 40 }} />
        </Animated.View>

        {/* Content */}
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim },
          ]}
        >
          <Text style={styles.subtitle}>
            Upload a screenshot of a text conversation and let AI decide who's right
          </Text>

          {/* Image Preview / Picker */}
          <Pressable
            style={styles.imagePicker}
            onPress={pickImage}
            disabled={isProcessing}
          >
            {selectedImage ? (
              <Animated.View
                style={[
                  styles.imageContainer,
                  isProcessing && { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                {isProcessing && (
                  <View style={styles.processingOverlay}>
                    <MaterialCommunityIcons
                      name="magnify"
                      size={48}
                      color={colors.primary}
                    />
                    <Text style={styles.processingText}>Analyzing...</Text>
                  </View>
                )}
              </Animated.View>
            ) : (
              <View style={styles.pickerContent}>
                <View style={styles.pickerIconContainer}>
                  <Ionicons name="image-outline" size={40} color={colors.primary} />
                </View>
                <Text style={styles.pickerText}>Tap to select a screenshot</Text>
                <Text style={styles.pickerSubtext}>PNG or JPEG supported</Text>
              </View>
            )}
          </Pressable>

          {selectedImage && !isProcessing && (
            <Pressable onPress={pickImage} hitSlop={8}>
              <Text style={styles.changeButtonText}>Change Image</Text>
            </Pressable>
          )}

          {/* Info */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              The right side of the conversation will be treated as you (the uploader)
            </Text>
          </View>
        </Animated.View>

        {/* Submit Button */}
        <Animated.View
          style={[
            styles.footer,
            { opacity: fadeAnim },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <Pressable
              onPress={handleSubmit}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              disabled={!selectedImage || isProcessing}
            >
              <LinearGradient
                colors={
                  !selectedImage || isProcessing
                    ? [colors.bgTertiary, colors.bgTertiary]
                    : [colors.primary, colors.primaryDark]
                }
                style={styles.submitButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons
                  name="gavel"
                  size={20}
                  color={!selectedImage || isProcessing ? colors.textMuted : colors.textInverse}
                />
                <Text
                  style={[
                    styles.submitButtonText,
                    (!selectedImage || isProcessing) && styles.submitButtonTextDisabled,
                  ]}
                >
                  {isProcessing ? 'Analyzing...' : 'Get Judgment'}
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
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

  // Content
  content: {
    flex: 1,
    padding: spacing.screenPadding,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },

  // Image Picker
  imagePicker: {
    aspectRatio: 9 / 16,
    maxHeight: 400,
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignSelf: 'center',
    width: '100%',
  },
  imageContainer: {
    flex: 1,
  },
  pickerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  pickerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pickerText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  pickerSubtext: {
    ...typography.caption,
    color: colors.textMuted,
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 13, 15, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  processingText: {
    ...typography.bodyMedium,
    color: colors.primary,
  },
  changeButtonText: {
    ...typography.body,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.md,
  },

  // Info Box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgCard,
    padding: spacing.md,
    borderRadius: borderRadius.card,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },

  // Footer
  footer: {
    padding: spacing.screenPadding,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    ...shadows.glow,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
  submitButtonTextDisabled: {
    color: colors.textMuted,
  },
});
