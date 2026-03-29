import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { spacing, typography, borderRadius } from '../constants/theme';
import { RootStackParamList } from '../types/navigation';
import type { OrdersListResponse, OrderStatus, OrderType } from '../types/api';

type OrderSummary = Omit<import('../types/api').DeliveryOrder, 'items'>;

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'OrderList'> };

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pending', bg: '#f3f4f6', text: '#374151' },
  in_progress: { label: 'In Progress', bg: '#dbeafe', text: '#1d4ed8' },
  completed: { label: 'Completed', bg: '#d1fae5', text: '#065f46' },
  cancelled: { label: 'Cancelled', bg: '#fee2e2', text: '#991b1b' },
};

const ORDER_TYPE_ICONS: Record<OrderType, string> = {
  picking: '📦',
  packing: '📫',
  commissioning: '⚙️',
  decommissioning: '🗃️',
  shipping: '🚚',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export const OrderListScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const colors = theme.colors;

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const data = await api.get<OrdersListResponse>(`/delivery-orders?${params.toString()}`);
      setOrders(data.orders);
    } catch (err) {
      if (!silent) {
        Alert.alert('Error', 'Could not load orders. Check your connection.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [statusFilter]);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  function handleLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  }

  const filters: Array<OrderStatus | 'all'> = ['all', 'pending', 'in_progress', 'completed'];

  const renderItem = ({ item }: { item: OrderSummary }) => {
    const statusCfg = STATUS_CONFIG[item.status];
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('OrderDetail', { orderId: item._id })}
        activeOpacity={0.7}
      >
        <Card variant="elevated" style={styles.orderCard}>
          <View style={styles.cardTop}>
            <View style={styles.orderInfo}>
              <Text style={[styles.orderIcon]}>{ORDER_TYPE_ICONS[item.orderType]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.orderNumber, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.orderNumber}
                </Text>
                <Text style={[styles.orderMeta, { color: colors.textSecondary }]}>
                  {item.orderType.charAt(0).toUpperCase() + item.orderType.slice(1)}
                  {item.warehouse ? ` · ${item.warehouse}` : ''}
                </Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
              <Text style={[styles.statusText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
            </View>
          </View>
          <Text style={[styles.orderDate, { color: colors.textTertiary }]}>
            {formatDate(item.createdAt)}
          </Text>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
      <Header
        title="Orders"
        subtitle={user?.name}
        rightAction={
          <TouchableOpacity onPress={handleLogout} style={[styles.logoutBtn, { backgroundColor: colors.backgroundDark }]}>
            <Text style={[styles.logoutText, { color: colors.textSecondary }]}>Sign out</Text>
          </TouchableOpacity>
        }
      />

      {/* Filter tabs */}
      <View style={[styles.filterRow, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        {filters.map(f => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterTab,
              statusFilter === f && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setStatusFilter(f)}
          >
            <Text
              style={[
                styles.filterLabel,
                { color: statusFilter === f ? colors.primary : colors.textSecondary },
              ]}
            >
              {f === 'all' ? 'All' : STATUS_CONFIG[f].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No orders found</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => { setIsRefreshing(true); fetchOrders(true); }}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
  },
  filterTab: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.md,
  },
  filterLabel: {
    ...typography.bodySmall,
    fontWeight: '500',
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  orderCard: {
    gap: spacing.xs,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  orderIcon: {
    fontSize: 24,
  },
  orderNumber: {
    ...typography.body,
    fontWeight: '600',
  },
  orderMeta: {
    ...typography.bodySmall,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  orderDate: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
  },
  logoutBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  logoutText: {
    ...typography.bodySmall,
    fontWeight: '500',
  },
});
