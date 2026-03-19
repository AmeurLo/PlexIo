"use client";
import Modal from "./Modal";

interface Props {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  danger?: boolean;
}

export default function ConfirmDialog({
  isOpen, onClose, onCancel, onConfirm,
  title = "Confirmer", message,
  confirmLabel = "Supprimer", loading = false, danger = false,
}: Props) {
  const handleCancel = onCancel ?? onClose ?? (() => {});
  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title={title} maxWidth="max-w-sm">
      <p className="text-[14px] text-gray-600 dark:text-gray-400 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={handleCancel}
          className="px-4 py-2 text-[13px] font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60 rounded-xl transition-colors ${
            danger ? "bg-red-500 hover:bg-red-600" : "bg-teal-600 hover:bg-teal-700"
          }`}
        >
          {loading ? "..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
