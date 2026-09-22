import { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import {
  cancelTaskReminder,
  scheduleTaskReminder,
} from '../../lib/notifications';
import { deleteTask, NewTaskInput, updateTask } from '../../lib/tasksApi';
import AddTaskModal from '../AddTaskModal';
import DateTimePickerField from '../AddTaskModal/DateTimePickerField';
import { Task } from '../types';
import CompletedSection from './CompletedSection';
import FilterBar from './FilterBar';
import OverdueSection from './OverdueSection';
import { styles } from './styles';
import TaskItem from './TaskItem';
import { PriorityFilter } from './types';

export default function TaskList({
  tasks,
  setTasks,
}: {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<PriorityFilter>('All');
  const [completedExpanded, setCompletedExpanded] = useState<boolean>(true);
  const [overdueExpanded, setOverdueExpanded] = useState<boolean>(false);

  const [reschedulingTaskId, setReschedulingTaskId] = useState<string | null>(
    null,
  );
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [draftDate, setDraftDate] = useState<Date>(new Date());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const tabBarHeight = useBottomTabBarHeight();

  const visibleTasks =
    filter === 'All' ? tasks : tasks.filter(task => task.priority === filter);
  const activeTasks = visibleTasks.filter(task => !task.completed);
  const completedTasks = visibleTasks.filter(task => task.completed);

  const now = new Date();
  const isOverdue = (task: Task) => !!task.date && new Date(task.date) < now;
  const overdueTasks = activeTasks.filter(isOverdue);
  const upcomingTasks = activeTasks.filter(task => !isOverdue(task));

  const toggleTask = async (id: string) => {
    const target = tasks.find(task => task.id === id);
    if (!target) return;

    const nextCompleted = !target.completed;
    setTasks(
      tasks.map(task =>
        task.id === id ? { ...task, completed: nextCompleted } : task,
      ),
    );

    try {
      await updateTask(id, { completed: nextCompleted });
      scheduleTaskReminder({ ...target, completed: nextCompleted });
    } catch {
      setTasks(
        tasks.map(task =>
          task.id === id ? { ...task, completed: !nextCompleted } : task,
        ),
      );
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const persistNewDate = async (id: string, newDate: Date) => {
    const target = tasks.find(task => task.id === id);
    if (!target) return;

    const previousDate = target.date;
    const iso = newDate.toISOString();

    setTasks(
      tasks.map(task => (task.id === id ? { ...task, date: iso } : task)),
    );

    try {
      await updateTask(id, { date: iso });
      scheduleTaskReminder({ ...target, date: iso });
    } catch {
      setTasks(
        tasks.map(task =>
          task.id === id ? { ...task, date: previousDate } : task,
        ),
      );
    }
  };

  const openReschedule = (task: Task) => {
    setReschedulingTaskId(task.id);
    setDraftDate(task.date ? new Date(task.date) : new Date());
    setPickerMode('date');
  };

  const handleRescheduleChange = (
    _event: DateTimePickerChangeEvent,
    pickedDate: Date,
  ) => {
    if (pickerMode === 'date') {
      setDraftDate(pickedDate);
      setPickerMode('time');
    } else {
      setDraftDate(pickedDate);
      if (reschedulingTaskId) persistNewDate(reschedulingTaskId, pickedDate);
      setReschedulingTaskId(null);
    }
  };

  const handleRescheduleDismiss = () => {
    // Cancelling the time step still keeps the date already chosen in the
    // date step, instead of discarding the whole reschedule.
    if (pickerMode === 'time' && reschedulingTaskId) {
      persistNewDate(reschedulingTaskId, draftDate);
    }
    setReschedulingTaskId(null);
  };

  const handleUpdateTask = async (id: string, input: NewTaskInput) => {
    const previous = tasks.find(task => task.id === id);
    if (!previous) return;

    const patch = {
      title: input.title,
      description: input.description ?? null,
      date: input.date ?? null,
      priority: input.priority ?? null,
      reminder: input.reminder ?? false,
    };

    setTasks(
      tasks.map(task => (task.id === id ? { ...task, ...patch } : task)),
    );

    try {
      await updateTask(id, patch);
      scheduleTaskReminder({ ...previous, ...patch });
    } catch (e) {
      setTasks(tasks.map(task => (task.id === id ? previous : task)));
      throw e;
    }
  };

  const handleDeleteTask = (task: Task) => {
    Alert.alert(
      'Delete task?',
      `"${task.title}" will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDeleteTask(task),
        },
      ],
    );
  };

  const confirmDeleteTask = async (task: Task) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.delete(task.id);
      return next;
    });
    setTasks(tasks.filter(t => t.id !== task.id));

    try {
      await deleteTask(task.id);
      cancelTaskReminder(task.id);
    } catch {
      setTasks(prev => [...prev, task]);
    }
  };

  return (
    <>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: tabBarHeight + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <FilterBar
            filter={filter}
            onChangeFilter={setFilter}
            overdueCount={overdueTasks.length}
            overdueExpanded={overdueExpanded}
            onToggleOverdue={() => setOverdueExpanded(v => !v)}
          />
        </View>

        {visibleTasks.length === 0 && (
          <Text style={styles.emptyText}>No tasks here</Text>
        )}

        {overdueExpanded && (
          <OverdueSection
            tasks={overdueTasks}
            onToggleComplete={toggleTask}
            onReschedule={openReschedule}
            onDelete={handleDeleteTask}
          />
        )}

        {/* <FlatList
          data={upcomingTasks}
          renderItem={({ item }) => (
            <TaskItem
              task={item}
              isExpanded={expandedIds.has(item.id)}
              onToggleExpand={toggleExpand}
              onToggleComplete={toggleTask}
              onEdit={setEditingTask}
              onDelete={handleDeleteTask}
            />
          )}
        /> */}

        {upcomingTasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            isExpanded={expandedIds.has(task.id)}
            onToggleExpand={toggleExpand}
            onToggleComplete={toggleTask}
            onEdit={setEditingTask}
            onDelete={handleDeleteTask}
          />
        ))}

        <CompletedSection
          tasks={completedTasks}
          expanded={completedExpanded}
          onToggleExpanded={() => setCompletedExpanded(v => !v)}
          onToggleComplete={toggleTask}
        />
      </ScrollView>

      <DateTimePickerField
        visible={!!reschedulingTaskId}
        mode={pickerMode}
        value={draftDate}
        onChange={handleRescheduleChange}
        onDismiss={handleRescheduleDismiss}
      />

      <AddTaskModal
        visible={!!editingTask}
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onUpdate={handleUpdateTask}
      />
    </>
  );
}
