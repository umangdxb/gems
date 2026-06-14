import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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

type ScanMode =
  | { type: 'epc'; lineNumber: string }
  | { type: 'src-bin'; lineNumber: string }
  | { type: 'dest-bin'; lineNumber: string };

export const OrderDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { orderId } = route.params;
  const { theme } = useTheme();
  const colors = theme.colors;

  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);

  // scannedEpcs: per-item local accumulator (keyed by lineNumber)
  const [scannedEpcs, setScannedEpcs] = useState<Record<string, string[]>>({});
  // per-item bin overrides (keyed by lineNumber)
  const [overriddenBins, setOverriddenBins] = useState<Record<string, string>>({});
  const [overriddenDestBins, setOverriddenDestBins] = useState<Record<string, string>>({});

  // unified scan mode — null when scanner is closed
  const [scanMode, setScanMode] = useState<ScanMode | null>(null);

  // bin text edit modal — tracks which bin type is being edited
  const [editingBin, setEditingBin] = useState<{ lineNumber: string; binType: 'src-bin' | 'dest-bin'; value: string } | null>(null);

  useEffect(() => {
    fetchOrder();
  }, []);

  async function fetchOrder() {
    setIsLoading(true);
    try {
      const data = await api.get<DeliveryOrder>(`/delivery-orders/${orderId}`);
      setOrder(data);
      const existing: Record<string, string[]> = {};
      for (const item of data.items) {
        if (item.scannedEpcs?.length) existing[item.lineNumber] = [...item.scannedEpcs];
      }
      setScannedEpcs(existing);
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

  // ── Unified scan handler ──────────────────────────────────────────────────
  function handleScan(rawData: string) {
    if (!scanMode) return;

    if (scanMode.type === 'src-bin') {
      setOverriddenBins(prev => ({ ...prev, [scanMode.lineNumber]: rawData }));
      setScanMode(null);
      return;
    }

    if (scanMode.type === 'dest-bin') {
      setOverriddenDestBins(prev => ({ ...prev, [scanMode.lineNumber]: rawData }));
      setScanMode(null);
      return;
    }

    // EPC scan — add to list
    let epc = rawData;
    if (isLikelyGS1Data(rawData)) {
      const gs1 = parseGS1DataMatrix(rawData);
      epc = createGS1Identifier(gs1);
    }
    setScannedEpcs(prev => {
      const existing = prev[scanMode.lineNumber] ?? [];
      if (existing.includes(epc)) return prev;
      return { ...prev, [scanMode.lineNumber]: [...existing, epc] };
    });
  }

  function removeEpc(lineNumber: string, epc: string) {
    setScannedEpcs(prev => ({
      ...prev,
      [lineNumber]: (prev[lineNumber] ?? []).filter(e => e !== epc),
    }));
  }

  // ── Bin edit helpers ──────────────────────────────────────────────────────
  function openBinEdit(item: OrderItem, binType: 'src-bin' | 'dest-bin') {
    const currentValue =
      binType === 'src-bin'
        ? (overriddenBins[item.lineNumber] ?? item.sourceBin ?? '')
        : (overriddenDestBins[item.lineNumber] ?? item.destinationBin ?? '');
    setEditingBin({ lineNumber: item.lineNumber, binType, value: currentValue });
  }

  function saveBinEdit() {
    if (!editingBin) return;
    if (editingBin.value.trim()) {
      if (editingBin.binType === 'src-bin') {
        setOverriddenBins(prev => ({ ...prev, [editingBin.lineNumber]: editingBin.value.trim() }));
      } else {
        setOverriddenDestBins(prev => ({ ...prev, [editingBin.lineNumber]: editingBin.value.trim() }));
      }
    }
    setEditingBin(null);
  }

  function switchToScan() {
    if (!editingBin) return;
    const { lineNumber, binType } = editingBin;
    setEditingBin(null);
    setScanMode({ type: binType, lineNumber });
  }

  // ── Completion ────────────────────────────────────────────────────────────
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
        ...(overriddenBins[item.lineNumber] !== undefined ? { sourceBin: overriddenBins[item.lineNumber] } : {}),
        ...(overriddenDestBins[item.lineNumber] !== undefined ? { destinationBin: overriddenDestBins[item.lineNumber] } : {}),
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

  // ── Render item ───────────────────────────────────────────────────────────
  const renderItem = ({ item, index }: { item: OrderItem; index: number }) => {
    const epcs = scannedEpcs[item.lineNumber] ?? [];
    const sourceBin = overriddenBins[item.lineNumber] ?? item.sourceBin;
    const destBin = overriddenDestBins[item.lineNumber] ?? item.destinationBin;
    const srcBinEdited = overriddenBins[item.lineNumber] !== undefined && overriddenBins[item.lineNumber] !== item.sourceBin;
    const destBinEdited = overriddenDestBins[item.lineNumber] !== undefined && overriddenDestBins[item.lineNumber] !== item.destinationBin;

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
            onPress={() => setScanMode({ type: 'epc', lineNumber: item.lineNumber })}
          >
            <Text style={[styles.scanBtnText, { color: colors.textInverse }]}>Scan EPC</Text>
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

          {/* Source Bin — tappable */}
          <TouchableOpacity style={styles.itemGridCell} onPress={() => openBinEdit(item, 'src-bin')} activeOpacity={0.7}>
            <Text style={[styles.gridLabel, { color: colors.textTertiary }]}>Source Bin ✎</Text>
            <Text
              style={[
                styles.gridValue,
                { color: srcBinEdited ? colors.primary : colors.textPrimary },
                srcBinEdited && { fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {sourceBin || '—'}
            </Text>
          </TouchableOpacity>

          {/* Destination Bin — tappable */}
          <TouchableOpacity style={styles.itemGridCell} onPress={() => openBinEdit(item, 'dest-bin')} activeOpacity={0.7}>
            <Text style={[styles.gridLabel, { color: colors.textTertiary }]}>Dest Bin ✎</Text>
            <Text
              style={[
                styles.gridValue,
                { color: destBinEdited ? colors.primary : colors.textPrimary },
                destBinEdited && { fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {destBin || '—'}
            </Text>
          </TouchableOpacity>
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

      {/* Unified barcode scanner */}
      <BarcodeScanner
        visible={scanMode !== null}
        onClose={() => setScanMode(null)}
        onScan={handleScan}
        title={
          scanMode?.type === 'src-bin' ? 'Scan Source Bin'
          : scanMode?.type === 'dest-bin' ? 'Scan Destination Bin'
          : 'Scan EPC'
        }
        instruction={
          scanMode?.type === 'src-bin' ? 'Scan the source storage bin barcode'
          : scanMode?.type === 'dest-bin' ? 'Scan the destination storage bin barcode'
          : scanMode
          ? `Scanning for: ${order.items.find(i => i.lineNumber === scanMode.lineNumber)?.product ?? scanMode.lineNumber}`
          : ''
        }
      />

      {/* Source bin edit modal */}
      <Modal visible={editingBin !== null} transparent animationType="fade" onRequestClose={() => setEditingBin(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditingBin(null)} />
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundLight }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {editingBin?.binType === 'dest-bin' ? 'Edit Destination Bin' : 'Edit Source Bin'}
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.borderLight, backgroundColor: colors.backgroundDark }]}
              value={editingBin?.value ?? ''}
              onChangeText={v => setEditingBin(prev => prev ? { ...prev, value: v } : null)}
              placeholder="Enter bin code…"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveBinEdit}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.backgroundDark, borderColor: colors.borderLight }]}
                onPress={switchToScan}
              >
                <Text style={[styles.modalBtnText, { color: colors.primary }]}>📷 Scan instead</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={saveBinEdit}
              >
                <Text style={[styles.modalBtnText, { color: colors.textInverse }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  modalTitle: { ...typography.h3, fontWeight: '700' },
  modalInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    fontFamily: 'monospace',
  },
  modalActions: { flexDirection: 'row', gap: spacing.md },
  modalBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalBtnText: { ...typography.body, fontWeight: '600' },
});
