import { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AddTaskModal from '../components/AddTaskModal';
import DateTimePickerField from '../components/AddTaskModal/DateTimePickerField';
import CompletedSection from '../components/TaskList/CompletedSection';
import FilterBar from '../components/TaskList/FilterBar';
import OverdueSection from '../components/TaskList/OverdueSection';
import { styles as taskListStyles } from '../components/TaskList/styles';
import TaskItem from '../components/TaskList/TaskItem';
import { PriorityFilter } from '../components/TaskList/types';
import ScreenHeader from '../components/ScreenHeader';
import { Task } from '../components/types';
import { colors, radius, spacing, typography } from '../constants/theme';
import { fetchTeamConversationId } from '../lib/messagesApi';
import { TeamStackParamList } from '../navigation/TeamStack';
import {
  createTeamTask,
  deleteTask,
  fetchAssigneesByTaskIds,
  fetchTeamTasks,
  NewTaskInput,
  setTaskAssignees,
  TaskAssigneeProfile,
  updateTask,
} from '../lib/tasksApi';
import { fetchTeamMembersByTeamIds, TeamMemberProfile } from '../lib/teamsApi';

type NavigationProp = NativeStackNavigationProp<
  TeamStackParamList,
  'TeamDetail'
>;
type DetailRouteProp = RouteProp<TeamStackParamList, 'TeamDetail'>;

export default function TeamDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { params } = useRoute<DetailRouteProp>();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMemberProfile[]>([]);
  const [assigneesByTask, setAssigneesByTask] = useState<
    Record<string, TaskAssigneeProfile[]>
  >({});
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<PriorityFilter>('All');
  const [completedExpanded, setCompletedExpanded] = useState<boolean>(true);
  const [overdueExpanded, setOverdueExpanded] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [openingChat, setOpeningChat] = useState<boolean>(false);

  const [reschedulingTaskId, setReschedulingTaskId] = useState<string | null>(
    null,
  );
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [draftDate, setDraftDate] = useState<Date>(new Date());

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      fetchTeamTasks(params.teamId)
        .then(data => {
          if (!cancelled) setTasks(data);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

      fetchTeamMembersByTeamIds([params.teamId])
        .then(data => {
          if (!cancelled) setMembers(data[params.teamId] ?? []);
        })
        .catch(() => {});

      return () => {
        cancelled = true;
      };
    }, [params.teamId]),
  );

  const taskIdsKey = tasks.map(task => task.id).join(',');

  useEffect(() => {
    if (!taskIdsKey) {
      setAssigneesByTask({});
      return;
    }

    let cancelled = false;

    fetchAssigneesByTaskIds(taskIdsKey.split(','))
      .then(data => {
        if (!cancelled) setAssigneesByTask(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [taskIdsKey]);

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
    if (pickerMode === 'time' && reschedulingTaskId) {
      persistNewDate(reschedulingTaskId, draftDate);
    }
    setReschedulingTaskId(null);
  };

  const handleCreateTask = async (input: NewTaskInput) => {
    const task = await createTeamTask(params.teamId, input, input.assigneeIds);
    setTasks(prev => [...prev, task]);
    if (input.assigneeIds && input.assigneeIds.length > 0) {
      const assignees = members.filter(member =>
        input.assigneeIds?.includes(member.id),
      );
      setAssigneesByTask(prev => ({ ...prev, [task.id]: assignees }));
    }
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
      if (input.assigneeIds) {
        await setTaskAssignees(id, input.assigneeIds);
        const assignees = members.filter(member =>
          input.assigneeIds?.includes(member.id),
        );
        setAssigneesByTask(prev => ({ ...prev, [id]: assignees }));
      }
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
    } catch {
      setTasks(prev => [...prev, task]);
    }
  };

  const editingAssigneeIds = editingTask
    ? (assigneesByTask[editingTask.id] ?? []).map(member => member.id)
    : [];

  const openTeamChat = async () => {
    if (openingChat) return;
    setOpeningChat(true);
    try {
      const conversationId = await fetchTeamConversationId(params.teamId);
      navigation.navigate('Chat', {
        conversationId,
        type: 'team',
        title: params.teamName,
        subtitle: 'Team chat',
      });
    } catch {
      // ignore, user can retry
    } finally {
      setOpeningChat(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.screen}>
        <ScreenHeader
          title={params.teamName}
          subtitle="Team tasks"
          onBack={() => navigation.goBack()}
        >
          <View style={styles.headerRow}>
            <View style={styles.taskCountCard}>
              <Text style={styles.taskCount}>
                {completedTasks.length}/{tasks.length}
              </Text>
              <Text style={styles.taskCountLabel}>tasks</Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.membersBtn}
                onPress={() =>
                  navigation.navigate('TeamMembers', {
                    teamId: params.teamId,
                    teamName: params.teamName,
                  })
                }
              >
                <Icon name="group" size={16} color={colors.white} />
                <Text style={styles.membersBtnText}>{members.length}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.membersBtn}
                onPress={openTeamChat}
                disabled={openingChat}
              >
                <Icon
                  name="chat-bubble-outline"
                  size={16}
                  color={colors.white}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addTaskButton}
            activeOpacity={0.9}
            onPress={() => setModalVisible(true)}
          >
            <Icon name="add" size={28} color={colors.white} />
          </TouchableOpacity>
        </ScreenHeader>

        {loading ? (
          <ActivityIndicator style={styles.loading} color={colors.primary} />
        ) : (
          <ScrollView contentContainerStyle={taskListStyles.container}>
            <FilterBar
              filter={filter}
              onChangeFilter={setFilter}
              overdueCount={overdueTasks.length}
              overdueExpanded={overdueExpanded}
              onToggleOverdue={() => setOverdueExpanded(v => !v)}
            />

            {overdueExpanded && (
              <OverdueSection
                tasks={overdueTasks}
                onToggleComplete={toggleTask}
                onReschedule={openReschedule}
                onDelete={handleDeleteTask}
              />
            )}

            {visibleTasks.length === 0 && (
              <Text style={styles.emptyText}>
                No tasks here. Tap + to add one.
              </Text>
            )}

            {upcomingTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                isExpanded={expandedIds.has(task.id)}
                assignees={assigneesByTask[task.id]}
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
        )}
      </View>

      <DateTimePickerField
        visible={!!reschedulingTaskId}
        mode={pickerMode}
        value={draftDate}
        onChange={handleRescheduleChange}
        onDismiss={handleRescheduleDismiss}
      />

      <AddTaskModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        teamMembers={members}
        onCreate={handleCreateTask}
      />

      <AddTaskModal
        visible={!!editingTask}
        task={editingTask}
        teamMembers={members}
        initialAssigneeIds={editingAssigneeIds}
        onClose={() => setEditingTask(null)}
        onUpdate={handleUpdateTask}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
  },
  headerRow: {
    width: '100%',
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskCountCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  taskCount: {
    fontSize: typography.h1.fontSize,
    color: colors.white,
    fontWeight: 'bold',
  },
  taskCountLabel: {
    fontSize: typography.caption.fontSize,
    color: '#dfdede',
    marginBottom: 3,
  },
  membersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  membersBtnText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
    color: colors.white,
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
  emptyText: {
    fontSize: typography.body.fontSize,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
