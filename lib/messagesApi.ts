import { RealtimeChannel } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

export interface ConversationPreview {
  conversation_id: string;
  type: 'direct' | 'team';
  team_id: string | null;
  team_name: string | null;
  other_user_id: string | null;
  other_user_name: string | null;
  other_user_avatar_url: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_message_sender_id: string | null;
  unread_count: number;
}

export async function fetchConversations(): Promise<ConversationPreview[]> {
  const { data, error } = await supabase.rpc('fetch_conversations');
  if (error) throw error;
  return data as ConversationPreview[];
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  image_url: string | null;
  audio_url: string | null;
  audio_duration: number | null;
  created_at: string;
}

export interface MessageSenderProfile {
  id: string;
  name: string | null;
  avatar_url: string | null;
}

const MESSAGES_PAGE_SIZE = 30;

export async function fetchMessages(
  conversationId: string,
  before?: string,
): Promise<Message[]> {
  let query = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(MESSAGES_PAGE_SIZE);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as Message[]).reverse();
}

export async function fetchSenderProfiles(
  userIds: string[],
): Promise<Record<string, MessageSenderProfile>> {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) return {};

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .in('id', uniqueIds);

  if (error) throw error;

  const result: Record<string, MessageSenderProfile> = {};
  for (const profile of data as MessageSenderProfile[]) {
    result[profile.id] = profile;
  }
  return result;
}

export async function sendMessage(
  conversationId: string,
  content: string,
  imageUrl?: string,
  audio?: { url: string; duration: number },
): Promise<Message> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content || null,
      image_url: imageUrl ?? null,
      audio_url: audio?.url ?? null,
      audio_duration: audio?.duration ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Message;
}

export async function uploadChatImage(
  conversationId: string,
  base64: string,
): Promise<string> {
  const path = `${conversationId}/${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('chat-images')
    .upload(path, decode(base64), {
      contentType: 'image/jpeg',
    });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from('chat-images').getPublicUrl(path);

  return publicUrl;
}

export async function uploadChatAudio(
  conversationId: string,
  fileUri: string,
): Promise<string> {
  const fileName = `${Date.now()}.m4a`;
  const path = `${conversationId}/${fileName}`;

  // fetch(fileUri).blob() is unreliable for local file:// URIs in React
  // Native, so upload via a RN-style FormData file part instead — RN's
  // networking layer streams it from disk natively, same as the picker's
  // base64 path avoids it for images.
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: 'audio/mp4',
  } as unknown as Blob);

  const { error: uploadError } = await supabase.storage
    .from('chat-audio')
    .upload(path, formData);

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from('chat-audio').getPublicUrl(path);

  return publicUrl;
}

export async function fetchTeamConversationId(teamId: string): Promise<string> {
  const { data, error } = await supabase
    .from('conversations')
    .select('id')
    .eq('team_id', teamId)
    .eq('type', 'team')
    .single();

  if (error) throw error;
  return (data as { id: string }).id;
}

export async function createDirectConversation(
  otherUserId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('create_direct_conversation', {
    other_user_id: otherUserId,
  });

  if (error) throw error;
  return data as string;
}

export async function markConversationRead(
  conversationId: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { error } = await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);

  if (error) throw error;
}

let conversationChangesSubscriberCount = 0;

export function subscribeToConversationChanges(
  onChange: () => void,
): () => void {
  // No conversation_id filter here (unlike subscribeToMessages) — this is
  // meant to back the conversation list / unread badge, which need to
  // react to a new message landing in *any* conversation the caller is
  // part of. Realtime enforces the messages SELECT RLS policy per
  // subscriber, so this still only ever fires for the caller's own rows.
  //
  // Supabase reuses the same underlying channel object for a repeated
  // topic name, and calling `.on()` on an already-subscribed channel
  // throws — so each caller (UnreadMessagesContext, ConversationListScreen,
  // ...) needs its own uniquely-named channel even though they all listen
  // to the same table/event.
  const topic = `conversations-inbox-${conversationChangesSubscriberCount++}`;
  const channel: RealtimeChannel = supabase
    .channel(topic)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToMessages(
  conversationId: string,
  onInsert: (message: Message) => void,
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      payload => {
        onInsert(payload.new as Message);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export interface MessageReaction {
  message_id: string;
  user_id: string;
  emoji: string;
}

export async function fetchReactions(
  messageIds: string[],
): Promise<MessageReaction[]> {
  if (messageIds.length === 0) return [];

  const { data, error } = await supabase
    .from('message_reactions')
    .select('message_id, user_id, emoji')
    .in('message_id', messageIds);

  if (error) throw error;
  return data as MessageReaction[];
}

export async function toggleReaction(
  messageId: string,
  emoji: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data: existing, error: fetchError } = await supabase
    .from('message_reactions')
    .select('emoji')
    .eq('message_id', messageId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing?.emoji === emoji) {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('message_reactions')
    .upsert({ message_id: messageId, user_id: user.id, emoji });
  if (error) throw error;
}

let reactionSubscriberCount = 0;

export function subscribeToReactions(
  onChange: (
    change:
      | { type: 'upsert'; reaction: MessageReaction }
      | { type: 'delete'; message_id: string; user_id: string },
  ) => void,
): () => void {
  const topic = `message-reactions-${reactionSubscriberCount++}`;
  const channel: RealtimeChannel = supabase
    .channel(topic)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'message_reactions' },
      payload => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old as { message_id: string; user_id: string };
          onChange({
            type: 'delete',
            message_id: old.message_id,
            user_id: old.user_id,
          });
        } else {
          onChange({
            type: 'upsert',
            reaction: payload.new as MessageReaction,
          });
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
