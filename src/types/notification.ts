export interface AppNotification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  taskId: number | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}
