import { apiRequest } from "./api";
import type { AppNotification } from "../types/notification";

interface ApiNotification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  task_id: number | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

const toNotification = (data: ApiNotification): AppNotification => ({
  id: data.id,
  userId: data.user_id,
  type: data.type,
  title: data.title,
  message: data.message,
  taskId: data.task_id,
  isRead: data.is_read,
  readAt: data.read_at,
  createdAt: data.created_at,
});

export const getNotifications = async (): Promise<AppNotification[]> => {
  const data = await apiRequest<{ notifications: ApiNotification[] }>("/notifications");
  return data.notifications.map(toNotification);
};

export const markNotificationRead = (id: number): Promise<void> =>
  apiRequest(`/notifications/${id}/read`, { method: "POST" });

export const markAllNotificationsRead = (): Promise<void> =>
  apiRequest("/notifications/read-all", { method: "POST" });
