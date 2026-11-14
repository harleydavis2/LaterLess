import Modal from './Modal.jsx';

export default function ConfirmDialog({ open, onClose, title, message, confirmLabel = 'Delete', onConfirm }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-stone-600">{message}</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => {
            onClose();
            onConfirm();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
