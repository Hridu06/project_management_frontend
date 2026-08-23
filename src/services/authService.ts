import { apiRequest, clearToken, setToken } from "./api";
import type { ApiUser } from "../types/auth";

interface LoginResponse {
  message: string;
  access_token: string;
  token_type: string;
  expires_in: number;
  user: ApiUser;
  requires_2fa: boolean;
}

interface RegisterResponse {
  message: string;
  user: ApiUser;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
}

export const login = async (email: string, password: string): Promise<ApiUser> => {
  const data = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    auth: false,
    body: { email, password },
  });

  setToken(data.access_token);
  return data.user;
};

export const register = async (payload: RegisterPayload): Promise<ApiUser> => {
  const data = await apiRequest<RegisterResponse>("/auth/register", {
    method: "POST",
    auth: false,
    body: payload,
  });

  return data.user;
};

export const logout = async (): Promise<void> => {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } finally {
    clearToken();
  }
};

export const fetchCurrentUser = (): Promise<ApiUser> => apiRequest<ApiUser>("/user");

export const changePassword = (
  currentPassword: string,
  password: string,
  passwordConfirmation: string,
): Promise<void> =>
  apiRequest("/auth/change-password", {
    method: "POST",
    body: {
      current_password: currentPassword,
      password,
      password_confirmation: passwordConfirmation,
    },
  });
