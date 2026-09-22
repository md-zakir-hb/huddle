import React, { useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MemberInfoModal from '../MemberInfoModal';
import { colors } from '../../constants/theme';
import { formatDateTime } from '../dateUtils';
import { PRIORITY_COLORS, hexToRgba } from '../priorityColors';
import { getInitials } from '../profileUtils';
import { Task } from '../types';
import { styles } from './styles';

export interface TaskAssignee {
  id: string;
  name: string | null;
  avatar_url: string | null;
}

const MAX_VISIBLE_ASSIGNEES = 3;

export default function TaskItem({
  task,
  isExpanded,
  assignees,
  onToggleExpand,
  onToggleComplete,
  onEdit,
  onDelete,
}: {
  task: Task;
  isExpanded: boolean;
  assignees?: TaskAssignee[];
  onToggleExpand: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const priorityColor = task.priority ? PRIORITY_COLORS[task.priority] : null;
  const checkboxBorderColor = priorityColor ?? colors.border;
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => onToggleExpand(task.id)}
      >
        <TouchableOpacity
          style={[styles.checkbox, { borderColor: checkboxBorderColor }]}
          onPress={() => onToggleComplete(task.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        />

        <Text style={styles.taskTitle} numberOfLines={1}>
          {task.title}
        </Text>

        {assignees && assignees.length > 0 && (
          <View style={styles.assigneeStack}>
            {assignees
              .slice(0, MAX_VISIBLE_ASSIGNEES)
              .map((assignee, index) => (
                <TouchableOpacity
                  key={assignee.id}
                  style={[
                    styles.assigneeAvatar,
                    index > 0 && styles.assigneeAvatarOverlap,
                  ]}
                  onPress={() => setSelectedMemberId(assignee.id)}
                  hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
                >
                  {assignee.avatar_url ? (
                    <Image
                      source={{ uri: assignee.avatar_url }}
                      style={styles.assigneeAvatarImage}
                    />
                  ) : (
                    <Text style={styles.assigneeInitial}>
                      {getInitials(assignee.name, null)}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
          </View>
        )}

        <Icon
          name={isExpanded ? 'expand-less' : 'expand-more'}
          size={30}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.details}>
          {task.description ? (
            <Text style={styles.taskSubtitle}>{task.description}</Text>
          ) : null}

          <View style={styles.metaRow}>
            {task.date && (
              <View style={styles.metaChip}>
                <Icon
                  name="access-time"
                  size={12}
                  color={colors.textSecondary}
                />
                <Text style={styles.metaText}>
                  {formatDateTime(new Date(task.date))}
                </Text>
                {task.reminder && (
                  <Icon
                    name="notifications"
                    size={12}
                    color={colors.textSecondary}
                  />
                )}
              </View>
            )}

            {task.priority && priorityColor && (
              <View
                style={[
                  styles.priorityChip,
                  { backgroundColor: hexToRgba(priorityColor, 0.12) },
                ]}
              >
                <View
                  style={[
                    styles.priorityDot,
                    { backgroundColor: priorityColor },
                  ]}
                />
                <Text style={[styles.priorityText, { color: priorityColor }]}>
                  {task.priority}
                </Text>
              </View>
            )}

            <View style={styles.taskActions}>
              <TouchableOpacity
                style={styles.taskActionBtn}
                onPress={() => onEdit(task)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="edit" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.taskActionBtn}
                onPress={() => onDelete(task)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="delete-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <MemberInfoModal
        visible={!!selectedMemberId}
        userId={selectedMemberId}
        onClose={() => setSelectedMemberId(null)}
      />
    </View>
  );
}
