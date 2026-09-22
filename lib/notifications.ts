import notifee, {
  AndroidImportance,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import { Task } from '../components/types';

const CHANNEL_ID = 'task-reminders';

export async function initNotifications() {
  await notifee.requestPermission();
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Task Reminders',
    importance: AndroidImportance.HIGH,
  });
}

export async function cancelTaskReminder(taskId: string) {
  await notifee.cancelNotification(taskId);
}

export async function scheduleTaskReminder(task: Task) {
  await cancelTaskReminder(task.id);

  if (task.completed || !task.reminder || !task.date) return;

  const timestamp = new Date(task.date).getTime();
  if (timestamp <= Date.now()) return;

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp,
  };

  await notifee.createTriggerNotification(
    {
      id: task.id,
      title: task.title,
      body: task.description || 'Task reminder',
      android: {
        channelId: CHANNEL_ID,
        pressAction: { id: 'default' },
      },
    },
    trigger,
  );
}
