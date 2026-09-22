import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ProfileSearchResult, searchProfilesByEmail } from '../lib/teamsApi';
import { modalStyles } from './AddTaskModal/styles';

function getErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e) {
    const message = (e as { message: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}

export default function AddMemberModal({
  visible,
  onClose,
  existingMemberIds,
  onAddMember,
}: {
  visible: boolean;
  onClose: () => void;
  existingMemberIds: string[];
  onAddMember: (member: ProfileSearchResult) => Promise<void>;
}) {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setResults([]);
    setAddedIds([]);
    setError(null);
  }, [visible]);

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
          if (!cancelled) setResults(data);
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
  }, [query]);

  const visibleResults = results.filter(
    result =>
      !existingMemberIds.includes(result.id) && !addedIds.includes(result.id),
  );

  const handleAdd = async (member: ProfileSearchResult) => {
    setAddingId(member.id);
    setError(null);
    try {
      await onAddMember(member);
      setAddedIds(prev => [...prev, member.id]);
    } catch (e) {
      setError(getErrorMessage(e, "Couldn't add member"));
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {visible && <StatusBar barStyle="dark-content" />}

      <KeyboardAvoidingView
        style={modalStyles.keyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={modalStyles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={modalStyles.modalTop}>
              <Text style={modalStyles.modalTitle}>Add Members</Text>
              <TouchableOpacity
                style={modalStyles.cancelBtn}
                onPress={onClose}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Icon name="close" size={17} color="#e46868" />
              </TouchableOpacity>
            </View>

            <View style={modalStyles.fieldGroup}>
              <Text style={modalStyles.fieldLabel}>Search by email</Text>
              <TextInput
                style={modalStyles.input}
                placeholder="search by email..."
                placeholderTextColor="#888"
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                keyboardType="email-address"
                autoFocus={true}
              />

              {searching && (
                <ActivityIndicator style={styles.spinner} color="#091540" />
              )}

              {visibleResults.map(result => (
                <View key={result.id} style={styles.resultRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarInitial}>
                      {(result.name || result.email).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.resultInfo}>
                    {result.name && (
                      <Text style={styles.resultName}>{result.name}</Text>
                    )}
                    <Text style={styles.resultEmail}>{result.email}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => handleAdd(result)}
                    disabled={addingId === result.id}
                  >
                    {addingId === result.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Icon name="add" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {addedIds.length > 0 && (
              <Text style={styles.addedText}>
                Added {addedIds.length} member
                {addedIds.length === 1 ? '' : 's'}
              </Text>
            )}

            {error && <Text style={modalStyles.errorText}>{error}</Text>}

            <View style={modalStyles.modalButtons}>
              <TouchableOpacity
                style={[modalStyles.btn, modalStyles.saveBtn]}
                onPress={onClose}
              >
                <Text style={modalStyles.btnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  spinner: {
    marginTop: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#091540',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  resultEmail: {
    fontSize: 12,
    color: '#6b6b6f',
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#091540',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addedText: {
    fontSize: 13,
    color: '#2fae60',
    fontWeight: '600',
    textAlign: 'center',
  },
});
