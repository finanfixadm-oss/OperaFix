import type { PropsWithChildren } from "react";

type ZohoModalProps = PropsWithChildren<{
  title: string;
  isOpen: boolean;
  onClose: () => void;
}>;

export default function ZohoModal({
  title,
  isOpen,
  onClose,
  children,
}: ZohoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="zoho-modal-backdrop">
      <div className="zoho-modal">
        <div className="zoho-modal-header">
          <h2>{title}</h2>
          <button type="button" className="zoho-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="zoho-modal-body">{children}</div>
      </div>
    </div>
  );
}