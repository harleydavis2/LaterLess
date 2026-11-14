import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// Native <dialog>: gives focus trapping, Esc-to-close and a backdrop for free.
// Bottom sheet on phones, centred card on wider screens.
export default function Modal({ open, onClose, title, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal() focuses the close button; start on the first form field instead.
      dialog.querySelector('input, textarea, select')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="modal-title"
      className="mx-auto mt-auto mb-0 max-h-[90dvh] w-full max-w-none rounded-t-3xl bg-white p-0 text-stone-900 shadow-xl backdrop:bg-stone-900/40 sm:mb-auto sm:max-w-md sm:rounded-2xl"
    >
      {open && (
        <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id="modal-title" className="text-lg font-semibold">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label="Close" className="-m-1 rounded-lg p-1 text-stone-500 hover:bg-stone-100">
              <X className="size-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
