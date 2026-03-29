import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import { spacing, typography, borderRadius } from '../constants/theme';
import { RootStackParamList } from '../types/navigation';
import type { DeliveryOrder, OrderItem } from '../types/api';
import { isLikelyGS1Data, parseGS1DataMatrix, createGS1Identifier } from '../utils/gs1Parser';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OrderDetail'>;
  route: RouteProp<RootStackParamList, 'OrderDetail'>;
};

export const OrderDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { orderId } = route.params;
  const { theme } = useTheme();
  const colors = theme.colors;

  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);

  // scannedEpcs: per-item local accumulator (keyed by lineNumber)
  const [scannedEpcs, setScannedEpcs] = useState<Record<string, string[]>>({});
  // which item is currently being scanned (lineNumber | null)
  const [scanningFor, setScanningFor] = useState<string | null>(null);

  useEffect(() => {
    fetchOrder();
  }, []);

  async function fetchOrder() {
    setIsLoading(true);
    try {
      const data = await api.get<DeliveryOrder>(`/delivery-orders/${orderId}`);
      setOrder(data);
      // Pre-fill any EPCs already stored on the order (e.g. resumed session)
      const existing: Record<string, string[]> = {};
      for (const item of data.items) {
        if (item.scannedEpcs?.length) existing[item.lineNumber] = [...item.scannedEpcs];
      }
      setScannedEpcs(existing);
      // Auto-transition to in_progress if still pending
      if (data.status === 'pending') {
        await api.patch(`/delivery-orders/${orderId}/status`, { status: 'in_progress' });
      }
    } catch (err) {
      Alert.alert('Error', 'Could not load order details.');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  }

  function handleBarcodeScanned(rawData: string) {
    if (!scanningFor) return;
    let epc = rawData;
    if (isLikelyGS1Data(rawData)) {
      const gs1 = parseGS1DataMatrix(rawData);
      epc = createGS1Identifier(gs1);
    }
    setScannedEpcs(prev => {
      const existing = prev[scanningFor] ?? [];
      if (existing.includes(epc)) return prev; // duplicate
      return { ...prev, [scanningFor]: [...existing, epc] };
    });
  }

  function removeEpc(lineNumber: string, epc: string) {
    setScannedEpcs(prev => ({
      ...prev,
      [lineNumber]: (prev[lineNumber] ?? []).filter(e => e !== epc),
    }));
  }

  const totalScanned = Object.values(scannedEpcs).reduce((sum, epcs) => sum + epcs.length, 0);

  async function handleComplete() {
    if (!order) return;
    if (totalScanned === 0) {
      Alert.alert('No EPCs scanned', 'Scan at least one barcode before completing.');
      return;
    }
    Alert.alert(
      'Complete order?',
      `This will generate the EPCIS file with ${totalScanned} scanned EPC${totalScanned !== 1 ? 's' : ''}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete', onPress: doComplete },
      ]
    );
  }

  async function doComplete() {
    if (!order) return;
    setIsCompleting(true);
    try {
      const items = order.items.map(item => ({
        lineNumber: item.lineNumber,
        scannedEpcs: scannedEpcs[item.lineNumber] ?? [],
      }));
      const result = await api.post<{ id: string; status: string; epcisGeneratedAt: string }>(
        `/delivery-orders/${orderId}/complete`,
        { items }
      );
      navigation.replace('Completion', {
        orderNumber: order.orderNumber,
        epcisGeneratedAt: result.epcisGeneratedAt,
      });
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to complete order.');
    } finally {
      setIsCompleting(false);
    }
  }

  const renderItem = ({ item, index }: { item: OrderItem; index: number }) => {
    const epcs = scannedEpcs[item.lineNumber] ?? [];
    return (
      <Card variant="outlined" style={styles.itemCard} key={item.lineNumber}>
        {/* Item header row */}
        <View style={styles.itemHeader}>
          <View style={styles.itemIndex}>
            <Text style={[styles.itemIndexText, { color: colors.textInverse }]}>{index + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemProduct, { color: colors.textPrimary }]} numberOfLines={2}>
              {item.product}
            </Text>
            {item.batch ? (
              <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                Batch: {item.batch}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={[styles.scanBtn, { backgroundColor: colors.primary }]}
            onPress={() => setScanningFor(item.lineNumber)}
          >
            <Text style={[styles.scanBtnText, { color: colors.textInverse }]}>Scan</Text>
          </TouchableOpacity>
        </View>

        {/* Item details grid */}
        <View style={styles.itemGrid}>
          <View style={styles.itemGridCell}>
            <Text style={[styles.gridLabel, { color: colors.textTertiary }]}>Qty</Text>
            <Text style={[styles.gridValue, { color: colors.textPrimary }]}>
              {item.quantity} {item.unit}
            </Text>
          </View>
          <View style={styles.itemGridCell}>
            <Text style={[styles.gridLabel, { color: colors.textTertiary }]}>Source</Text>
            <Text style={[styles.gridValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.sourceBin || '—'}
            </Text>
          </View>
          <View style={styles.itemGridCell}>
            <Text style={[styles.gridLabel, { color: colors.textTertiary }]}>Dest</Text>
            <Text style={[styles.gridValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.destinationBin || '—'}
            </Text>
          </View>
          <View style={styles.itemGridCell}>
            <Text style={[styles.gridLabel, { color: colors.textTertiary }]}>Scanned</Text>
            <Text
              style={[
                styles.gridValue,
                { color: epcs.length > 0 ? colors.success : colors.textTertiary },
                epcs.length > 0 && { fontWeight: '700' },
              ]}
            >
              {epcs.length}
            </Text>
          </View>
        </View>

        {/* Scanned EPCs list */}
        {epcs.length > 0 && (
          <View style={[styles.epcList, { borderTopColor: colors.borderLight }]}>
            {epcs.map(epc => (
              <View key={epc} style={[styles.epcRow, { backgroundColor: colors.backgroundDark }]}>
                <Text style={[styles.epcText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {epc}
                </Text>
                <TouchableOpacity onPress={() => removeEpc(item.lineNumber, epc)} style={styles.epcRemove}>
                  <Text style={[styles.epcRemoveText, { color: colors.error }]}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </Card>
    );
  };

  if (isLoading || !order) {
    return (
      <View style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
        <Header title="Order Detail" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
      <Header
        title={order.orderNumber}
        subtitle={`${order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1)}${order.warehouse ? ` · ${order.warehouse}` : ''}`}
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={order.items}
        keyExtractor={item => item.lineNumber || item.warehouseTask}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Card variant="elevated" style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Items</Text>
                <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{order.items.length}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>EPCs Scanned</Text>
                <Text style={[styles.summaryValue, { color: totalScanned > 0 ? colors.success : colors.textPrimary }]}>
                  {totalScanned}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Status</Text>
                <Text style={[styles.summaryValue, { color: colors.info }]}>
                  {order.status.replace('_', ' ')}
                </Text>
              </View>
            </View>
          </Card>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Button
              title={isCompleting ? 'Completing…' : `Complete Order (${totalScanned} EPC${totalScanned !== 1 ? 's' : ''})`}
              onPress={handleComplete}
              variant="primary"
              size="large"
              fullWidth
              loading={isCompleting}
              disabled={totalScanned === 0 || isCompleting}
            />
          </View>
        }
      />

      <BarcodeScanner
        visible={scanningFor !== null}
        onClose={() => setScanningFor(null)}
        onScan={handleBarcodeScanned}
        title="Scan EPC"
        instruction={
          scanningFor
            ? `Scanning for: ${order.items.find(i => i.lineNumber === scanningFor)?.product ?? scanningFor}`
            : 'Scan barcode'
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  summaryCard: { marginBottom: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center', gap: spacing.xs },
  summaryLabel: { ...typography.caption },
  summaryValue: { ...typography.h3, fontWeight: '700' },
  itemCard: { gap: spacing.md },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  itemIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1a2942',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  itemIndexText: { ...typography.caption, fontWeight: '700' },
  itemProduct: { ...typography.body, fontWeight: '600', flexShrink: 1 },
  itemMeta: { ...typography.bodySmall, marginTop: 2 },
  scanBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  scanBtnText: { ...typography.bodySmall, fontWeight: '600' },
  itemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  itemGridCell: { minWidth: '22%', gap: 2 },
  gridLabel: { ...typography.caption },
  gridValue: { ...typography.bodySmall, fontWeight: '500' },
  epcList: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  epcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.sm,
  },
  epcText: { ...typography.caption, fontFamily: 'monospace', flex: 1 },
  epcRemove: { padding: spacing.xs },
  epcRemoveText: { ...typography.bodySmall, fontWeight: '700' },
  footer: { marginTop: spacing.lg },
});
