import * as React from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 pointer-events-none">
      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
          onClick={onClose}
        />
      )}
      {open && (
        <div
          className={`fixed inset-0 overflow-hidden z-50 ${sizeClasses[size]}`}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="flex flex-col w-full max-h-screen bg-white shadow-xl rounded-lg outline-none outline-0 border-b border-zinc-200"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">
              <h2 className="font-medium text-zinc-900">{title}</h2>
              <button
                onClick={onClose}
                className="text-zinc-500 hover:text-zinc-700"
                aria-label="Close modal"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0l1.414 1.414a1 1 0 01-1.414 1.414L4.707 5.5H7a1 1 0 110 2h-2.707l-1.293 1.293a1 1 0 01-1.414-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 flex-1 overflow-auto">{children}</div>
            <div className="flex items-center justify-between border-t border-zinc-200 px-6 py-3">
              <button
                onClick={onClose}
                className="flex-1 text-sm font-medium text-zinc-600 hover:text-zinc-900 mr-2"
              >
                Cancel
              </button>
              <button
                className="btn btn-sm btn-default"
                onClick={onClose}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}