import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '../components/PageHeader';
import TaskList from '../components/TaskList';
import { Task } from '../components/types';
import { colors } from '../constants/theme';
import { initNotifications } from '../lib/notifications';
import { fetchTasks } from '../lib/tasksApi';

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    let cancelled = false;

    initNotifications();

    fetchTasks().then(data => {
      if (!cancelled) setTasks(data);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <PageHeader tasks={tasks} setTasks={setTasks} />
        <TaskList tasks={tasks} setTasks={setTasks} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  container: {
    backgroundColor: colors.background,
    marginTop: 0,
    flex: 1,
    alignItems: 'center',
  },
});
