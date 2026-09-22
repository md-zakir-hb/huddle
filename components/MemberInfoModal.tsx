import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { fetchProfileById, Profile } from '../lib/profileApi';
import { getInitials } from './profileUtils';

export default function MemberInfoModal({
  visible,
  userId,
  onClose,
}: {
  visible: boolean;
  userId: string | null;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !userId) return;

    let cancelled = false;
    setProfile(null);
    setError(null);
    setLoading(true);

    fetchProfileById(userId)
      .then(data => {
        if (!cancelled) setProfile(data);
      })
      .catch(e => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load member');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, userId]);

  const initials = getInitials(profile?.name, profile?.email);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {visible && <StatusBar barStyle="dark-content" />}

      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Icon name="close" size={17} color="#ccc" />
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator color="#091540" style={styles.loading} />
          ) : error || !profile ? (
            <Text style={styles.errorText}>
              {error ?? "Couldn't load member"}
            </Text>
          ) : (
            <>
              <View style={styles.avatar}>
                {profile.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarInitials}>{initials}</Text>
                )}
              </View>

              <Text style={styles.name}>{profile.name ?? 'Unnamed'}</Text>

              <View style={styles.infoList}>
                <View style={styles.infoRow}>
                  <Icon name="mail-outline" size={16} color="#6b6b6f" />
                  <Text style={styles.infoText}>
                    {profile.email ?? 'No email'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Icon name="phone" size={16} color="#6b6b6f" />
                  <Text style={styles.infoText}>
                    {profile.phone ?? 'No phone number'}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    paddingTop: 40,
    alignItems: 'center',
    gap: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  loading: {
    marginVertical: 24,
  },
  errorText: {
    color: '#e5484d',
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#091540',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#091540',
    marginTop: 4,
  },
  infoList: {
    width: '100%',
    gap: 10,
    marginTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#333',
    flexShrink: 1,
  },
});
