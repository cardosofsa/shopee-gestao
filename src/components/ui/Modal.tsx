interface ModalProps {
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
}

export function Modal({ onClose, children, className = '', maxWidth = 'max-w-lg' }: ModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
    >
      <div
        className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full overflow-hidden ${maxWidth} ${className}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
