import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import ChatScreen from '../screens/ChatScreen';
import ConversationListScreen from '../screens/ConversationListScreen';
import NewMessageScreen from '../screens/NewMessageScreen';

export type MessagesStackParamList = {
  ConversationList: undefined;
  Chat: {
    conversationId: string;
    type: 'direct' | 'team';
    title: string;
    subtitle?: string;
    avatarUrl?: string | null;
  };
  NewMessage: undefined;
};

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export default function MessagesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="ConversationList"
        component={ConversationListScreen}
      />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="NewMessage" component={NewMessageScreen} />
    </Stack.Navigator>
  );
}
