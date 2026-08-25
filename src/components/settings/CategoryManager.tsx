import { useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Modal from "../common/Modal";

interface CategoryItem {
  id: number;
  name: string;
}

interface CategoryManagerProps {
  entityLabel: string;
  description: string;
  getList: () => Promise<CategoryItem[]>;
  create: (input: { name: string }) => Promise<CategoryItem>;
  update: (id: number, input: { name: string }) => Promise<CategoryItem>;
  remove: (id: number) => Promise<void>;
}

const CategoryManager = ({
  entityLabel,
  description,
  getList,
  create,
  update,
  remove,
}: CategoryManagerProps) => {
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getList().then((list) => {
      if (cancelled) return;
      setItems(list);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [getList]);

  const openCreateModal = () => {
    setEditingId(null);
    setName("");
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (item: CategoryItem) => {
    setEditingId(item.id);
    setName(item.name);
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        const updated = await update(editingId, { name });
        setItems((prev) =>
          prev.map((item) => (item.id === editingId ? updated : item)),
        );
      } else {
        const created = await create({ name });
        setItems((prev) => [created, ...prev]);
      }

      setModalOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to save ${entityLabel.toLowerCase()}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: CategoryItem) => {
    const confirmed = window.confirm(
      `Delete ${item.name}? This cannot be undone.`,
    );

    if (!confirmed) return;

    await remove(item.id);
    setItems((prev) => prev.filter((entry) => entry.id !== item.id));
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">{description}</p>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={18} />
          Add {entityLabel}
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            Loading...
          </p>
        ) : items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            No {entityLabel.toLowerCase()}s added yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <span className="text-sm font-medium text-slate-700">
                  {item.name}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600"
                    aria-label={`Edit ${item.name}`}
                  >
                    <Pencil size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600"
                    aria-label={`Delete ${item.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? `Edit ${entityLabel}` : `Add ${entityLabel}`}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {entityLabel} Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              autoFocus
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Changes"
                  : `Add ${entityLabel}`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CategoryManager;
