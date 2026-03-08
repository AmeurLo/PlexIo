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
import { Card, Button, theme, EmptyState } from '../../src/components';
import { api } from '../../src/services/api';
import { PropertyWithStats, Unit } from '../../src/types';
import { formatCurrency, getPropertyTypeLabel } from '../../src/utils/format';

export default function PropertiesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [properties, setProperties] = useState<PropertyWithStats[]>([]);
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const [units, setUnits] = useState<Record<string, Unit[]>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingProperty, setAddingProperty] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    province: 'QC',
    postal_code: '',
    property_type: 'duplex',
  });

  const loadData = async () => {
    try {
      const data = await api.getProperties();
      setProperties(data);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUnits = async (propertyId: string) => {
    try {
      const propertyUnits = await api.getUnits(propertyId);
      setUnits(prev => ({ ...prev, [propertyId]: propertyUnits }));
    } catch (error) {
      console.error('Error loading units:', error);
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

  const toggleExpand = (propertyId: string) => {
    if (expandedProperty === propertyId) {
      setExpandedProperty(null);
    } else {
      setExpandedProperty(propertyId);
      if (!units[propertyId]) {
        loadUnits(propertyId);
      }
    }
  };

  const handleAddProperty = async () => {
    if (!formData.name || !formData.address || !formData.city || !formData.postal_code) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setAddingProperty(true);
    try {
      await api.createProperty(formData);
      setShowAddModal(false);
      setFormData({
        name: '',
        address: '',
        city: '',
        province: 'QC',
        postal_code: '',
        property_type: 'duplex',
      });
      loadData();
      Alert.alert('Success', 'Property added successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add property');
    } finally {
      setAddingProperty(false);
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Properties</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {properties.length === 0 ? (
          <EmptyState
            icon="home-outline"
            title="No Properties Yet"
            description="Add your first property to start managing your portfolio"
            actionLabel="Add Property"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          properties.map((property) => (
            <View key={property.id}>
              <Card style={styles.propertyCard} onPress={() => toggleExpand(property.id)}>
                <View style={styles.propertyHeader}>
                  <View style={styles.propertyIcon}>
                    <Ionicons name="home" size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.propertyInfo}>
                    <Text style={styles.propertyName}>{property.name}</Text>
                    <Text style={styles.propertyAddress}>
                      {property.address}, {property.city}
                    </Text>
                    <View style={styles.propertyMeta}>
                      <View style={styles.metaTag}>
                        <Text style={styles.metaText}>{getPropertyTypeLabel(property.property_type)}</Text>
                      </View>
                      <View style={styles.metaTag}>
                        <Text style={styles.metaText}>{property.total_units} units</Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons
                    name={expandedProperty === property.id ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color={theme.colors.textSecondary}
                  />
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{property.occupied_units}/{property.total_units}</Text>
                    <Text style={styles.statLabel}>Occupied</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{formatCurrency(property.rent_collected)}</Text>
                    <Text style={styles.statLabel}>Collected</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, property.open_maintenance > 0 && styles.alertText]}>
                      {property.open_maintenance}
                    </Text>
                    <Text style={styles.statLabel}>Issues</Text>
                  </View>
                </View>
              </Card>

              {/* Expanded Units */}
              {expandedProperty === property.id && (
                <View style={styles.unitsContainer}>
                  {units[property.id]?.map((unit) => (
                    <Card key={unit.id} style={styles.unitCard}>
                      <View style={styles.unitHeader}>
                        <View style={styles.unitInfo}>
                          <Text style={styles.unitNumber}>Unit {unit.unit_number}</Text>
                          <Text style={styles.unitDetails}>
                            {unit.bedrooms} bed • {unit.bathrooms} bath
                            {unit.square_feet ? ` • ${unit.square_feet} sqft` : ''}
                          </Text>
                        </View>
                        <View style={styles.unitRight}>
                          <Text style={styles.unitRent}>{formatCurrency(unit.rent_amount)}/mo</Text>
                          <View style={[
                            styles.occupancyBadge,
                            unit.is_occupied ? styles.occupiedBadge : styles.vacantBadge
                          ]}>
                            <Text style={[
                              styles.occupancyText,
                              unit.is_occupied ? styles.occupiedText : styles.vacantText
                            ]}>
                              {unit.is_occupied ? 'Occupied' : 'Vacant'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Card>
                  )) || (
                    <View style={styles.loadingUnits}>
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    </View>
                  )}
                </View>
              )}
            </View>
          ))
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Add Property Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Property</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Property Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="e.g., Duplex Rosemont"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Address *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.address}
                  onChangeText={(text) => setFormData({ ...formData, address: text })}
                  placeholder="Street address"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 2 }]}>
                  <Text style={styles.label}>City *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.city}
                    onChangeText={(text) => setFormData({ ...formData, city: text })}
                    placeholder="City"
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
                  <Text style={styles.label}>Province</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.province}
                    onChangeText={(text) => setFormData({ ...formData, province: text })}
                    placeholder="QC"
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Postal Code *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.postal_code}
                  onChangeText={(text) => setFormData({ ...formData, postal_code: text })}
                  placeholder="H2G 1S6"
                  placeholderTextColor={theme.colors.textTertiary}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Property Type</Text>
                <View style={styles.typeOptions}>
                  {['duplex', 'triplex', 'fourplex', 'sixplex'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        formData.property_type === type && styles.typeOptionSelected,
                      ]}
                      onPress={() => setFormData({ ...formData, property_type: type })}
                    >
                      <Text style={[
                        styles.typeOptionText,
                        formData.property_type === type && styles.typeOptionTextSelected,
                      ]}>
                        {getPropertyTypeLabel(type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Button
                title="Add Property"
                onPress={handleAddProperty}
                loading={addingProperty}
                size="large"
                style={styles.submitButton}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
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
  scrollContent: {
    padding: theme.spacing.md,
    flexGrow: 1,
  },
  propertyCard: {
    marginBottom: theme.spacing.sm,
  },
  propertyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  propertyIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  propertyAddress: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  propertyMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  metaTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 6,
  },
  metaText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  alertText: {
    color: theme.colors.error,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  unitsContainer: {
    marginLeft: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  unitCard: {
    marginBottom: theme.spacing.xs,
    padding: theme.spacing.sm,
  },
  unitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unitInfo: {
    flex: 1,
  },
  unitNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  unitDetails: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  unitRight: {
    alignItems: 'flex-end',
  },
  unitRent: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  occupancyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4,
  },
  occupiedBadge: {
    backgroundColor: theme.colors.successLight,
  },
  vacantBadge: {
    backgroundColor: theme.colors.errorLight,
  },
  occupancyText: {
    fontSize: 10,
    fontWeight: '600',
  },
  occupiedText: {
    color: theme.colors.success,
  },
  vacantText: {
    color: theme.colors.error,
  },
  loadingUnits: {
    padding: theme.spacing.md,
    alignItems: 'center',
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
  formRow: {
    flexDirection: 'row',
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
  typeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.borderLight,
  },
  typeOptionSelected: {
    backgroundColor: theme.colors.primary,
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  typeOptionTextSelected: {
    color: theme.colors.textInverse,
  },
  submitButton: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
});
