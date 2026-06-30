import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Visual width preset. "wide" suits map/editor modals; "narrow" suits forms. */
  size?: "narrow" | "wide";
}

// Centered modal built on the same scrim + dialog pattern the graph settings
// drawer uses, generalized so field editing, location editing, and advanced
// graph settings can share it. Closes on scrim click and Escape.
export function Modal({ open, title, onClose, children, footer, size = "narrow" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-scrim" onClick={onClose} role="presentation">
      <div
        className={`modal-card modal-card-${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-button" aria-label={`Close ${title}`} onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
