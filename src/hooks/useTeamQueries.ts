import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTeam,
  deleteTeam,
  getAssignableUsers,
  getTeamList,
  updateTeam,
} from "../services/teamService";
import type { Team, TeamFormInput } from "../types/team";

export const teamKeys = {
  list: ["teams"] as const,
  assignableUsers: ["teams", "assignable-users"] as const,
};

export const useTeamsQuery = () =>
  useQuery({ queryKey: teamKeys.list, queryFn: getTeamList });

export const useAssignableUsersQuery = (enabled = true) =>
  useQuery({
    queryKey: teamKeys.assignableUsers,
    queryFn: getAssignableUsers,
    enabled,
  });

export const useCreateTeamMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTeam,
    onSuccess: (created) => {
      queryClient.setQueryData<Team[]>(teamKeys.list, (prev) =>
        prev ? [created, ...prev] : [created],
      );
    },
  });
};

export const useUpdateTeamMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: TeamFormInput }) =>
      updateTeam(id, input),
    onSuccess: (updated) => {
      queryClient.setQueryData<Team[]>(teamKeys.list, (prev) =>
        prev?.map((team) => (team.id === updated.id ? updated : team)),
      );
    },
  });
};

export const useDeleteTeamMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteTeam(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Team[]>(teamKeys.list, (prev) =>
        prev?.filter((team) => team.id !== id),
      );
    },
  });
};
