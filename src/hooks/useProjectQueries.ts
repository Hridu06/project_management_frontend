import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProject,
  deleteProject,
  getProjectAnalytics,
  getProjects,
  updateProject,
} from "../services/projectService";
import type { Project, ProjectFormInput } from "../types/project";

export const projectKeys = {
  list: ["projects"] as const,
  analytics: (projectId: number) => ["projects", projectId, "analytics"] as const,
};

export const useProjectsQuery = (enabled = true) =>
  useQuery({ queryKey: projectKeys.list, queryFn: getProjects, enabled });

export const useProjectAnalyticsQuery = (projectId: number | null, enabled = true) =>
  useQuery({
    queryKey: projectKeys.analytics(projectId ?? 0),
    queryFn: () => getProjectAnalytics(projectId as number),
    enabled: enabled && projectId != null,
  });

export const useCreateProjectMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProject,
    onSuccess: (created) => {
      queryClient.setQueryData<Project[]>(projectKeys.list, (prev) =>
        prev ? [created, ...prev] : [created],
      );
    },
  });
};

export const useUpdateProjectMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ProjectFormInput }) =>
      updateProject(id, input),
    onSuccess: (updated) => {
      queryClient.setQueryData<Project[]>(projectKeys.list, (prev) =>
        prev?.map((project) => (project.id === updated.id ? updated : project)),
      );
    },
  });
};

export const useDeleteProjectMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteProject(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Project[]>(projectKeys.list, (prev) =>
        prev?.filter((project) => project.id !== id),
      );
    },
  });
};
