import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import ChatScreen from '../screens/ChatScreen';
import TeamDetailScreen from '../screens/TeamDetailScreen';
import TeamMembersScreen from '../screens/TeamMembersScreen';
import TeamScreen from '../screens/TeamScreen';

export type TeamStackParamList = {
  TeamList: undefined;
  TeamDetail: { teamId: string; teamName: string };
  TeamMembers: { teamId: string; teamName: string };
  Chat: {
    conversationId: string;
    type: 'direct' | 'team';
    title: string;
    subtitle?: string;
    avatarUrl?: string | null;
  };
};

const Stack = createNativeStackNavigator<TeamStackParamList>();

export default function TeamStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TeamList" component={TeamScreen} />
      <Stack.Screen name="TeamDetail" component={TeamDetailScreen} />
      <Stack.Screen name="TeamMembers" component={TeamMembersScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}
