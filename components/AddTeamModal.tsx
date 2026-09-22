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
import { useAuth } from '../contexts/AuthContext';
import { ProfileSearchResult, searchProfilesByEmail } from '../lib/teamsApi';
import { modalStyles } from './AddTaskModal/styles';

function getErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message;
  // Supabase errors (e.g. PostgrestError) aren't Error instances but do
  // carry a string `message` field.
  if (e && typeof e === 'object' && 'message' in e) {
    const message = (e as { message: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}

export default function AddTeamModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (input: {
    name: string;
    description?: string;
    memberIds?: string[];
  }) => Promise<void>;
}) {
  const { user } = useAuth();
  const [name, setName] = useState<string>('');
  const [nameError, setNameError] = useState<boolean>(false);
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [memberQuery, setMemberQuery] = useState<string>('');
  const [memberResults, setMemberResults] = useState<ProfileSearchResult[]>([]);
  const [searchingMembers, setSearchingMembers] = useState<boolean>(false);
  const [selectedMembers, setSelectedMembers] = useState<ProfileSearchResult[]>(
    [],
  );

  useEffect(() => {
    if (!visible) return;
    setName('');
    setDescription('');
    setNameError(false);
    setSubmitError(null);
    setMemberQuery('');
    setMemberResults([]);
    setSelectedMembers([]);
  }, [visible]);

  useEffect(() => {
    const query = memberQuery.trim();
    if (query.length < 2) {
      setMemberResults([]);
      return;
    }

    let cancelled = false;
    setSearchingMembers(true);
    const timeout = setTimeout(() => {
      searchProfilesByEmail(query)
        .then(results => {
          if (!cancelled) setMemberResults(results);
        })
        .catch(() => {
          if (!cancelled) setMemberResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearchingMembers(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [memberQuery]);

  const selectedIds = new Set(selectedMembers.map(m => m.id));
  const visibleResults = memberResults.filter(
    r => r.id !== user?.id && !selectedIds.has(r.id),
  );

  const handleSelectMember = (member: ProfileSearchResult) => {
    setSelectedMembers(prev => [...prev, member]);
    setMemberQuery('');
    setMemberResults([]);
    Keyboard.dismiss();
  };

  const handleRemoveMember = (id: string) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== id));
  };

  const handleNameChange = (text: string) => {
    setName(text);
    if (nameError && text.trim() !== '') setNameError(false);
  };

  const handleSubmit = async () => {
    if (name.trim() === '') {
      setNameError(true);
      return;
    }

    setSubmitError(null);
    setSubmitting(true);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        memberIds: selectedMembers.map(m => m.id),
      });
      onClose();
    } catch (e) {
      const reason = getErrorMessage(e, 'please try again');
      setSubmitError(`Couldn't create team: ${reason}`);
    } finally {
      setSubmitting(false);
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
              <Text style={modalStyles.modalTitle}>Create Team</Text>

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
              <Text style={modalStyles.fieldLabel}>Team Name</Text>
              <TextInput
                style={[modalStyles.input, nameError && modalStyles.inputError]}
                placeholder="team name..."
                placeholderTextColor="#888"
                value={name}
                onChangeText={handleNameChange}
                autoFocus={true}
              />
              {nameError && (
                <Text style={modalStyles.errorText}>Team name is required</Text>
              )}
            </View>

            <View style={modalStyles.fieldGroup}>
              <Text style={modalStyles.fieldLabel}>Description</Text>
              <TextInput
                style={modalStyles.input}
                placeholder="what's this team for..."
                placeholderTextColor="#888"
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <View style={modalStyles.fieldGroup}>
              <Text style={modalStyles.fieldLabel}>Add Members</Text>
              <TextInput
                style={modalStyles.input}
                placeholder="search by email..."
                placeholderTextColor="#888"
                value={memberQuery}
                onChangeText={setMemberQuery}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              {searchingMembers && (
                <ActivityIndicator
                  style={styles.searchSpinner}
                  color="#091540"
                />
              )}

              {visibleResults.map(result => (
                <TouchableOpacity
                  key={result.id}
                  style={styles.suggestionRow}
                  onPress={() => handleSelectMember(result)}
                >
                  <View style={styles.suggestionAvatar}>
                    <Text style={styles.suggestionInitial}>
                      {(result.name || result.email).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.suggestionInfo}>
                    {result.name && (
                      <Text style={styles.suggestionName}>{result.name}</Text>
                    )}
                    <Text style={styles.suggestionEmail}>{result.email}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {selectedMembers.length > 0 && (
                <View style={styles.chipRow}>
                  {selectedMembers.map(member => (
                    <View key={member.id} style={styles.chip}>
                      <Text style={styles.chipText} numberOfLines={1}>
                        {member.name || member.email}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveMember(member.id)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Icon name="close" size={14} color="#6b6b6f" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {submitError && (
              <Text style={modalStyles.errorText}>{submitError}</Text>
            )}

            <View style={modalStyles.modalButtons}>
              <TouchableOpacity
                style={[modalStyles.btn, modalStyles.saveBtn]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={modalStyles.btnText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  searchSpinner: {
    marginTop: 8,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  suggestionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#091540',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionInitial: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  suggestionEmail: {
    fontSize: 12,
    color: '#6b6b6f',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F5F7',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: 180,
  },
  chipText: {
    fontSize: 13,
    color: '#091540',
    fontWeight: '600',
  },
});
