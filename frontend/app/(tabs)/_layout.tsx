import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/components';
import { useTranslation } from '../../src/i18n/useTranslation';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIconStyle: styles.tabBarIcon,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabHome") as string,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="properties"
        options={{
          title: t("tabPortfolio") as string,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons name={focused ? "business" : "business-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="tenants"
        options={{
          title: t("tabTenants") as string,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons name={focused ? "people" : "people-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t("tabMessages") as string,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      {/* insights + maintenance are still routable but hidden from tab bar */}
      <Tabs.Screen name="insights" options={{ href: null }} />
      <Tabs.Screen name="maintenance" options={{ href: null }} />

      <Tabs.Screen
        name="more"
        options={{
          title: t("tabMore") as string,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons name={focused ? "grid" : "grid-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 0,
    paddingTop: 6,
    height: Platform.OS === "ios" ? 88 : 64,
    ...theme.shadows.md,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  tabBarIcon: {
    marginBottom: -2,
  },
  activeIconContainer: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});
