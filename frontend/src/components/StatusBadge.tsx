import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from './theme';

interface StatusBadgeProps {
  label: string;
  color: string;
  bgColor: string;
  size?: 'small' | 'medium';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, color, bgColor, size = 'medium' }) => {
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }, size === 'small' && styles.small]}>
      <Text style={[styles.text, { color }, size === 'small' && styles.smallText]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    alignSelf: 'flex-start',
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  smallText: {
    fontSize: 10,
  },
});
