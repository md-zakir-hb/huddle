import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getInitials } from '../components/profileUtils';
import ScreenHeader from '../components/ScreenHeader';
import { EmptyState, LoadingSpinner } from '../components/ui';
import { colors } from '../constants/theme';
import {
  ConversationPreview,
  fetchConversations,
  subscribeToConversationChanges,
} from '../lib/messagesApi';
import { MessagesStackParamList } from '../navigation/MessagesStack';

type NavigationProp = NativeStackNavigationProp<
  MessagesStackParamList,
  'ConversationList'
>;

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ConversationListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      fetchConversations()
        .then(data => {
          if (!cancelled) setConversations(data);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, []),
  );

  useEffect(() => {
    const unsubscribe = subscribeToConversationChanges(() => {
      fetchConversations()
        .then(setConversations)
        .catch(() => {});
    });

    return unsubscribe;
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchConversations()
      .then(setConversations)
      .catch(() => {})
      .finally(() => setRefreshing(false));
  };

  const openConversation = (item: ConversationPreview) => {
    const title =
      item.type === 'team'
        ? item.team_name ?? 'Team'
        : item.other_user_name ?? 'Unknown';

    navigation.navigate('Chat', {
      conversationId: item.conversation_id,
      type: item.type,
      title,
      subtitle: item.type === 'team' ? 'Team chat' : undefined,
      avatarUrl: item.type === 'direct' ? item.other_user_avatar_url : null,
    });
  };

  const renderItem = ({ item }: { item: ConversationPreview }) => {
    const isTeam = item.type === 'team';
    const title = isTeam
      ? item.team_name ?? 'Team'
      : item.other_user_name ?? 'Unknown';
    const hasUnread = item.unread_count > 0;

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => openConversation(item)}
      >
        <View style={[styles.avatar, isTeam && styles.avatarTeam]}>
          {isTeam ? (
            <Icon name="groups" size={22} color="#fff" />
          ) : item.other_user_avatar_url ? (
            <Image
              source={{ uri: item.other_user_avatar_url }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarInitials}>
              {getInitials(item.other_user_name, null)}
            </Text>
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.infoTopRow}>
            <Text style={styles.name} numberOfLines={1}>
              {title}
            </Text>
            {item.last_message_at && (
              <Text style={styles.timestamp}>
                {formatTimestamp(item.last_message_at)}
              </Text>
            )}
          </View>
          <View style={styles.infoBottomRow}>
            <Text
              style={[styles.preview, hasUnread && styles.previewUnread]}
              numberOfLines={1}
            >
              {item.last_message ?? 'No messages yet'}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {item.unread_count > 9 ? '9+' : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.screen}>
        <ScreenHeader title="Messages" subtitle="Chats with people and teams">
          <TouchableOpacity
            style={styles.newMessageButton}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('NewMessage')}
          >
            <Icon name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </ScreenHeader>

        {loading ? (
          <LoadingSpinner color={colors.primary} />
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={item => item.conversation_id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#091540"
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="chat-bubble-outline"
                title="No conversations yet"
                description="Tap the + button to start a chat with a teammate."
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#091540',
  },
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  newMessageButton: {
    position: 'absolute',
    bottom: -22.5,
    right: 26,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#7692FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flexGrow: 1,
    paddingTop: 30,
    paddingBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#091540',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarTeam: {
    backgroundColor: '#7692FF',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  infoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#091540',
  },
  timestamp: {
    fontSize: 11,
    color: '#9a9a9e',
    marginLeft: 8,
  },
  infoBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preview: {
    flex: 1,
    fontSize: 13,
    color: '#6b6b6f',
  },
  previewUnread: {
    color: '#091540',
    fontWeight: '600',
  },
  unreadBadge: {
    marginLeft: 8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: '#7692FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
