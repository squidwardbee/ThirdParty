import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAppStore } from '../lib/store';
import { colors } from '../lib/theme';

// Screens
import AuthScreen from '../screens/AuthScreen';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';

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
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Settle',
          // TODO: Add icons
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

  useEffect(() => {
    // TODO: Check auth state with Firebase
    // For now, just simulate a loading state
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
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
        }}
      >
        {!isAuthenticated ? (
          // Auth stack
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          // Main app stack
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            {/* TODO: Add modal screens
            <Stack.Screen
              name="Setup"
              component={SetupScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="LiveMode" component={LiveModeScreen} />
            <Stack.Screen name="TurnBased" component={TurnBasedScreen} />
            <Stack.Screen name="Processing" component={ProcessingScreen} />
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
            */}
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
