import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../constants/theme';
import { formatDateTime } from '../dateUtils';
import { Task } from '../types';
import { styles } from './styles';

export default function OverdueSection({
  tasks,
  onToggleComplete,
  onReschedule,
  onDelete,
}: {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onReschedule: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <View style={styles.overdueSection}>
      {tasks.map(task => (
        <View key={task.id} style={styles.overdueRow}>
          <TouchableOpacity
            style={styles.overdueCheck}
            onPress={() => onToggleComplete(task.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          />
          <View style={styles.overdueTaskInfo}>
            <Text style={styles.overdueTitle} numberOfLines={1}>
              {task.title}
            </Text>
            {task.date && (
              <Text style={styles.overdueDate}>
                {formatDateTime(new Date(task.date))}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.overdueEditBtn}
            onPress={() => onReschedule(task)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="edit-calendar" size={20} color={colors.error} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.overdueEditBtn}
            onPress={() => onDelete(task)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="delete-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}
