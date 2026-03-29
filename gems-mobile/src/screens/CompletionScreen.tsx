import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useTheme } from '../context/ThemeContext';
import { spacing, typography } from '../constants/theme';
import { RootStackParamList } from '../types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Completion'>;
  route: RouteProp<RootStackParamList, 'Completion'>;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export const CompletionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { orderNumber, epcisGeneratedAt } = route.params;
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
      <View style={styles.content}>
        {/* Success icon */}
        <View style={[styles.iconCircle, { backgroundColor: colors.success + '1A' }]}>
          <Text style={styles.iconEmoji}>✅</Text>
        </View>

        <Text style={[styles.heading, { color: colors.textPrimary }]}>Order Complete</Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>
          EPCIS file has been generated successfully
        </Text>

        <Card variant="outlined" style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Order Number</Text>
            <Text style={[styles.rowValue, { color: colors.textPrimary }]}>{orderNumber}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Status</Text>
            <Text style={[styles.rowValue, { color: colors.success, fontWeight: '700' }]}>Completed</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>EPCIS Generated</Text>
            <Text style={[styles.rowValue, { color: colors.textPrimary }]}>
              {formatDateTime(epcisGeneratedAt)}
            </Text>
          </View>
        </Card>

        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          The EPCIS XML file can be downloaded from the web admin portal.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="Back to Orders"
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'OrderList' }] })}
          variant="primary"
          size="large"
          fullWidth
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 48 },
  heading: { ...typography.h2, fontWeight: '700', textAlign: 'center' },
  subheading: { ...typography.body, textAlign: 'center' },
  summaryCard: { width: '100%', gap: spacing.md },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowLabel: { ...typography.bodySmall },
  rowValue: { ...typography.bodySmall, fontWeight: '600', textAlign: 'right', flex: 1 },
  divider: { height: 1 },
  hint: { ...typography.caption, textAlign: 'center', paddingHorizontal: spacing.xl },
  actions: { padding: spacing.xl },
});
