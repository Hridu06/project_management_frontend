import { useState, type FormEvent } from "react";
import { Check, Eye, EyeOff, KeyRound } from "lucide-react";
import Modal from "./Modal";
import { changePassword } from "../../services/authService";

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

const emptyForm = {
  currentPassword: "",
  password: "",
  passwordConfirmation: "",
};

const emptyVisibility = {
  currentPassword: false,
  password: false,
  passwordConfirmation: false,
};

const ChangePasswordModal = ({ open, onClose }: ChangePasswordModalProps) => {
  const [form, setForm] = useState(emptyForm);
  const [visible, setVisible] = useState(emptyVisibility);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const toggleVisible = (field: keyof typeof emptyVisibility) => {
    setVisible((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const close = () => {
    setForm(emptyForm);
    setVisible(emptyVisibility);
    setError(null);
    setSuccess(false);
    onClose();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (form.password !== form.passwordConfirmation) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await changePassword(form.currentPassword, form.password, form.passwordConfirmation);
      setSuccess(true);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Change Password">
      {success ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Check size={22} />
          </div>
          <p className="text-sm text-slate-600">
            Your password has been changed. You'll stay signed in on this device.
          </p>
          <button
            type="button"
            onClick={close}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Current Password
            </label>
            <div className="relative">
              <input
                required
                type={visible.currentPassword ? "text" : "password"}
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={() => toggleVisible("currentPassword")}
                tabIndex={-1}
                aria-label={visible.currentPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
              >
                {visible.currentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              New Password
            </label>
            <div className="relative">
              <input
                required
                minLength={8}
                type={visible.password ? "text" : "password"}
                autoComplete="new-password"
                value={form.password}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, password: event.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={() => toggleVisible("password")}
                tabIndex={-1}
                aria-label={visible.password ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
              >
                {visible.password ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-400">At least 8 characters.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                required
                minLength={8}
                type={visible.passwordConfirmation ? "text" : "password"}
                autoComplete="new-password"
                value={form.passwordConfirmation}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, passwordConfirmation: event.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={() => toggleVisible("passwordConfirmation")}
                tabIndex={-1}
                aria-label={visible.passwordConfirmation ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
              >
                {visible.passwordConfirmation ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              <KeyRound size={16} />
              {saving ? "Changing..." : "Change Password"}
            </button>

            <button
              type="button"
              onClick={close}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default ChangePasswordModal;
