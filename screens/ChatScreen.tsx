import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Sound from 'react-native-nitro-sound';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getInitials } from '../components/profileUtils';
import { useAuth } from '../contexts/AuthContext';
import { useUnreadMessages } from '../contexts/UnreadMessagesContext';
import {
  fetchMessages,
  fetchReactions,
  fetchSenderProfiles,
  markConversationRead,
  Message,
  MessageReaction,
  MessageSenderProfile,
  sendMessage,
  subscribeToMessages,
  subscribeToReactions,
  toggleReaction,
  uploadChatAudio,
  uploadChatImage,
} from '../lib/messagesApi';
import { MessagesStackParamList } from '../navigation/MessagesStack';

type ChatRouteProp = RouteProp<MessagesStackParamList, 'Chat'>;

type DisplayMessage = Message & { pending?: boolean; localImageUri?: string };

const PAGE_SIZE = 30;
const NEAR_BOTTOM_THRESHOLD = 100;
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const SCREEN_WIDTH = Dimensions.get('window').width;

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ChatScreen() {
  const navigation = useNavigation();
  const { params } = useRoute<ChatRouteProp>();
  const { user } = useAuth();
  const { refresh: refreshUnreadCount } = useUnreadMessages();

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [senders, setSenders] = useState<Record<string, MessageSenderProfile>>(
    {},
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [draft, setDraft] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [pickedImage, setPickedImage] = useState<{
    uri: string;
    base64: string;
  } | null>(null);
  const [reactions, setReactions] = useState<Record<string, MessageReaction[]>>(
    {},
  );
  const [reactionPicker, setReactionPicker] = useState<{
    messageId: string;
    x: number;
    y: number;
  } | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSecs, setRecordSecs] = useState<number>(0);
  const [playback, setPlayback] = useState<{
    messageId: string;
    isPlaying: boolean;
    position: number;
    duration: number;
  } | null>(null);

  const recordingCancelledRef = useRef<boolean>(false);
  const recordSecsRef = useRef<number>(0);

  const listRef = useRef<FlatList<DisplayMessage>>(null);
  const sendersRef = useRef<Record<string, MessageSenderProfile>>({});
  const loadingOlderRef = useRef<boolean>(false);
  const hasScrolledOnceRef = useRef<boolean>(false);
  const isNearBottomRef = useRef<boolean>(true);

  useEffect(() => {
    sendersRef.current = senders;
  }, [senders]);

  useEffect(() => {
    let cancelled = false;

    fetchMessages(params.conversationId)
      .then(async data => {
        if (cancelled) return;
        setMessages(data);
        setHasMore(data.length === PAGE_SIZE);
        if (params.type === 'team') {
          const profiles = await fetchSenderProfiles(
            data.map(m => m.sender_id),
          );
          if (!cancelled) setSenders(profiles);
        }
        const messageReactions = await fetchReactions(data.map(m => m.id));
        if (cancelled) return;
        const grouped: Record<string, MessageReaction[]> = {};
        for (const reaction of messageReactions) {
          (grouped[reaction.message_id] ??= []).push(reaction);
        }
        setReactions(grouped);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params.conversationId, params.type]);

  useEffect(() => {
    const unsubscribe = subscribeToMessages(
      params.conversationId,
      async message => {
        // Realtime echoes the sender's own inserts too, and handleSend
        // already appends the row it gets back from the insert (or an
        // optimistic pending bubble first) — reconcile instead of
        // blindly appending so a sent message never shows up twice.
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          const pendingIndex = prev.findIndex(
            m =>
              m.pending &&
              m.sender_id === message.sender_id &&
              m.content === message.content,
          );
          if (pendingIndex !== -1) {
            const next = [...prev];
            next[pendingIndex] = message;
            return next;
          }
          return [...prev, message];
        });
        markConversationRead(params.conversationId)
          .then(refreshUnreadCount)
          .catch(() => {});
        if (params.type === 'team' && !sendersRef.current[message.sender_id]) {
          const profiles = await fetchSenderProfiles([message.sender_id]);
          setSenders(prev => ({ ...prev, ...profiles }));
        }
      },
    );

    return unsubscribe;
  }, [params.conversationId, params.type, refreshUnreadCount]);

  useEffect(() => {
    const unsubscribe = subscribeToReactions(change => {
      setReactions(prev => {
        if (change.type === 'delete') {
          const list = prev[change.message_id];
          if (!list) return prev;
          return {
            ...prev,
            [change.message_id]: list.filter(r => r.user_id !== change.user_id),
          };
        }
        const { reaction } = change;
        const list = prev[reaction.message_id] ?? [];
        return {
          ...prev,
          [reaction.message_id]: [
            ...list.filter(r => r.user_id !== reaction.user_id),
            reaction,
          ],
        };
      });
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    return () => {
      Sound.stopRecorder().catch(() => {});
      Sound.removeRecordBackListener();
      Sound.stopPlayer().catch(() => {});
      Sound.removePlayBackListener();
      Sound.removePlaybackEndListener();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      markConversationRead(params.conversationId)
        .then(refreshUnreadCount)
        .catch(() => {});
    }, [params.conversationId, refreshUnreadCount]),
  );

  const loadMore = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;

    setLoadingMore(true);
    loadingOlderRef.current = true;
    try {
      const older = await fetchMessages(
        params.conversationId,
        messages[0].created_at,
      );
      setMessages(prev => [...older, ...prev]);
      setHasMore(older.length === PAGE_SIZE);
      if (params.type === 'team') {
        const profiles = await fetchSenderProfiles(older.map(m => m.sender_id));
        setSenders(prev => ({ ...prev, ...profiles }));
      }
      const olderReactions = await fetchReactions(older.map(m => m.id));
      const grouped: Record<string, MessageReaction[]> = {};
      for (const reaction of olderReactions) {
        (grouped[reaction.message_id] ??= []).push(reaction);
      }
      setReactions(prev => ({ ...grouped, ...prev }));
    } catch {
      // ignore, user can retry by scrolling again
    } finally {
      setLoadingMore(false);
      // Let the prepend's own onContentSizeChange fire (and be skipped)
      // before allowing scrollToEnd again.
      requestAnimationFrame(() => {
        loadingOlderRef.current = false;
      });
    }
  };

  const handleSend = async () => {
    const content = draft.trim();
    const imageToSend = pickedImage;
    if ((!content && !imageToSend) || sending || !user) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMessage: DisplayMessage = {
      id: tempId,
      conversation_id: params.conversationId,
      sender_id: user.id,
      content: content || null,
      image_url: null,
      audio_url: null,
      audio_duration: null,
      created_at: new Date().toISOString(),
      pending: true,
      localImageUri: imageToSend?.uri,
    };

    setDraft('');
    setPickedImage(null);
    setSending(true);
    isNearBottomRef.current = true;
    setMessages(prev => [...prev, optimisticMessage]);
    requestAnimationFrame(() =>
      listRef.current?.scrollToEnd({ animated: true }),
    );

    try {
      const imageUrl = imageToSend
        ? await uploadChatImage(params.conversationId, imageToSend.base64)
        : undefined;
      const message = await sendMessage(
        params.conversationId,
        content,
        imageUrl,
      );
      setMessages(prev =>
        prev.map(m => (m.id === tempId ? { ...message } : m)),
      );
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setDraft(content);
      setPickedImage(imageToSend);
    } finally {
      setSending(false);
    }
  };

  const pickImage = async (fromCamera: boolean) => {
    const launcher = fromCamera ? launchCamera : launchImageLibrary;
    const result = await launcher({
      mediaType: 'photo',
      includeBase64: true,
      quality: 0.7,
      maxWidth: 1280,
      maxHeight: 1280,
    });
    const asset = result.assets?.[0];
    if (asset?.base64 && asset.uri) {
      setPickedImage({ uri: asset.uri, base64: asset.base64 });
    }
  };

  const handleAttachPress = () => {
    Alert.alert('Send Photo', undefined, [
      { text: 'Take Photo', onPress: () => pickImage(true) },
      { text: 'Choose from Library', onPress: () => pickImage(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const sendVoiceMessage = async (fileUri: string, durationSecs: number) => {
    if (!user) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMessage: DisplayMessage = {
      id: tempId,
      conversation_id: params.conversationId,
      sender_id: user.id,
      content: null,
      image_url: null,
      audio_url: fileUri,
      audio_duration: durationSecs,
      created_at: new Date().toISOString(),
      pending: true,
    };

    setSending(true);
    isNearBottomRef.current = true;
    setMessages(prev => [...prev, optimisticMessage]);
    requestAnimationFrame(() =>
      listRef.current?.scrollToEnd({ animated: true }),
    );

    try {
      const audioUrl = await uploadChatAudio(params.conversationId, fileUri);
      const message = await sendMessage(params.conversationId, '', undefined, {
        url: audioUrl,
        duration: durationSecs,
      });
      setMessages(prev =>
        prev.map(m => (m.id === tempId ? { ...message } : m)),
      );
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      Alert.alert(
        'Failed to send voice message',
        `${String((err as any)?.name)}: ${String(
          (err as any)?.message,
        )}\n${JSON.stringify((err as any)?.originalError ?? err)}`,
      );
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    if (sending || isRecording) return;

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message:
            'This app needs access to your microphone to record voice messages.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
    }

    recordingCancelledRef.current = false;
    recordSecsRef.current = 0;
    setRecordSecs(0);
    try {
      await Sound.startRecorder();
      Sound.addRecordBackListener(e => {
        recordSecsRef.current = Math.floor(e.currentPosition / 1000);
        setRecordSecs(recordSecsRef.current);
      });
      setIsRecording(true);
    } catch {
      setIsRecording(false);
    }
  };

  const stopRecording = async (cancel: boolean) => {
    if (!isRecording) return;
    recordingCancelledRef.current = cancel;
    try {
      const uri = await Sound.stopRecorder();
      Sound.removeRecordBackListener();
      setIsRecording(false);
      if (!cancel && recordSecsRef.current >= 1) {
        sendVoiceMessage(uri, recordSecsRef.current);
      }
    } catch {
      setIsRecording(false);
    }
  };

  const handlePlayAudio = async (item: DisplayMessage) => {
    if (!item.audio_url) return;

    if (playback?.messageId === item.id) {
      if (playback.isPlaying) {
        await Sound.pausePlayer();
        setPlayback(prev => (prev ? { ...prev, isPlaying: false } : prev));
      } else {
        await Sound.resumePlayer();
        setPlayback(prev => (prev ? { ...prev, isPlaying: true } : prev));
      }
      return;
    }

    if (playback) {
      await Sound.stopPlayer().catch(() => {});
      Sound.removePlayBackListener();
    }

    setPlayback({
      messageId: item.id,
      isPlaying: true,
      position: 0,
      duration: (item.audio_duration ?? 0) * 1000,
    });

    await Sound.startPlayer(item.audio_url);
    Sound.addPlayBackListener(e => {
      setPlayback(prev =>
        prev && prev.messageId === item.id
          ? { ...prev, position: e.currentPosition, duration: e.duration }
          : prev,
      );
    });
    Sound.addPlaybackEndListener(() => {
      Sound.removePlayBackListener();
      setPlayback(null);
    });
  };

  const handleReactionPick = (messageId: string, emoji: string) => {
    setReactionPicker(null);
    if (!user) return;

    setReactions(prev => {
      const list = prev[messageId] ?? [];
      const mine = list.find(r => r.user_id === user.id);
      const withoutMine = list.filter(r => r.user_id !== user.id);
      return {
        ...prev,
        [messageId]:
          mine?.emoji === emoji
            ? withoutMine
            : [
                ...withoutMine,
                { message_id: messageId, user_id: user.id, emoji },
              ],
      };
    });

    toggleReaction(messageId, emoji).catch(() => {});
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: DisplayMessage;
    index: number;
  }) => {
    const isMine = item.sender_id === user?.id;
    const showSenderName =
      params.type === 'team' &&
      !isMine &&
      (index === 0 || messages[index - 1].sender_id !== item.sender_id);
    const sender = senders[item.sender_id];
    const imageUri = item.image_url ?? item.localImageUri;

    const groupedReactions = Object.values(
      (reactions[item.id] ?? []).reduce<
        Record<string, { emoji: string; count: number; mine: boolean }>
      >((acc, r) => {
        const group = acc[r.emoji] ?? { emoji: r.emoji, count: 0, mine: false };
        group.count += 1;
        if (r.user_id === user?.id) group.mine = true;
        acc[r.emoji] = group;
        return acc;
      }, {}),
    );

    return (
      <View
        style={[
          styles.bubbleRow,
          isMine ? styles.bubbleRowMine : undefined,
          item.pending && styles.bubbleRowPending,
        ]}
      >
        {showSenderName && (
          <Text style={styles.senderName}>{sender?.name ?? 'Unknown'}</Text>
        )}
        <Pressable
          disabled={item.pending}
          onLongPress={e => {
            const { pageX, pageY } = e.nativeEvent;
            setReactionPicker({ messageId: item.id, x: pageX, y: pageY });
          }}
        >
          <View
            style={[
              styles.bubble,
              isMine ? styles.bubbleMine : styles.bubbleTheirs,
              imageUri && styles.bubbleWithImage,
            ]}
          >
            {imageUri && (
              <Image source={{ uri: imageUri }} style={styles.messageImage} />
            )}
            {item.audio_url && (
              <TouchableOpacity
                style={styles.audioRow}
                onPress={() => handlePlayAudio(item)}
                disabled={item.pending}
              >
                <Icon
                  name={
                    playback?.messageId === item.id && playback.isPlaying
                      ? 'pause-circle-filled'
                      : 'play-circle-filled'
                  }
                  size={32}
                  color={isMine ? '#fff' : '#091540'}
                />
                <Text
                  style={[styles.audioTime, isMine && styles.bubbleTextMine]}
                >
                  {playback?.messageId === item.id
                    ? formatDuration(playback.position / 1000)
                    : formatDuration(item.audio_duration ?? 0)}
                </Text>
              </TouchableOpacity>
            )}
            {item.content && (
              <Text
                style={[
                  styles.bubbleText,
                  isMine && styles.bubbleTextMine,
                  imageUri && styles.bubbleTextWithImage,
                ]}
              >
                {item.content}
              </Text>
            )}
          </View>
        </Pressable>
        {groupedReactions.length > 0 && (
          <View
            style={[
              styles.reactionRow,
              isMine ? styles.reactionRowMine : undefined,
            ]}
          >
            {groupedReactions.map(group => (
              <TouchableOpacity
                key={group.emoji}
                style={[
                  styles.reactionChip,
                  group.mine && styles.reactionChipMine,
                ]}
                onPress={() => handleReactionPick(item.id, group.emoji)}
              >
                <Text style={styles.reactionChipText}>
                  {group.emoji}
                  {group.count > 1 ? ` ${group.count}` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Text style={[styles.timeText, isMine && styles.timeTextMine]}>
          {item.pending
            ? 'Sending...'
            : new Date(item.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
        </Text>
      </View>
    );
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom =
      contentSize.height - contentOffset.y - layoutMeasurement.height;
    isNearBottomRef.current = distanceFromBottom < NEAR_BOTTOM_THRESHOLD;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerAvatar}>
          {params.type === 'team' ? (
            <Icon name="groups" size={18} color="#fff" />
          ) : params.avatarUrl ? (
            <Image
              source={{ uri: params.avatarUrl }}
              style={styles.headerAvatarImage}
            />
          ) : (
            <Text style={styles.headerAvatarInitials}>
              {getInitials(params.title, null)}
            </Text>
          )}
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {params.title}
          </Text>
          {params.subtitle && (
            <Text style={styles.headerSubtitle}>{params.subtitle}</Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {loading ? (
          <ActivityIndicator style={styles.loading} color="#091540" />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            onScroll={handleScroll}
            scrollEventThrottle={100}
            onContentSizeChange={() => {
              if (loadingOlderRef.current) return;
              if (!hasScrolledOnceRef.current || isNearBottomRef.current) {
                listRef.current?.scrollToEnd({
                  animated: hasScrolledOnceRef.current,
                });
                hasScrolledOnceRef.current = true;
              }
            }}
            onStartReached={loadMore}
            onStartReachedThreshold={0.3}
            ListHeaderComponent={
              loadingMore ? (
                <ActivityIndicator style={styles.loadingMore} color="#091540" />
              ) : undefined
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
            }
          />
        )}

        {pickedImage && (
          <View style={styles.imagePreviewBar}>
            <Image
              source={{ uri: pickedImage.uri }}
              style={styles.imagePreviewThumb}
            />
            <TouchableOpacity
              style={styles.imagePreviewRemove}
              onPress={() => setPickedImage(null)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputBar}>
          {isRecording ? (
            <>
              <TouchableOpacity
                style={styles.recordingCancelBtn}
                onPress={() => stopRecording(true)}
              >
                <Icon name="delete" size={22} color="#e46868" />
              </TouchableOpacity>
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingTime}>
                  {formatDuration(recordSecs)}
                </Text>
                <Text style={styles.recordingHint}>
                  Release to send, tap bin to cancel
                </Text>
              </View>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.attachBtn}
                onPress={handleAttachPress}
                disabled={sending}
              >
                <Icon name="add-photo-alternate" size={22} color="#7692FF" />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor="#9a9a9e"
                value={draft}
                onChangeText={setDraft}
                multiline
              />
            </>
          )}
          {(draft.trim() || pickedImage) && (
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={handleSend}
              disabled={sending}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              <Icon name="send" size={18} color="#fff" />
            </TouchableOpacity>
          ) || (
            <TouchableOpacity
              style={styles.micBtn}
              onPressIn={startRecording}
              onPressOut={() => stopRecording(false)}
              disabled={sending}
              accessibilityRole="button"
              accessibilityLabel="Hold to record a voice message"
            >
              <Icon name="mic" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {reactionPicker && (
        <Modal
          transparent
          visible
          animationType="fade"
          onRequestClose={() => setReactionPicker(null)}
        >
          <Pressable
            style={styles.reactionBackdrop}
            onPress={() => setReactionPicker(null)}
          >
            <View
              style={[
                styles.reactionPickerBar,
                {
                  top: Math.max(reactionPicker.y - 70, 40),
                  left: Math.min(
                    Math.max(reactionPicker.x - 110, 12),
                    SCREEN_WIDTH - 232,
                  ),
                },
              ]}
            >
              {REACTION_EMOJIS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.reactionPickerBtn}
                  onPress={() =>
                    handleReactionPick(reactionPicker.messageId, emoji)
                  }
                >
                  <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#091540',
  },
  flex: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#7692FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  headerAvatarInitials: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#c9c9d3',
    marginTop: 1,
  },
  loading: {
    flex: 1,
  },
  loadingMore: {
    marginVertical: 10,
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 14,
    color: '#9a9a9e',
    textAlign: 'center',
    marginTop: 24,
  },
  bubbleRow: {
    marginBottom: 12,
    maxWidth: '78%',
    alignSelf: 'flex-start',
  },
  bubbleRowMine: {
    alignSelf: 'flex-end',
  },
  bubbleRowPending: {
    opacity: 0.6,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b6b6f',
    marginBottom: 3,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleWithImage: {
    padding: 4,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  bubbleTextWithImage: {
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 2,
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 140,
  },
  audioTime: {
    fontSize: 13,
    color: '#222',
  },
  bubbleTheirs: {
    backgroundColor: '#F5F5F7',
    borderBottomLeftRadius: 4,
  },
  bubbleMine: {
    backgroundColor: '#091540',
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    color: '#222',
    lineHeight: 19,
  },
  bubbleTextMine: {
    color: '#fff',
  },
  timeText: {
    fontSize: 10,
    color: '#9a9a9e',
    marginTop: 3,
    marginLeft: 4,
  },
  timeTextMine: {
    alignSelf: 'flex-end',
    marginRight: 4,
    marginLeft: 0,
  },
  reactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  reactionRowMine: {
    alignSelf: 'flex-end',
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
    borderWidth: 1,
    borderColor: '#eee',
  },
  reactionChipMine: {
    backgroundColor: '#e8ecff',
    borderColor: '#7692FF',
  },
  reactionChipText: {
    fontSize: 12,
  },
  reactionBackdrop: {
    flex: 1,
  },
  reactionPickerBar: {
    position: 'absolute',
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  reactionPickerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionPickerEmoji: {
    fontSize: 22,
  },
  imagePreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  imagePreviewThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  imagePreviewRemove: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -14,
    marginTop: -40,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  attachBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: '#F5F5F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#222',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7692FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#091540',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingCancelBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingIndicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F5F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e46868',
  },
  recordingTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  recordingHint: {
    fontSize: 12,
    color: '#9a9a9e',
  },
});
