import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { borderRadius, spacing, shadows } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: keyof typeof spacing;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'lg',
  style,
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;

  const cardStyle: ViewStyle[] = [
    styles.base,
    { backgroundColor: colors.surface, padding: spacing[padding] },
    ...(variant === 'elevated' ? [shadows.small as ViewStyle] : []),
    ...(variant === 'outlined' ? [{ borderWidth: 1, borderColor: colors.border } as ViewStyle] : []),
    ...(style ? [style] : []),
  ];

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.lg,
  },
});
