import { Platform } from 'react-native';
import { useAppStore } from './store';

// RevenueCat disabled for now - enable when you have a dev build
const PURCHASES_ENABLED = false;

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const PREMIUM_ENTITLEMENT = 'premium';

/**
 * Initialize RevenueCat with user ID
 */
export async function initializePurchases(userId?: string): Promise<void> {
  if (!PURCHASES_ENABLED) {
    console.log('RevenueCat disabled - skipping initialization');
    return;
  }
}

/**
 * Check current subscription status and update store
 */
export async function checkSubscriptionStatus(): Promise<boolean> {
  if (!PURCHASES_ENABLED) return false;
  return false;
}

/**
 * Get available subscription packages
 */
export async function getOfferings(): Promise<any[]> {
  if (!PURCHASES_ENABLED) return [];
  return [];
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(pkg: any): Promise<boolean> {
  throw new Error('Purchases not available - create a dev build');
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<boolean> {
  if (!PURCHASES_ENABLED) return false;
  return false;
}

/**
 * Log in user to RevenueCat (after Firebase auth)
 */
export async function loginToRevenueCat(userId: string): Promise<void> {
  // No-op when disabled
}

/**
 * Log out user from RevenueCat
 */
export async function logoutFromRevenueCat(): Promise<void> {
  // No-op when disabled
}

/**
 * Get subscription management URL
 */
export function getManagementUrl(): string {
  return Platform.OS === 'ios'
    ? 'https://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';
}
