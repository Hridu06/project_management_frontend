export type Role = "admin" | "manager" | "employee";

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  employee: {
    id: number;
    full_name: string;
    email: string;
    avatar: string | null;
  } | null;
  email_verified_at: string | null;
  is_active: boolean;
  is_banned: boolean;
  two_factor_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  employeeId: number | null;
  avatar: string | null;
}
