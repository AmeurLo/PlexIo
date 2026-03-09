import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, theme } from '../src/components';
import { api } from '../src/services/api';
import { UnitTimeline, TimelineEvent } from '../src/types';
import { formatDate, formatRelativeDate } from '../src/utils/format';

const EVENT_ICONS: Record<string, string> = {
  lease_created: 'document-text',
  tenant_move_in: 'person-add',
  rent_payment: 'cash',
  late_payment: 'alert-circle',
  maintenance_opened: 'construct',
  maintenance_completed: 'checkmark-circle',
  lease_renewal: 'document',
};

const EVENT_LABELS: Record<string, string> = {
  lease_created: 'Lease',
  tenant_move_in: 'Move-In',
  rent_payment: 'Payment',
  late_payment: 'Late Pay',
  maintenance_opened: 'Issue',
  maintenance_completed: 'Repair',
  lease_renewal: 'Lease End',
};

export default function UnitTimelineScreen() {
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<UnitTimeline | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const loadData = async () => {
    if (!unitId) return;
    try {
      const result = await api.getUnitTimeline(unitId);
      setData(result);
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [unitId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'rent', label: 'Payments' },
    { key: 'lease', label: 'Leases' },
    { key: 'maintenance', label: 'Issues' },
  ];

  const filteredEvents = data?.events.filter((event) => {
    if (filter === 'all') return true;
    if (filter === 'rent') return event.event_type === 'rent_payment' || event.event_type === 'late_payment';
    if (filter === 'lease') return event.event_type === 'lease_created' || event.event_type === 'tenant_move_in' || event.event_type === 'lease_renewal';
    if (filter === 'maintenance') return event.event_type === 'maintenance_opened' || event.event_type === 'maintenance_completed';
    return true;
  }) || [];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Unit {data?.unit_number || ''}</Text>
          <Text style={styles.headerSubtitle}>{data?.property_name || ''}</Text>
        </View>
        <View style={styles.eventCount}>
          <Text style={styles.eventCountText}>{data?.events.length || 0}</Text>
          <Text style={styles.eventCountLabel}>events</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterTabText, filter === f.key && styles.filterTabTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Timeline */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {filteredEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Events</Text>
            <Text style={styles.emptyText}>
              {filter === 'all' ? 'No events recorded for this unit yet' : `No ${filter} events found`}
            </Text>
          </View>
        ) : (
          filteredEvents.map((event, index) => (
            <TimelineItem
              key={event.id}
              event={event}
              isLast={index === filteredEvents.length - 1}
              isFirst={index === 0}
            />
          ))
        )}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Timeline Item Component
const TimelineItem = ({
  event,
  isLast,
  isFirst,
}: {
  event: TimelineEvent;
  isLast: boolean;
  isFirst: boolean;
}) => {
  const iconName = EVENT_ICONS[event.event_type] || 'ellipse';
  const label = EVENT_LABELS[event.event_type] || event.event_type;

  return (
    <View style={styles.timelineItem}>
      {/* Timeline Line */}
      <View style={styles.timelineLine}>
        {!isFirst && <View style={styles.lineTop} />}
        <View style={[styles.dot, { backgroundColor: event.color }]}>
          <Ionicons name={iconName as any} size={14} color="#FFFFFF" />
        </View>
        {!isLast && <View style={styles.lineBottom} />}
      </View>

      {/* Event Card */}
      <View style={styles.timelineCard}>
        <View style={styles.eventHeader}>
          <View style={[styles.eventBadge, { backgroundColor: event.color + '18' }]}>
            <Text style={[styles.eventBadgeText, { color: event.color }]}>{label}</Text>
          </View>
          <Text style={styles.eventDate}>
            {formatRelativeDate(event.date)}
          </Text>
        </View>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventDescription} numberOfLines={3}>{event.description}</Text>
        <Text style={styles.eventFullDate}>{formatDate(event.date)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: theme.colors.borderLight,
    marginRight: theme.spacing.sm,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  eventCount: {
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  eventCountText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  eventCountLabel: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: '500',
  },

  // Filters
  filterContainer: {
    backgroundColor: theme.colors.surface,
    paddingBottom: theme.spacing.sm,
  },
  filterScroll: {
    paddingHorizontal: theme.spacing.md,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.borderLight,
  },
  filterTabActive: {
    backgroundColor: theme.colors.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },

  // Scroll
  scrollContent: {
    padding: theme.spacing.md,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },

  // Timeline Item
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  timelineLine: {
    width: 36,
    alignItems: 'center',
  },
  lineTop: {
    width: 2,
    height: 12,
    backgroundColor: theme.colors.border,
  },
  lineBottom: {
    flex: 1,
    width: 2,
    backgroundColor: theme.colors.border,
  },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },

  // Event Card
  timelineCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginLeft: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadows.sm,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  eventBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventDate: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  eventFullDate: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 6,
  },

  bottomSpacing: {
    height: theme.spacing.xxl,
  },
});
