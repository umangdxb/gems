import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { borderRadius, spacing, typography } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;

  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: colors.primary };
      case 'secondary':
        return { backgroundColor: colors.secondary };
      case 'outline':
        return { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border };
      case 'ghost':
        return { backgroundColor: 'transparent' };
      default:
        return {};
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return colors.textInverse;
      case 'secondary':
        return colors.textPrimary;
      case 'outline':
        return colors.textPrimary;
      case 'ghost':
        return colors.textSecondary;
      default:
        return colors.textPrimary;
    }
  };

  const buttonStyles = [
    styles.button,
    getButtonStyle(),
    styles[size],
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    { color: getTextColor() },
    styles[`${size}Text` as keyof typeof styles] as TextStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.textInverse : colors.primary} />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  
  // Sizes
  small: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 36,
  },
  medium: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 44,
  },
  large: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    minHeight: 52,
  },
  
  // States
  disabled: {
    opacity: 0.4,
  },
  fullWidth: {
    width: '100%',
  },
  
  // Text styles
  text: {
    ...typography.body,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  smallText: {
    ...typography.bodySmall,
  },
  mediumText: {
    ...typography.body,
  },
  largeText: {
    fontSize: 16,
    lineHeight: 22,
  },
});
