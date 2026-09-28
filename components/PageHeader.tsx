import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, radius, spacing } from '../constants/theme';
import { scheduleTaskReminder } from '../lib/notifications';
import { createTask } from '../lib/tasksApi';
import AddTaskModal from './AddTaskModal';
import RatingBadge from './RatingBadge';
import ScreenHeader from './ScreenHeader';
import { Task } from './types';

export default function PageHeader({
  tasks,
  setTasks,
}: {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}) {
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const completedCount = tasks.filter(task => task.completed).length;

  return (
    <ScreenHeader title="Daily Tasks" subtitle="Manage your daily tasks">
      <View style={styles.TaskCountCard}>
        <View>
          <Text style={styles.taskCount}>
            {completedCount}/{tasks.length}
          </Text>
          <Text style={styles.taskTitle}>tasks</Text>
        </View>
        <RatingBadge
          refreshKey={tasks
            .map(task => `${task.id}:${task.completed}:${task.date}`)
            .join('|')}
        />
      </View>
      <TouchableOpacity
        style={styles.addTaskButton}
        activeOpacity={0.9}
        onPress={() => setModalVisible(true)}
      >
        <Icon name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      <AddTaskModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreate={async input => {
          const task = await createTask(input);
          setTasks([...tasks, task]);
          scheduleTaskReminder(task);
        }}
      />
    </ScreenHeader>
  );
}

const styles = StyleSheet.create({
  TaskCountCard: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    alignItems: 'flex-start',
    width: '100%',
  },
  taskCount: {
    fontSize: 28,
    color: colors.white,
    fontWeight: 'bold',
  },
  taskTitle: {
    fontSize: 14,
    color: '#dfdede',
    marginTop: 14,
  },
  addTaskButton: {
    position: 'absolute',
    bottom: -22.5,
    right: 183,
    width: 50,
    height: 50,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
