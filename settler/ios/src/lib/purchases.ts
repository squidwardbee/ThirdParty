import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PurchasesOffering,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { useAppStore } from './store';

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const PREMIUM_ENTITLEMENT = 'premium';

let isInitialized = false;
let listenerAdded = false;

/**
 * Initialize RevenueCat with optional user ID
 */
export async function initializePurchases(userId?: string): Promise<void> {
  if (isInitialized) {
    console.log('[Purchases] Already initialized');
    return;
  }

  if (!REVENUECAT_API_KEY) {
    console.warn('[Purchases] No API key configured - purchases disabled');
    return;
  }

  try {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);

    Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
      appUserID: userId || null,
    });

    isInitialized = true;
    console.log('[Purchases] RevenueCat initialized successfully');

    // Add listener for real-time subscription updates
    if (!listenerAdded) {
      Purchases.addCustomerInfoUpdateListener((customerInfo) => {
        const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
        console.log('[Purchases] CustomerInfo updated - premium:', isPremium);

        const store = useAppStore.getState();
        if (store.user) {
          store.setUser({
            ...store.user,
            subscriptionTier: isPremium ? 'premium' : 'free',
            subscriptionExpiresAt: customerInfo.entitlements.active[PREMIUM_ENTITLEMENT]?.expirationDate || null,
          });
        }
      });
      listenerAdded = true;
      console.log('[Purchases] CustomerInfo listener added');
    }

    // Check initial subscription status
    await checkSubscriptionStatus();
  } catch (error) {
    console.error('[Purchases] Failed to initialize:', error);
  }
}

/**
 * Check current subscription status and update store
 */
export async function checkSubscriptionStatus(): Promise<boolean> {
  if (!isInitialized) {
    console.log('[Purchases] Not initialized - skipping status check');
    return false;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;

    // Update store
    const store = useAppStore.getState();
    if (store.user) {
      store.setUser({
        ...store.user,
        subscriptionTier: isPremium ? 'premium' : 'free',
        subscriptionExpiresAt: customerInfo.entitlements.active[PREMIUM_ENTITLEMENT]?.expirationDate || null,
      });
    }

    console.log('[Purchases] Subscription status:', isPremium ? 'premium' : 'free');
    return isPremium;
  } catch (error) {
    console.error('[Purchases] Failed to check status:', error);
    return false;
  }
}

/**
 * Get available subscription offerings
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (!isInitialized) {
    console.log('[Purchases] Not initialized');
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();
    console.log('[Purchases] Offerings:', offerings.current?.identifier);
    return offerings.current;
  } catch (error) {
    console.error('[Purchases] Failed to get offerings:', error);
    return null;
  }
}

/**
 * Get packages from the current offering
 */
export async function getPackages(): Promise<PurchasesPackage[]> {
  const offering = await getOfferings();
  return offering?.availablePackages || [];
}

/**
 * Purchase a subscription by plan type
 */
export async function purchasePackage(planType: 'MONTHLY' | 'ANNUAL'): Promise<boolean> {
  if (!isInitialized) {
    throw new Error('Purchases not initialized. Please try again.');
  }

  try {
    const offering = await getOfferings();
    if (!offering) {
      throw new Error('No offerings available');
    }

    // Find the right package
    let pkg: PurchasesPackage | undefined;

    if (planType === 'MONTHLY') {
      pkg = offering.monthly || offering.availablePackages.find(p =>
        p.identifier.toLowerCase().includes('monthly') ||
        p.packageType === 'MONTHLY'
      );
    } else {
      pkg = offering.annual || offering.availablePackages.find(p =>
        p.identifier.toLowerCase().includes('annual') ||
        p.packageType === 'ANNUAL'
      );
    }

    if (!pkg) {
      throw new Error(`No ${planType.toLowerCase()} package found`);
    }

    console.log('[Purchases] Purchasing package:', pkg.identifier);

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;

    if (isPremium) {
      // Update store
      const store = useAppStore.getState();
      if (store.user) {
        store.setUser({
          ...store.user,
          subscriptionTier: 'premium',
          subscriptionExpiresAt: customerInfo.entitlements.active[PREMIUM_ENTITLEMENT]?.expirationDate || null,
        });
      }
      console.log('[Purchases] Purchase successful!');
    }

    return isPremium;
  } catch (error: any) {
    // Check if user cancelled
    if (error.userCancelled) {
      console.log('[Purchases] User cancelled');
      error.userCancelled = true;
    } else {
      console.error('[Purchases] Purchase failed:', error);
    }
    throw error;
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<boolean> {
  if (!isInitialized) {
    throw new Error('Purchases not initialized. Please try again.');
  }

  try {
    console.log('[Purchases] Restoring purchases...');
    const customerInfo = await Purchases.restorePurchases();
    const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;

    if (isPremium) {
      const store = useAppStore.getState();
      if (store.user) {
        store.setUser({
          ...store.user,
          subscriptionTier: 'premium',
          subscriptionExpiresAt: customerInfo.entitlements.active[PREMIUM_ENTITLEMENT]?.expirationDate || null,
        });
      }
      console.log('[Purchases] Restore successful - premium active');
    } else {
      console.log('[Purchases] Restore complete - no active subscription found');
    }

    return isPremium;
  } catch (error) {
    console.error('[Purchases] Restore failed:', error);
    throw error;
  }
}

/**
 * Log in user to RevenueCat (call after Firebase auth)
 */
export async function loginToRevenueCat(userId: string): Promise<void> {
  if (!isInitialized) {
    await initializePurchases(userId);
    return;
  }

  try {
    console.log('[Purchases] Logging in user:', userId);
    await Purchases.logIn(userId);
    await checkSubscriptionStatus();
  } catch (error) {
    console.error('[Purchases] Login failed:', error);
  }
}

/**
 * Log out user from RevenueCat
 */
export async function logoutFromRevenueCat(): Promise<void> {
  if (!isInitialized) return;

  try {
    // Check if user is anonymous before trying to logout
    const appUserId = await Purchases.getAppUserID();

    // Don't logout if already anonymous (starts with $RCAnonymousID)
    if (appUserId.startsWith('$RCAnonymousID')) {
      console.log('[Purchases] User is already anonymous, skipping logout');
      return;
    }

    console.log('[Purchases] Logging out user');
    await Purchases.logOut();
  } catch (error) {
    // Ignore "user is anonymous" errors
    console.log('[Purchases] Logout skipped or failed:', error);
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

/**
 * Check if purchases are available
 */
export function isPurchasesAvailable(): boolean {
  return isInitialized && !!REVENUECAT_API_KEY;
}
