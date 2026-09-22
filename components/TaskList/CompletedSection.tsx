import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../constants/theme';
import { Task } from '../types';
import { styles } from './styles';

export default function CompletedSection({
  tasks,
  expanded,
  onToggleExpanded,
  onToggleComplete,
}: {
  tasks: Task[];
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleComplete: (id: string) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <View style={styles.completedSection}>
      <TouchableOpacity
        style={styles.completedHeader}
        activeOpacity={0.7}
        onPress={onToggleExpanded}
      >
        <Text style={styles.completedHeaderText}>
          Completed ({tasks.length})
        </Text>
        <Icon
          name={expanded ? 'expand-less' : 'expand-more'}
          size={20}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {expanded &&
        tasks.map(task => (
          <View key={task.id} style={styles.completedRow}>
            <TouchableOpacity
              style={styles.completedCheck}
              onPress={() => onToggleComplete(task.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="check" size={12} color={colors.textMuted} />
            </TouchableOpacity>
            <Text style={styles.completedTitle} numberOfLines={1}>
              {task.title}
            </Text>
          </View>
        ))}
    </View>
  );
}
