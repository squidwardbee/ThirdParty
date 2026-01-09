import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius } from '../lib/theme';
import {
  purchasePackage,
  restorePurchases,
} from '../lib/purchases';
import { RootStackParamList } from '../navigation';
import { Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import leftLaurel from '../../assets/left_laurel.png';
import rightLaurel from '../../assets/right_laurel.png';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

const PREMIUM_FEATURES = [
  {
    icon: <Feather name="check-circle" size={28} color={colors.primary} />,
    title: 'Unlimited Arguments',
    description: '24/7 access to an impartial mediator',
  },
  {
    icon: <Feather name="search" size={28} color={colors.primary} />,
    title: 'AI Research',
    description: 'Fact-checking with web search',
  },
  {
    icon: <MaterialCommunityIcons name="microphone" size={28} color={colors.primary} />,
    title: 'Premium Voices',
    description: 'High-quality AI narrator voices',
  },
  {
    icon: <FontAwesome5 name="chart-bar" size={24} color={colors.primary} />,
    title: 'Detailed Analysis',
    description: 'In-depth reasoning and sources',
  },
];

export default function PaywallScreen({ navigation }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL');
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPurchasing(true);
    try {
      const success = await purchasePackage(selectedPlan);
      if (success) {
        Alert.alert('Success!', 'Welcome to ThirdParty Premium!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert('Purchase Failed', error.message || 'Please try again');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    try {
      const success = await restorePurchases();
      if (success) {
        Alert.alert('Restored!', 'Your subscription has been restored.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('No Subscription Found', 'We could not find an active subscription.');
      }
    } catch (error: any) {
      Alert.alert('Restore Failed', error.message || 'Please try again');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Text style={styles.closeButtonText}>X</Text>
          </TouchableOpacity>

          <View style={styles.laurelWrapper}>
            <Image source={leftLaurel} style={styles.laurelIcon} />
            <View style={styles.textGroup}>
              <Text style={styles.title}>ThirdParty Premium</Text>
              <Text style={styles.subtitle}>Resolve conflicts like a pro</Text>
            </View>
            <Image source={rightLaurel} style={styles.laurelIcon} />
          </View>
        </View>

        <View style={styles.features}>
          {PREMIUM_FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.featureIconWrapper}>{feature.icon}</View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.planStack}>
          <TouchableOpacity
            style={[
              styles.planRow,
              selectedPlan === 'MONTHLY' && styles.planSelected,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedPlan('MONTHLY');
            }}
          >
            <View>
              <Text style={styles.planTitle}>Monthly</Text>
              <Text style={styles.planSub}>$9.99 / month</Text>
            </View>
            <Text style={styles.planPriceRight}>$9.99</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.planRow,
              selectedPlan === 'ANNUAL' && styles.planSelected,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedPlan('ANNUAL');
            }}
          >
            <View>
              <View style={styles.annualTitleRow}>
                <Text style={styles.planTitle}>Annual</Text>
                <View style={styles.bestValueBadge}>
                  <Text style={styles.bestValueText}>Best Value</Text>
                </View>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.strikePrice}>$119.99</Text>
                <Text style={styles.discountText}>50% off</Text>
              </View>
            </View>
            <Text style={styles.planPriceRight}>$59.99</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={purchasing}
        >
          {purchasing ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <Text style={styles.purchaseButtonText}>Start Your Free 3-Day Trial</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>

        <Text style={styles.legalText}>
          Payment will be charged to your Apple ID account at confirmation of purchase.
          Subscription automatically renews unless it is canceled at least 24 hours
          before the end of the current period. Your account will be charged for renewal
          within 24 hours prior to the end of the current period.
        </Text>

        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => Linking.openURL('https://settler.app/privacy')}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>|</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://settler.app/terms')}>
            <Text style={styles.legalLink}>Terms of Service</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  closeButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: spacing.sm,
  },
  closeButtonText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 20,
  },
  laurelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl * 2,
  },
  laurelIcon: {
    width: 80,
    height: 80,
    marginHorizontal: -18,
  },
  textGroup: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  title: {
    fontSize: 29,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  features: {
    alignItems: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    width: '80%',
  },
  featureIconWrapper: {
    width: 28,
    marginRight: spacing.md,
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  featureDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  planStack: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planSelected: {
    borderColor: colors.primary,
  },
  planTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  planSub: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  planPriceRight: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  annualTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bestValueBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  bestValueText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontSize: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  strikePrice: {
    ...typography.caption,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  discountText: {
    ...typography.caption,
    color: colors.primary,
  },
  purchaseButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontSize: 18,
  },
  restoreButton: {
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  restoreButtonText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  legalText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontSize: 9,
    lineHeight: 10,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legalLink: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  legalSeparator: {
    ...typography.caption,
    color: colors.textMuted,
    marginHorizontal: spacing.sm,
  },
});
