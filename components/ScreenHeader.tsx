import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, typography } from '../constants/theme';
import { fetchProfile, Profile } from '../lib/profileApi';
import ProfileModal from './ProfileModal';
import Avatar from './ui/Avatar';

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle: string;
  onBack?: () => void;
  children?: React.ReactNode;
}) {
  const [profileVisible, setProfileVisible] = useState<boolean>(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    fetchProfile()
      .then(data => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.card}>
      {onBack && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="arrow-back" size={20} color={colors.white} />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.25)',
          width: 32,
          borderRadius: 16,
          position: 'absolute',
          right: 32,
          top: 32,
          zIndex: 999,
        }}
        onPress={() => setProfileVisible(true)}
      >
        <Avatar
          uri={profile?.avatar_url}
          name={profile?.name}
          email={profile?.email}
          size={32}
          backgroundColor="transparent"
        />
      </TouchableOpacity>

      <Text style={[styles.title, onBack && styles.titleWithBack]}>
        {title}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {children}

      <ProfileModal
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
        profile={profile}
        loading={profileLoading}
        onProfileChange={setProfile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: 180,
    padding: spacing.xl,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    position: 'relative',
    zIndex: 10,
    elevation: 10,
  },
  backButton: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.xl,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButton: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.xl,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  title: {
    fontSize: typography.h1.fontSize,
    fontWeight: typography.h1.fontWeight,
    color: colors.white,
  },
  titleWithBack: {
    marginTop: 40,
  },
  subtitle: {
    fontSize: typography.body.fontSize,
    color: '#dfdede',
    marginTop: spacing.xs,
  },
});
