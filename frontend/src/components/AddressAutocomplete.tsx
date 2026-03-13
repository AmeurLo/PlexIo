/**
 * AddressAutocomplete.tsx
 * Canadian address autocomplete powered by OpenStreetMap Nominatim (free, no API key).
 * When a suggestion is selected it auto-fills address, city, province and postal code.
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from './theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AddressSuggestion {
  placeId: number;
  displayName: string;   // full formatted address (for display in dropdown)
  address: string;       // street address only, e.g. "2347 Rue Notre-Dame Ouest"
  city: string;          // e.g. "Montréal"
  province: string;      // 2-letter code, e.g. "QC"
  postalCode: string;    // e.g. "H3J 1L8"
}

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  style?: ViewStyle;
}

// ─── Province name → code ─────────────────────────────────────────────────────

const PROVINCE_CODES: Record<string, string> = {
  'québec': 'QC',
  'quebec': 'QC',
  'ontario': 'ON',
  'british columbia': 'BC',
  'alberta': 'AB',
  'manitoba': 'MB',
  'saskatchewan': 'SK',
  'nova scotia': 'NS',
  'new brunswick': 'NB',
  'prince edward island': 'PE',
  'newfoundland and labrador': 'NL',
  'northwest territories': 'NT',
  'nunavut': 'NU',
  'yukon': 'YT',
};

function toProvinceCode(name: string): string {
  if (!name) return 'QC';
  const key = name.toLowerCase().trim();
  return PROVINCE_CODES[key] ?? name.toUpperCase().slice(0, 2);
}

// ─── Parse Nominatim result into AddressSuggestion ───────────────────────────

function parseNominatim(item: any): AddressSuggestion {
  const a = item.address ?? {};

  // Street address: prefer house_number + road, fall back to amenity/suburb
  const houseNumber = a.house_number ?? '';
  const road = a.road ?? a.pedestrian ?? a.footway ?? a.path ?? '';
  const streetAddress = houseNumber && road
    ? `${houseNumber} ${road}`
    : road || a.amenity || '';

  // City: try multiple fields (Nominatim field varies by place type)
  const city =
    a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? '';

  // Province
  const province = toProvinceCode(a.state ?? '');

  // Postal code: format as Canadian X#X #X# if 6 chars
  let postalCode = (a.postcode ?? '').replace(/\s/g, '').toUpperCase();
  if (postalCode.length === 6) {
    postalCode = `${postalCode.slice(0, 3)} ${postalCode.slice(3)}`;
  }

  // Clean display name: strip country suffix
  const displayName = item.display_name?.replace(', Canada', '') ?? streetAddress;

  return {
    placeId: item.place_id,
    displayName,
    address: streetAddress,
    city,
    province,
    postalCode,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AddressAutocomplete({ value, onChangeText, onSelect, placeholder, style }: Props) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState(false);   // true once user picked a suggestion
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 4) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        format: 'json',
        q: query,
        countrycodes: 'ca',
        addressdetails: '1',
        limit: '6',
        'accept-language': 'fr,en',
      });

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: {
            'User-Agent': 'PlexIo-PropertyManager/1.0',
            'Accept-Language': 'fr,en',
          },
        }
      );

      if (!res.ok) throw new Error('Nominatim error');
      const data: any[] = await res.json();

      // Filter: must have a road (actual civic address), and prioritize ones with house numbers
      const parsed = data
        .map(parseNominatim)
        .filter(s => s.address.length > 0)
        .slice(0, 5);

      setSuggestions(parsed);
      setShowDropdown(parsed.length > 0);
    } catch {
      // Network error or Nominatim unavailable — hide dropdown silently
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChangeText = (text: string) => {
    onChangeText(text);
    setSelected(false);

    // Debounce 420ms
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 420);
  };

  const handleSelect = (s: AddressSuggestion) => {
    onChangeText(s.address);
    onSelect(s);
    setSelected(true);
    setSuggestions([]);
    setShowDropdown(false);
  };

  const handleClear = () => {
    onChangeText('');
    setSuggestions([]);
    setShowDropdown(false);
    setSelected(false);
  };

  return (
    <View style={[styles.wrapper, style]}>
      {/* Input row */}
      <View style={[styles.inputRow, showDropdown && styles.inputRowOpen]}>
        <Ionicons name="location-outline" size={18} color={theme.colors.textTertiary} style={styles.prefixIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder ?? 'Ex. 2347 Rue Notre-Dame O'}
          placeholderTextColor={theme.colors.textTertiary}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
        />
        {loading && (
          <ActivityIndicator size="small" color={theme.colors.primary} style={styles.suffixIcon} />
        )}
        {!loading && value.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.suffixIcon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        )}
        {!loading && selected && value.length > 0 && (
          <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} style={styles.suffixIcon} />
        )}
      </View>

      {/* Dropdown suggestions */}
      {showDropdown && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.map((s, idx) => {
            const isLast = idx === suggestions.length - 1;
            return (
              <TouchableOpacity
                key={s.placeId}
                style={[styles.suggestionRow, !isLast && styles.suggestionDivider]}
                onPress={() => handleSelect(s)}
                activeOpacity={0.7}
              >
                <View style={styles.suggestionIcon}>
                  <Ionicons name="pin-outline" size={14} color={theme.colors.primary} />
                </View>
                <View style={styles.suggestionText}>
                  {/* Primary line: street address + city */}
                  <Text style={styles.suggestionMain} numberOfLines={1}>
                    {s.address || s.city}{s.city && s.address ? `, ${s.city}` : ''}
                  </Text>
                  {/* Secondary line: shorter display name */}
                  <Text style={styles.suggestionSub} numberOfLines={1}>
                    {[s.province, s.postalCode].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            );
          })}
          {/* Attribution required by Nominatim ToS */}
          <View style={styles.attribution}>
            <Ionicons name="map-outline" size={10} color={theme.colors.textTertiary} />
            <Text style={styles.attributionText}>© OpenStreetMap contributors</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    // Important: zIndex so dropdown floats above following form fields
    zIndex: 100,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 10,
  },
  inputRowOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: theme.colors.primary,
    borderBottomColor: 'transparent',
  },

  prefixIcon: {
    marginRight: 6,
  },
  suffixIcon: {
    marginLeft: 6,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textPrimary,
    paddingVertical: 12,
  },

  // Dropdown
  dropdown: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: theme.colors.primary,
    borderBottomLeftRadius: theme.borderRadius.md,
    borderBottomRightRadius: theme.borderRadius.md,
    overflow: 'hidden',
    // Shadow (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    // Elevation (Android)
    elevation: 6,
    zIndex: 200,
  },

  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 8,
  },
  suggestionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  suggestionIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: {
    flex: 1,
  },
  suggestionMain: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  suggestionSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },

  attribution: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  attributionText: {
    fontSize: 9,
    color: theme.colors.textTertiary,
  },
});
