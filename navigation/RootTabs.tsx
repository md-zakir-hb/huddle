import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnreadMessages } from '../contexts/UnreadMessagesContext';
import TasksScreen from '../screens/TasksScreen';
import MessagesStack from './MessagesStack';
import TeamStack from './TeamStack';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, string> = {
  Tasks: 'checklist',
  Team: 'groups',
  Messages: 'chat-bubble-outline',
};

function TabButton({
  children,
  onPress,
  style,
  ...rest
}: BottomTabBarButtonProps) {
  const focused = (rest as { 'aria-selected'?: boolean })['aria-selected'];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[style, styles.tabButton, focused && styles.tabButtonActive]}
    >
      {children}
    </TouchableOpacity>
  );
}

export default function RootTabs() {
  const insets = useSafeAreaInsets();
  const { unreadCount } = useUnreadMessages();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#9a9a9e',
        tabBarButton: TabButton,
        tabBarIcon: ({ color }) => (
          <Icon name={ICONS[route.name]} size={25} color={color} />
        ),
        tabBarStyle: {
          backgroundColor: '#091540',
          height: 56 + insets.bottom,
        },
        tabBarIconStyle: {
          marginBottom: -1,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: -1,
        },
      })}
    >
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Team" component={TeamStack} />
      <Tab.Screen
        name="Messages"
        component={MessagesStack}
        options={{
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: styles.tabBadge,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#7692FF',
  },
  tabBadge: {
    backgroundColor: '#e5484d',
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
