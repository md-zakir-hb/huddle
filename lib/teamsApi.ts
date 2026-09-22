import { supabase } from './supabase';

export interface Team {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

export interface NewTeamInput {
  name: string;
  description?: string;
  memberIds?: string[];
}

export interface ProfileSearchResult {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
}

export interface TeamMemberProfile {
  id: string;
  name: string | null;
  avatar_url: string | null;
}

export type TeamRole = 'admin' | 'member';

export interface TeamMember {
  user_id: string;
  role: TeamRole;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export async function fetchTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as Team[];
}

export async function searchProfilesByEmail(
  query: string,
): Promise<ProfileSearchResult[]> {
  const { data, error } = await supabase.rpc('search_profiles_by_email', {
    search_query: query,
  });

  if (error) throw error;
  return data as ProfileSearchResult[];
}

export async function fetchTeamMembersByTeamIds(
  teamIds: string[],
): Promise<Record<string, TeamMemberProfile[]>> {
  if (teamIds.length === 0) return {};

  const { data: memberRows, error: memberError } = await supabase
    .from('team_members')
    .select('team_id, user_id')
    .in('team_id', teamIds);

  if (memberError) throw memberError;
  if (!memberRows || memberRows.length === 0) return {};

  const userIds = [...new Set(memberRows.map(row => row.user_id))];

  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .in('id', userIds);

  if (profileError) throw profileError;

  const profileById = new Map(
    (profileRows as TeamMemberProfile[]).map(profile => [profile.id, profile]),
  );

  const result: Record<string, TeamMemberProfile[]> = {};
  for (const row of memberRows) {
    const profile = profileById.get(row.user_id);
    if (!profile) continue;
    (result[row.team_id] ??= []).push(profile);
  }
  return result;
}

export async function fetchTeamMembersWithRoles(
  teamId: string,
): Promise<TeamMember[]> {
  const { data: memberRows, error: memberError } = await supabase
    .from('team_members')
    .select('user_id, role')
    .eq('team_id', teamId);

  if (memberError) throw memberError;
  if (!memberRows || memberRows.length === 0) return [];

  const userIds = memberRows.map(row => row.user_id);

  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, email, avatar_url')
    .in('id', userIds);

  if (profileError) throw profileError;

  const profileById = new Map(
    profileRows.map(profile => [profile.id, profile]),
  );

  return memberRows.map(row => {
    const profile = profileById.get(row.user_id);
    return {
      user_id: row.user_id,
      role: row.role as TeamRole,
      name: profile?.name ?? null,
      email: profile?.email ?? null,
      avatar_url: profile?.avatar_url ?? null,
    };
  });
}

export async function addMember(teamId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .insert({ team_id: teamId, user_id: userId, role: 'member' });

  if (error) throw error;
}

export async function updateMemberRole(
  teamId: string,
  userId: string,
  role: TeamRole,
): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .update({ role })
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function removeMember(
  teamId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function leaveTeam(teamId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data: members, error } = await supabase
    .from('team_members')
    .select('user_id, role')
    .eq('team_id', teamId);

  if (error) throw error;

  const me = members?.find(member => member.user_id === user.id);
  if (!me) throw new Error('You are not a member of this team');

  const adminCount = (members ?? []).filter(
    member => member.role === 'admin',
  ).length;

  if (me.role === 'admin' && adminCount <= 1) {
    throw new Error(
      "You're the only admin. Promote another member to admin before leaving.",
    );
  }

  await removeMember(teamId, user.id);
}

export async function createTeam(input: NewTeamInput): Promise<Team> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({
      name: input.name,
      description: input.description,
      created_by: user.id,
    })
    .select()
    .single();

  if (teamError) throw teamError;

  const { error: memberError } = await supabase.from('team_members').insert({
    team_id: team.id,
    user_id: user.id,
    role: 'admin',
  });

  if (memberError) throw memberError;

  const extraMemberIds = (input.memberIds ?? []).filter(id => id !== user.id);

  if (extraMemberIds.length > 0) {
    const { error: extraMembersError } = await supabase
      .from('team_members')
      .insert(
        extraMemberIds.map(memberId => ({
          team_id: team.id,
          user_id: memberId,
          role: 'member',
        })),
      );

    if (extraMembersError) throw extraMembersError;
  }

  return team as Team;
}
