import { X } from "lucide-react";

interface ImagePreviewModalProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

const ImagePreviewModal = ({ src, alt = "", onClose }: ImagePreviewModalProps) => {
  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Close"
      >
        <X size={22} />
      </button>

      <img
        src={src}
        alt={alt}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
      />
    </div>
  );
};

export default ImagePreviewModal;
