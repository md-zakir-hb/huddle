import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AddMemberModal from '../components/AddMemberModal';
import ScreenHeader from '../components/ScreenHeader';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import { colors, radius, spacing, typography } from '../constants/theme';
import { hexToRgba } from '../components/priorityColors';
import { useAuth } from '../contexts/AuthContext';
import { TeamStackParamList } from '../navigation/TeamStack';
import {
  addMember,
  fetchTeamMembersWithRoles,
  leaveTeam,
  ProfileSearchResult,
  removeMember,
  TeamMember,
  updateMemberRole,
} from '../lib/teamsApi';

type NavigationProp = NativeStackNavigationProp<
  TeamStackParamList,
  'TeamMembers'
>;
type MembersRouteProp = RouteProp<TeamStackParamList, 'TeamMembers'>;

export default function TeamMembersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { params } = useRoute<MembersRouteProp>();
  const { user } = useAuth();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<boolean>(false);
  const [addMemberVisible, setAddMemberVisible] = useState<boolean>(false);

  const loadMembers = () => {
    setLoading(true);
    fetchTeamMembersWithRoles(params.teamId)
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.teamId]);

  const myRole = members.find(member => member.user_id === user?.id)?.role;
  const isAdmin = myRole === 'admin';

  const handleToggleRole = async (member: TeamMember) => {
    const nextRole = member.role === 'admin' ? 'member' : 'admin';
    setBusyUserId(member.user_id);
    try {
      await updateMemberRole(params.teamId, member.user_id, nextRole);
      setMembers(prev =>
        prev.map(m =>
          m.user_id === member.user_id ? { ...m, role: nextRole } : m,
        ),
      );
    } catch (e) {
      const reason = e instanceof Error ? e.message : 'please try again';
      Alert.alert("Couldn't update role", reason);
    } finally {
      setBusyUserId(null);
    }
  };

  const handleRemoveMember = (member: TeamMember) => {
    Alert.alert(
      'Remove member?',
      `${member.name ?? member.email} will be removed from this team.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setBusyUserId(member.user_id);
            try {
              await removeMember(params.teamId, member.user_id);
              setMembers(prev =>
                prev.filter(m => m.user_id !== member.user_id),
              );
            } catch (e) {
              const reason =
                e instanceof Error ? e.message : 'please try again';
              Alert.alert("Couldn't remove member", reason);
            } finally {
              setBusyUserId(null);
            }
          },
        },
      ],
    );
  };

  const handleAddMember = async (member: ProfileSearchResult) => {
    await addMember(params.teamId, member.id);
    setMembers(prev => [
      ...prev,
      {
        user_id: member.id,
        role: 'member',
        name: member.name,
        email: member.email,
        avatar_url: member.avatar_url,
      },
    ]);
  };

  const handleLeaveTeam = () => {
    Alert.alert(
      'Leave team?',
      `You'll no longer have access to ${params.teamName}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setLeaving(true);
            try {
              await leaveTeam(params.teamId);
              navigation.navigate('TeamList');
            } catch (e) {
              const reason =
                e instanceof Error ? e.message : 'please try again';
              Alert.alert("Couldn't leave team", reason);
            } finally {
              setLeaving(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.screen}>
        <ScreenHeader
          title="Members"
          subtitle={params.teamName}
          onBack={() => navigation.goBack()}
        >
          {isAdmin && (
            <TouchableOpacity
              style={styles.addMemberButton}
              activeOpacity={0.9}
              onPress={() => setAddMemberVisible(true)}
            >
              <Icon name="person-add" size={22} color={colors.white} />
            </TouchableOpacity>
          )}
        </ScreenHeader>

        {loading ? (
          <ActivityIndicator style={styles.loading} color={colors.primary} />
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {members.map(member => {
              const isSelf = member.user_id === user?.id;
              const busy = busyUserId === member.user_id;

              return (
                <View key={member.user_id} style={styles.memberRow}>
                  <Avatar
                    uri={member.avatar_url}
                    name={member.name}
                    email={member.email}
                    size={36}
                  />

                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {member.name ?? member.email}
                      {isSelf ? ' (You)' : ''}
                    </Text>
                    {member.email && (
                      <Text style={styles.memberEmail} numberOfLines={1}>
                        {member.email}
                      </Text>
                    )}
                  </View>

                  <Badge
                    label={member.role === 'admin' ? 'Admin' : 'Member'}
                    variant="soft"
                    color={
                      member.role === 'admin'
                        ? colors.accent
                        : colors.textSecondary
                    }
                  />

                  {isAdmin && !isSelf && (
                    <View style={styles.memberActions}>
                      {busy ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.primary}
                        />
                      ) : (
                        <>
                          <TouchableOpacity
                            style={styles.memberActionBtn}
                            onPress={() => handleToggleRole(member)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Icon
                              name={
                                member.role === 'admin'
                                  ? 'arrow-downward'
                                  : 'arrow-upward'
                              }
                              size={16}
                              color={colors.textSecondary}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.memberActionBtn}
                            onPress={() => handleRemoveMember(member)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Icon
                              name="person-remove"
                              size={16}
                              color={colors.error}
                            />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  )}
                </View>
              );
            })}

            <TouchableOpacity
              style={styles.leaveBtn}
              onPress={handleLeaveTeam}
              disabled={leaving}
            >
              {leaving ? (
                <ActivityIndicator color={colors.error} />
              ) : (
                <>
                  <Icon name="logout" size={16} color={colors.error} />
                  <Text style={styles.leaveBtnText}>Leave Team</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      <AddMemberModal
        visible={addMemberVisible}
        onClose={() => setAddMemberVisible(false)}
        existingMemberIds={members.map(member => member.user_id)}
        onAddMember={handleAddMember}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
  },
  list: {
    padding: spacing.lg,
    paddingTop: 44,
    gap: spacing.sm + 2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderRadius: radius.md + 2,
    padding: spacing.md,
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontSize: typography.body.fontSize,
    fontWeight: '700',
    color: colors.primary,
  },
  memberEmail: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
  memberActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  memberActionBtn: {
    padding: 6,
  },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: hexToRgba(colors.error, 0.3),
  },
  leaveBtnText: {
    color: colors.error,
    fontWeight: '600',
    fontSize: typography.body.fontSize,
  },
  addMemberButton: {
    position: 'absolute',
    bottom: -22.5,
    right: 183,
    width: 50,
    height: 50,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
