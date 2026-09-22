import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { createDirectConversation } from '../lib/messagesApi';
import { ProfileSearchResult, searchProfilesByEmail } from '../lib/teamsApi';
import { MessagesStackParamList } from '../navigation/MessagesStack';

type NavigationProp = NativeStackNavigationProp<
  MessagesStackParamList,
  'NewMessage'
>;

function getErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e) {
    const message = (e as { message: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}

export default function NewMessageScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timeout = setTimeout(() => {
      searchProfilesByEmail(trimmed)
        .then(data => {
          if (!cancelled) setResults(data.filter(r => r.id !== user?.id));
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, user?.id]);

  const handleSelect = async (result: ProfileSearchResult) => {
    setError(null);
    setStartingId(result.id);
    try {
      const conversationId = await createDirectConversation(result.id);
      navigation.replace('Chat', {
        conversationId,
        type: 'direct',
        title: result.name || result.email,
        avatarUrl: result.avatar_url,
      });
    } catch (e) {
      setError(getErrorMessage(e, 'Could not start conversation'));
    } finally {
      setStartingId(null);
    }
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
        <Text style={styles.headerTitle}>New Message</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            <TextInput
              style={styles.input}
              placeholder="search by email..."
              placeholderTextColor="#888"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              keyboardType="email-address"
              autoFocus
            />

            {searching && (
              <ActivityIndicator style={styles.spinner} color="#091540" />
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}

            {results.map(result => (
              <TouchableOpacity
                key={result.id}
                style={styles.row}
                onPress={() => handleSelect(result)}
                disabled={!!startingId}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarInitial}>
                    {(result.name || result.email).charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.info}>
                  {result.name && (
                    <Text style={styles.name}>{result.name}</Text>
                  )}
                  <Text style={styles.email}>{result.email}</Text>
                </View>
                {startingId === result.id && (
                  <ActivityIndicator color="#091540" />
                )}
              </TouchableOpacity>
            ))}

            {!searching && query.trim().length >= 2 && results.length === 0 && (
              <Text style={styles.emptyText}>No users found.</Text>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#091540',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  flex: {
    flex: 1,
    backgroundColor: '#fff',
  },
  body: {
    padding: 20,
    flexGrow: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e4e2e2',
    borderRadius: 28,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#222',
  },
  spinner: {
    marginTop: 14,
  },
  errorText: {
    color: '#e5484d',
    fontSize: 13,
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F7',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#091540',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  email: {
    fontSize: 12,
    color: '#6b6b6f',
  },
  emptyText: {
    fontSize: 13,
    color: '#9a9a9e',
    textAlign: 'center',
    marginTop: 24,
  },
});
