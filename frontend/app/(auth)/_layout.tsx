import React from 'react';
import { Stack } from 'expo-router';
import { theme } from '../../src/components';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="tenant-login" />
    </Stack>
  );
}
