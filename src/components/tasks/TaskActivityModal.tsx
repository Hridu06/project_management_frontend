import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  ListChecks,
  Loader2,
  PlayCircle,
  Send,
  Users,
} from "lucide-react";
import Modal from "../common/Modal";
import { getTaskActivities } from "../../services/taskService";
import type { TaskActivity, TaskActivityAction } from "../../types/task";

interface TaskActivityModalProps {
  open: boolean;
  onClose: () => void;
  taskId: number | null;
  taskTitle?: string;
}

const actionMeta: Record<
  TaskActivityAction,
  { label: string; icon: typeof ClipboardList; iconClass: string }
> = {
  created: { label: "Task created", icon: ClipboardList, iconClass: "bg-slate-100 text-slate-500" },
  started: { label: "Started work", icon: PlayCircle, iconClass: "bg-amber-50 text-amber-600" },
  subtask_toggled: { label: "Sub-task updated", icon: ListChecks, iconClass: "bg-slate-100 text-slate-500" },
  submitted: { label: "Submitted for review", icon: Send, iconClass: "bg-blue-50 text-blue-600" },
  approved: { label: "Approved", icon: CheckCircle2, iconClass: "bg-emerald-50 text-emerald-600" },
  reassigned: { label: "Reassigned", icon: Users, iconClass: "bg-violet-50 text-violet-600" },
};

const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const TaskActivityModal = ({ open, onClose, taskId, taskTitle }: TaskActivityModalProps) => {
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || taskId == null) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getTaskActivities(taskId);
        if (cancelled) return;
        setActivities(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load activity.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [open, taskId]);

  return (
    <Modal open={open} onClose={onClose} title={taskTitle ? `Activity — ${taskTitle}` : "Task Activity"}>
      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && activities.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-500">No activity recorded yet.</p>
      )}

      {!loading && !error && activities.length > 0 && (
        <ul className="space-y-4">
          {activities.map((activity) => {
            const meta = actionMeta[activity.action];
            const Icon = meta.icon;

            return (
              <li key={activity.id} className="flex gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.iconClass}`}>
                  <Icon size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <p className="text-sm font-medium text-slate-800">{meta.label}</p>
                    <span className="text-xs text-slate-400">{formatTimestamp(activity.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {activity.user ? activity.user.name : "System"}
                  </p>
                  {activity.note && (
                    <p className="mt-1 text-xs text-slate-500">{activity.note}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
};

export default TaskActivityModal;
