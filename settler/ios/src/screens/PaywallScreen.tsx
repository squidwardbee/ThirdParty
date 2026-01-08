import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PurchasesPackage } from 'react-native-purchases';
import { colors, typography, spacing, borderRadius } from '../lib/theme';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  getManagementUrl,
} from '../lib/purchases';
import { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

const PREMIUM_FEATURES = [
  { icon: '⚖️', title: 'Unlimited Arguments', description: 'No daily limits on settling disputes' },
  { icon: '🔬', title: 'AI Research', description: 'Fact-checking with web search' },
  { icon: '🎙️', title: 'Premium Voices', description: 'High-quality AI narrator voices' },
  { icon: '📊', title: 'Detailed Analysis', description: 'In-depth reasoning and sources' },
];

export default function PaywallScreen({ navigation }: Props) {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      const offerings = await getOfferings();
      setPackages(offerings);
      // Select annual by default (usually better value)
      const annual = offerings.find((p) => p.packageType === 'ANNUAL');
      setSelectedPackage(annual || offerings[0] || null);
    } catch (error) {
      console.error('Failed to load offerings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setPurchasing(true);
    try {
      const success = await purchasePackage(selectedPackage);
      if (success) {
        Alert.alert('Success!', 'Welcome to Settler Premium!', [
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

  const formatPrice = (pkg: PurchasesPackage): string => {
    const product = pkg.product;
    return product.priceString;
  };

  const formatPeriod = (pkg: PurchasesPackage): string => {
    switch (pkg.packageType) {
      case 'WEEKLY':
        return 'per week';
      case 'MONTHLY':
        return 'per month';
      case 'ANNUAL':
        return 'per year';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.closeButtonText}>X</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Settler Premium</Text>
          <Text style={styles.subtitle}>Settle arguments like a pro</Text>
        </View>

        {/* Free Trial Banner */}
        <View style={styles.trialBanner}>
          <Text style={styles.trialText}>Start your 3-day free trial</Text>
          <Text style={styles.trialSubtext}>Cancel anytime before trial ends</Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {PREMIUM_FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Package Selection */}
        <View style={styles.packages}>
          {packages.map((pkg) => (
            <TouchableOpacity
              key={pkg.identifier}
              style={[
                styles.packageCard,
                selectedPackage?.identifier === pkg.identifier && styles.packageSelected,
              ]}
              onPress={() => setSelectedPackage(pkg)}
            >
              <View style={styles.packageHeader}>
                <Text style={styles.packageTitle}>
                  {pkg.packageType === 'ANNUAL' ? 'Annual' : 'Monthly'}
                </Text>
                {pkg.packageType === 'ANNUAL' && (
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveBadgeText}>Best Value</Text>
                  </View>
                )}
              </View>
              <Text style={styles.packagePrice}>{formatPrice(pkg)}</Text>
              <Text style={styles.packagePeriod}>{formatPeriod(pkg)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Purchase Button */}
        <TouchableOpacity
          style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={purchasing || !selectedPackage}
        >
          {purchasing ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <Text style={styles.purchaseButtonText}>
              Start Free Trial
            </Text>
          )}
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>

        {/* Legal */}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  title: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  trialBanner: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  trialText: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  trialSubtext: {
    ...typography.caption,
    color: colors.textPrimary,
    opacity: 0.8,
  },
  features: {
    marginBottom: spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  featureIcon: {
    fontSize: 28,
    marginRight: spacing.md,
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
  packages: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  packageCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  packageSelected: {
    borderColor: colors.primary,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  packageTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  saveBadge: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  saveBadgeText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontSize: 10,
  },
  packagePrice: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  packagePeriod: {
    ...typography.caption,
    color: colors.textSecondary,
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
    fontSize: 11,
    lineHeight: 16,
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
