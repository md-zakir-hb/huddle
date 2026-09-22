import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../constants/theme';
import { PRIORITY_COLORS, hexToRgba } from '../priorityColors';
import { Priority } from '../types';
import { styles } from './styles';
import { PriorityFilter } from './types';

const FILTERS: { label: PriorityFilter; color: string }[] = [
  { label: 'All', color: colors.primary },
  ...(Object.keys(PRIORITY_COLORS) as Priority[]).map(label => ({
    label,
    color: PRIORITY_COLORS[label],
  })),
];

export default function FilterBar({
  filter,
  onChangeFilter,
  overdueCount,
  overdueExpanded,
  onToggleOverdue,
}: {
  filter: PriorityFilter;
  onChangeFilter: (filter: PriorityFilter) => void;
  overdueCount: number;
  overdueExpanded: boolean;
  onToggleOverdue: () => void;
}) {
  return (
    <View style={styles.filterBar}>
      <View style={styles.filterRow}>
        {FILTERS.map(f => {
          const isActive = filter === f.label;
          const isAll = f.label === 'All';
          return (
            <TouchableOpacity
              key={f.label}
              style={[
                styles.filterChip,
                isActive && isAll && { backgroundColor: f.color },
                isActive &&
                  !isAll && {
                    backgroundColor: hexToRgba(f.color, 0.12),
                  },
                !isActive && { backgroundColor: colors.surface },
              ]}
              onPress={() => onChangeFilter(f.label)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive && isAll && { color: colors.white },
                  isActive && !isAll && { color: f.color },
                  !isActive && { color: colors.textSecondary },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {overdueCount > 0 && (
        <TouchableOpacity
          style={[
            styles.overdueToggleBtn,
            overdueExpanded && styles.overdueToggleBtnActive,
          ]}
          activeOpacity={0.7}
          onPress={onToggleOverdue}
        >
          <Text style={styles.overdueToggleText}>Overdue</Text>
          <View style={styles.overdueBadge}>
            <Text style={styles.overdueBadgeText}>{overdueCount}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}
