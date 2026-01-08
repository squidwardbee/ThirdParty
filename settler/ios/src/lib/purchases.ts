import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { useAppStore } from './store';

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const PREMIUM_ENTITLEMENT = 'premium';

/**
 * Initialize RevenueCat with user ID
 */
export async function initializePurchases(userId?: string): Promise<void> {
  if (!REVENUECAT_API_KEY) {
    console.warn('RevenueCat API key not configured');
    return;
  }

  Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

  await Purchases.configure({
    apiKey: REVENUECAT_API_KEY,
    appUserID: userId,
  });

  // Check subscription status on init
  await checkSubscriptionStatus();
}

/**
 * Check current subscription status and update store
 */
export async function checkSubscriptionStatus(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;

    const store = useAppStore.getState();
    if (store.user) {
      store.setUser({
        ...store.user,
        subscriptionTier: isPremium ? 'premium' : 'free',
      });
    }

    return isPremium;
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    return false;
  }
}

/**
 * Get available subscription packages
 */
export async function getOfferings(): Promise<PurchasesPackage[]> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages || [];
  } catch (error) {
    console.error('Failed to get offerings:', error);
    return [];
  }
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;

    if (isPremium) {
      const store = useAppStore.getState();
      if (store.user) {
        store.setUser({
          ...store.user,
          subscriptionTier: 'premium',
        });
      }
    }

    return isPremium;
  } catch (error: any) {
    if (!error.userCancelled) {
      console.error('Purchase failed:', error);
    }
    throw error;
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;

    const store = useAppStore.getState();
    if (store.user) {
      store.setUser({
        ...store.user,
        subscriptionTier: isPremium ? 'premium' : 'free',
      });
    }

    return isPremium;
  } catch (error) {
    console.error('Restore failed:', error);
    throw error;
  }
}

/**
 * Log in user to RevenueCat (after Firebase auth)
 */
export async function loginToRevenueCat(userId: string): Promise<void> {
  try {
    await Purchases.logIn(userId);
    await checkSubscriptionStatus();
  } catch (error) {
    console.error('RevenueCat login failed:', error);
  }
}

/**
 * Log out user from RevenueCat
 */
export async function logoutFromRevenueCat(): Promise<void> {
  try {
    await Purchases.logOut();
  } catch (error) {
    console.error('RevenueCat logout failed:', error);
  }
}

/**
 * Get subscription management URL
 */
export function getManagementUrl(): string {
  return Platform.OS === 'ios'
    ? 'https://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';
}
