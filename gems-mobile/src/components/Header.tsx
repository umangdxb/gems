import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { spacing, typography, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightAction,
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View style={styles.content}>
        <View style={styles.leftContainer}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={[styles.backButton, { backgroundColor: colors.backgroundDark }]} activeOpacity={0.6}>
              <Text style={[styles.backIcon, { color: colors.textPrimary }]}>←</Text>
            </TouchableOpacity>
          )}
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>{title}</Text>
            {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>{subtitle}</Text>}
          </View>
        </View>
        {rightAction && <View style={styles.rightContainer}>{rightAction}</View>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xl + 16,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  backIcon: {
    fontSize: 20,
    fontWeight: '600',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  rightContainer: {
    marginLeft: spacing.md,
  },
});
