import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AddTeamModal from '../components/AddTeamModal';
import ScreenHeader from '../components/ScreenHeader';
import Avatar from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';
import { colors, radius, spacing, typography } from '../constants/theme';
import {
  createTeam,
  fetchTeamMembersByTeamIds,
  fetchTeams,
  Team,
  TeamMemberProfile,
} from '../lib/teamsApi';
import { TeamStackParamList } from '../navigation/TeamStack';

const MAX_VISIBLE_AVATARS = 4;

type NavigationProp = NativeStackNavigationProp<TeamStackParamList, 'TeamList'>;

export default function TeamScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [membersByTeam, setMembersByTeam] = useState<
    Record<string, TeamMemberProfile[]>
  >({});
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      fetchTeams()
        .then(data => {
          if (cancelled) return;
          setTeams(data);

          const ids = data.map(team => team.id);
          if (ids.length === 0) {
            setMembersByTeam({});
            return;
          }

          fetchTeamMembersByTeamIds(ids)
            .then(members => {
              if (!cancelled) setMembersByTeam(members);
            })
            .catch(() => {});
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.screen}>
        <ScreenHeader title="Team" subtitle="Coordinate with your team">
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{teams.length}</Text>
              <Text style={styles.statLabel}>Teams</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addTeamButton}
            activeOpacity={0.9}
            onPress={() => setModalVisible(true)}
          >
            <Icon name="add" size={28} color={colors.white} />
          </TouchableOpacity>
        </ScreenHeader>

        {loading ? (
          <ActivityIndicator style={styles.loading} color={colors.primary} />
        ) : teams.length === 0 ? (
          <EmptyState
            icon="groups"
            title="No teams yet"
            description="Create a team to start coordinating with others."
          />
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {teams.map(team => {
              const members = membersByTeam[team.id] ?? [];
              const visibleMembers = members.slice(0, MAX_VISIBLE_AVATARS);
              const overflowCount = members.length - visibleMembers.length;

              return (
                <TouchableOpacity
                  key={team.id}
                  style={styles.teamCard}
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation.navigate('TeamDetail', {
                      teamId: team.id,
                      teamName: team.name,
                    })
                  }
                >
                  <View style={styles.teamCardHeader}>
                    <View style={styles.teamCardInfo}>
                      <Text style={styles.teamName}>{team.name}</Text>
                      {team.description ? (
                        <Text style={styles.teamDescription}>
                          {team.description}
                        </Text>
                      ) : null}
                    </View>
                    <Icon
                      name="chevron-right"
                      size={26}
                      color={colors.textMuted}
                    />
                  </View>

                  {members.length > 0 && (
                    <View style={styles.avatarStack}>
                      {visibleMembers.map((member, index) => (
                        <Avatar
                          key={member.id}
                          uri={member.avatar_url}
                          name={member.name}
                          size={28}
                          style={[
                            styles.avatarBorder,
                            index > 0 && styles.avatarOverlap,
                          ]}
                        />
                      ))}
                      {overflowCount > 0 && (
                        <View
                          style={[
                            styles.avatarWrap,
                            styles.avatarOverlap,
                            styles.avatarOverflow,
                          ]}
                        >
                          <Text style={styles.avatarOverflowText}>
                            +{overflowCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      <AddTeamModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreate={async input => {
          const team = await createTeam(input);
          setTeams(prev => [...prev, team]);
        }}
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
  statsRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    gap: 3,
  },
  statValue: {
    fontSize: 28,
    color: colors.white,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: typography.body.fontSize,
    color: '#dfdede',
    marginTop: 15,
  },
  addTeamButton: {
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
  loading: {
    flex: 1,
  },
  list: {
    padding: spacing.lg,
    paddingTop: 44,
    gap: spacing.md,
  },
  teamCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  teamCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  teamCardInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  teamDescription: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBorder: {
    borderWidth: 2,
    borderColor: colors.surface,
  },
  avatarWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
    overflow: 'hidden',
  },
  avatarOverlap: {
    marginLeft: -8,
  },
  avatarOverflow: {
    backgroundColor: '#dfe1ea',
  },
  avatarOverflowText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
});
