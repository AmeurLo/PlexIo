import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, theme, StatusBadge, EmptyState } from '../../src/components';
import { api } from '../../src/services/api';
import { MaintenanceRequestWithDetails, PropertyWithStats } from '../../src/types';
import { formatCurrency, formatRelativeDate, getPriorityConfig, getMaintenanceStatusConfig } from '../../src/utils/format';

export default function MaintenanceScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<MaintenanceRequestWithDetails[]>([]);
  const [properties, setProperties] = useState<PropertyWithStats[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'completed'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingRequest, setAddingRequest] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequestWithDetails | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const [formData, setFormData] = useState({
    property_id: '',
    title: '',
    description: '',
    priority: 'medium',
    reported_by: '',
  });

  const loadData = async () => {
    try {
      const [requestsData, propertiesData] = await Promise.all([
        api.getMaintenanceRequests(),
        api.getProperties(),
      ]);
      setRequests(requestsData);
      setProperties(propertiesData);
    } catch (error) {
      console.error('Error loading maintenance:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredRequests = requests.filter(r => {
    if (filter === 'all') return r.status !== 'completed' && r.status !== 'cancelled';
    return r.status === filter;
  });

  const handleAddRequest = async () => {
    if (!formData.property_id || !formData.title || !formData.description) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setAddingRequest(true);
    try {
      await api.createMaintenanceRequest({
        property_id: formData.property_id,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        reported_by: formData.reported_by || undefined,
      });
      setShowAddModal(false);
      setFormData({
        property_id: '',
        title: '',
        description: '',
        priority: 'medium',
        reported_by: '',
      });
      loadData();
      Alert.alert('Success', 'Maintenance request created');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create request');
    } finally {
      setAddingRequest(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedRequest) return;

    try {
      await api.updateMaintenanceRequest(selectedRequest.id, status);
      setShowStatusModal(false);
      setSelectedRequest(null);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update status');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const openCount = requests.filter(r => r.status === 'open').length;
  const inProgressCount = requests.filter(r => r.status === 'in_progress').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Maintenance</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, styles.openValue]}>{openCount}</Text>
          <Text style={styles.statLabel}>Open</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, styles.progressValue]}>{inProgressCount}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {(['all', 'open', 'in_progress', 'completed'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f === 'all' ? 'Active' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {filteredRequests.length === 0 ? (
          <EmptyState
            icon="construct-outline"
            title={filter === 'all' ? 'No Active Issues' : `No ${filter.replace('_', ' ')} Issues`}
            description="All maintenance requests will appear here"
            actionLabel="Report Issue"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          filteredRequests.map((request) => {
            const priorityConfig = getPriorityConfig(request.priority);
            const statusConfig = getMaintenanceStatusConfig(request.status);
            return (
              <Card
                key={request.id}
                style={styles.requestCard}
                onPress={() => {
                  setSelectedRequest(request);
                  setShowStatusModal(true);
                }}
              >
                <View style={styles.requestHeader}>
                  <View style={styles.requestTitleRow}>
                    <Text style={styles.requestTitle} numberOfLines={2}>{request.title}</Text>
                    <StatusBadge
                      label={priorityConfig.label}
                      color={priorityConfig.color}
                      bgColor={priorityConfig.bgColor}
                      size="small"
                    />
                  </View>
                  <Text style={styles.requestLocation}>
                    {request.property_name}{request.unit_number ? ` - Unit ${request.unit_number}` : ''}
                  </Text>
                </View>

                <Text style={styles.requestDescription} numberOfLines={2}>
                  {request.description}
                </Text>

                <View style={styles.requestFooter}>
                  <View style={styles.requestMeta}>
                    <Ionicons name="time-outline" size={14} color={theme.colors.textTertiary} />
                    <Text style={styles.requestTime}>{formatRelativeDate(request.created_at)}</Text>
                  </View>
                  <StatusBadge
                    label={statusConfig.label}
                    color={statusConfig.color}
                    bgColor={statusConfig.bgColor}
                    size="small"
                  />
                </View>

                {request.reported_by && (
                  <Text style={styles.reportedBy}>Reported by: {request.reported_by}</Text>
                )}
              </Card>
            );
          })
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Add Request Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Issue</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Property *</Text>
                <View style={styles.propertyOptions}>
                  {properties.map((prop) => (
                    <TouchableOpacity
                      key={prop.id}
                      style={[
                        styles.propertyOption,
                        formData.property_id === prop.id && styles.propertyOptionSelected,
                      ]}
                      onPress={() => setFormData({ ...formData, property_id: prop.id })}
                    >
                      <Text style={[
                        styles.propertyOptionText,
                        formData.property_id === prop.id && styles.propertyOptionTextSelected,
                      ]}>
                        {prop.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Issue Title *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.title}
                  onChangeText={(text) => setFormData({ ...formData, title: text })}
                  placeholder="Brief description of the issue"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Detailed description of the problem"
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Priority</Text>
                <View style={styles.priorityOptions}>
                  {['low', 'medium', 'high', 'urgent'].map((p) => {
                    const config = getPriorityConfig(p);
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.priorityOption,
                          formData.priority === p && { backgroundColor: config.bgColor },
                        ]}
                        onPress={() => setFormData({ ...formData, priority: p })}
                      >
                        <Text style={[
                          styles.priorityOptionText,
                          formData.priority === p && { color: config.color },
                        ]}>
                          {config.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Reported By</Text>
                <TextInput
                  style={styles.input}
                  value={formData.reported_by}
                  onChangeText={(text) => setFormData({ ...formData, reported_by: text })}
                  placeholder="Tenant name (optional)"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>

              <Button
                title="Create Request"
                onPress={handleAddRequest}
                loading={addingRequest}
                size="large"
                style={styles.submitButton}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Status Update Modal */}
      <Modal visible={showStatusModal} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.statusModalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusModal(false)}
        >
          <View style={styles.statusModalContent}>
            <Text style={styles.statusModalTitle}>Update Status</Text>
            {selectedRequest && (
              <Text style={styles.statusModalSubtitle}>{selectedRequest.title}</Text>
            )}
            
            <View style={styles.statusOptions}>
              {(['open', 'in_progress', 'completed', 'cancelled'] as const).map((status) => {
                const config = getMaintenanceStatusConfig(status);
                const isSelected = selectedRequest?.status === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      isSelected && { backgroundColor: config.bgColor },
                    ]}
                    onPress={() => handleUpdateStatus(status)}
                  >
                    <Text style={[
                      styles.statusOptionText,
                      isSelected && { color: config.color },
                    ]}>
                      {config.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={config.color} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  openValue: {
    color: theme.colors.error,
  },
  progressValue: {
    color: theme.colors.warning,
  },
  statLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    gap: theme.spacing.sm,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.borderLight,
  },
  filterTabActive: {
    backgroundColor: theme.colors.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  filterTabTextActive: {
    color: theme.colors.textInverse,
  },
  scrollContent: {
    padding: theme.spacing.md,
    flexGrow: 1,
  },
  requestCard: {
    marginBottom: theme.spacing.sm,
  },
  requestHeader: {
    marginBottom: theme.spacing.sm,
  },
  requestTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  requestTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  requestLocation: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  requestDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  requestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  requestTime: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  reportedBy: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.sm,
  },
  bottomSpacing: {
    height: theme.spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  formGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  propertyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  propertyOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.borderLight,
  },
  propertyOptionSelected: {
    backgroundColor: theme.colors.primary,
  },
  propertyOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  propertyOptionTextSelected: {
    color: theme.colors.textInverse,
  },
  priorityOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.borderLight,
    alignItems: 'center',
  },
  priorityOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  submitButton: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  statusModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  statusModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 320,
  },
  statusModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  statusModalSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  statusOptions: {
    gap: theme.spacing.sm,
  },
  statusOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.borderLight,
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
});
