import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAppStore } from '../lib/store';
import { colors } from '../lib/theme';
import { onAuthChange } from '../lib/firebase';
import { api } from '../lib/api';

// Screens
import AuthScreen from '../screens/AuthScreen';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SetupScreen from '../screens/SetupScreen';
import TurnBasedScreen from '../screens/TurnBasedScreen';
import LiveModeScreen from '../screens/LiveModeScreen';
import ProcessingScreen from '../screens/ProcessingScreen';
import JudgmentScreen from '../screens/JudgmentScreen';
import ArgumentDetailScreen from '../screens/ArgumentDetailScreen';
import PaywallScreen from '../screens/PaywallScreen';

// Type definitions for navigation
export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  Setup: { mode: 'live' | 'turn_based' };
  LiveMode: { personAName: string; personBName: string; persona: string };
  TurnBased: { personAName: string; personBName: string; persona: string };
  Processing: { argumentId: string };
  Judgment: { argumentId: string };
  ArgumentDetail: { argumentId: string };
  Paywall: undefined;
};

export type TabParamList = {
  Home: undefined;
  History: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

/**
 * Main tab navigator for authenticated users
 */
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgSecondary,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Settle',
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'History',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * Loading screen while checking auth state
 */
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

/**
 * Root navigation component
 */
export default function Navigation() {
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const setUser = useAppStore((state) => state.setUser);
  const logout = useAppStore((state) => state.logout);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // User is signed in - fetch user data from API
          const user = await api.createOrUpdateUser();
          setUser({
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            subscriptionTier: user.subscriptionTier,
            subscriptionExpiresAt: user.subscriptionExpiresAt,
            trialStartedAt: null,
            argumentsToday: user.argumentsToday,
            preferredPersona: user.preferredPersona as 'mediator' | 'judge_judy' | 'comedic',
          });
        } catch (error) {
          console.error('Failed to fetch user data:', error);
        }
      } else {
        // User is signed out
        logout();
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bgPrimary },
          animation: 'slide_from_right',
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen
              name="Setup"
              component={SetupScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="LiveMode" component={LiveModeScreen} />
            <Stack.Screen name="TurnBased" component={TurnBasedScreen} />
            <Stack.Screen
              name="Processing"
              component={ProcessingScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen
              name="Judgment"
              component={JudgmentScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="ArgumentDetail"
              component={ArgumentDetailScreen}
            />
            <Stack.Screen
              name="Paywall"
              component={PaywallScreen}
              options={{ presentation: 'modal' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgPrimary,
  },
});
