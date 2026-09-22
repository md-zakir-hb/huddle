import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import {
  Profile,
  updateProfileAvatar,
  updateProfileName,
  uploadAvatar,
} from '../lib/profileApi';
import { hexToRgba } from './priorityColors';
import { getInitials } from './profileUtils';

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

export default function ProfileModal({
  visible,
  onClose,
  profile,
  loading,
  onProfileChange,
}: {
  visible: boolean;
  onClose: () => void;
  profile: Profile | null;
  loading: boolean;
  onProfileChange: (profile: Profile) => void;
}) {
  const { signOut } = useAuth();
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, e => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    setName(profile?.name ?? '');
    setPhone(profile?.phone ?? '');
    setError(null);
  }, [visible, profile]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProfileName(name.trim(), phone.trim());
      onProfileChange(updated);
      setName(updated.name ?? '');
      setPhone(updated.phone ?? '');
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to save updates'));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarPicked = async (base64: string) => {
    setUploadingAvatar(true);
    setError(null);
    try {
      const avatarUrl = await uploadAvatar(base64);
      const updated = await updateProfileAvatar(avatarUrl);
      onProfileChange(updated);
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to update photo'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const pickFromLibrary = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      includeBase64: true,
      quality: 0.7,
      maxWidth: 800,
      maxHeight: 800,
    });
    const base64 = result.assets?.[0]?.base64;
    if (base64) handleAvatarPicked(base64);
  };

  const takePhoto = async () => {
    const result = await launchCamera({
      mediaType: 'photo',
      includeBase64: true,
      quality: 0.7,
      maxWidth: 800,
      maxHeight: 800,
    });
    const base64 = result.assets?.[0]?.base64;
    if (base64) handleAvatarPicked(base64);
  };

  const handleAvatarPress = () => {
    Alert.alert('Profile Photo', undefined, [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const initials = getInitials(profile?.name, profile?.email);

  const memberSince = profile
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
      })
    : '';

  const nameChanged = name.trim() !== (profile?.name ?? '');
  const phoneChanged = phone.trim() !== (profile?.phone ?? '');

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[styles.card, { marginBottom: keyboardHeight }]}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Icon name="close" size={17} color="#ccc" />
            </TouchableOpacity>

            {loading ? (
              <ActivityIndicator
                color="#091540"
                style={styles.loadingSpinner}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.avatar}
                  onPress={handleAvatarPress}
                  disabled={uploadingAvatar}
                  activeOpacity={0.8}
                >
                  {profile?.avatar_url ? (
                    <Image
                      source={{ uri: profile.avatar_url }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Text style={styles.avatarText}>{initials}</Text>
                  )}

                  {uploadingAvatar ? (
                    <View style={styles.avatarOverlay}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  ) : (
                    <View style={styles.avatarEditBadge}>
                      <Icon name="photo-camera" size={12} color="#091540" />
                    </View>
                  )}
                </TouchableOpacity>

                {profile ? (
                  <>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Name</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="your name"
                        placeholderTextColor="#888"
                        value={name}
                        onChangeText={setName}
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Email</Text>
                      <Text style={styles.readOnlyValue}>{profile.email}</Text>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Phone</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="your phone"
                        placeholderTextColor="#888"
                        value={phone}
                        onChangeText={setPhone}
                      />
                    </View>

                    {memberSince !== '' && (
                      <Text style={styles.memberSince}>
                        Member since {memberSince}
                      </Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.errorText}>Couldn't load profile</Text>
                )}

                {error && <Text style={styles.errorText}>{error}</Text>}

                {profile && (nameChanged || phoneChanged) && (
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
                  <Icon name="logout" size={16} color="#e5484d" />
                  <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 50,
    gap: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  loadingSpinner: {
    marginVertical: 24,
  },
  avatar: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#091540',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },
  avatarText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e4e2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b6b6f',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 50,
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  readOnlyValue: {
    fontSize: 14,
    color: '#222',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F7',
    borderRadius: 50,
  },
  memberSince: {
    fontSize: 12,
    color: '#9a9a9e',
    textAlign: 'center',
  },
  errorText: {
    color: '#e5484d',
    fontSize: 12,
    textAlign: 'center',
  },
  saveBtn: {
    backgroundColor: '#091540',
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  signOutBtn: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 20,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: hexToRgba('#e5484d', 0.3),
  },
  signOutText: {
    color: '#e5484d',
    fontWeight: '600',
    fontSize: 14,
  },
});
