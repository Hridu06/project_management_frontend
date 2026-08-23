import type { UserRole } from "./user";

export type TeamMemberRole = "team_leader" | "manager" | "employee";

export interface TeamAssignableUser {
  id: number;
  name: string;
  role: UserRole;
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: TeamMemberRole;
}

export interface Team {
  id: number;
  name: string;
  description: string | null;
  managerId: number | null;
  managerName: string | null;
  member_count: number;
  members: TeamMember[];
  created_at: string;
  updated_at: string;
}

export interface TeamMemberInput {
  user_id: number;
  role: TeamMemberRole;
}

export interface TeamFormInput {
  name: string;
  description: string;
  managerId: number | null;
  members: TeamMemberInput[];
}
