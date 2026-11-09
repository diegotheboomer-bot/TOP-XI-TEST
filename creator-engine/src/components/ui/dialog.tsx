'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from './cn';

/**
 * Modal built on the native <dialog>: focus stays inside, Esc and a click on
 * the backdrop close it. A bottom sheet on phones, centred from sm up.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
    if (!open) return;
    // The page behind shouldn't scroll while the dialog is open.
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = before;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault(); // let React state drive closing
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // backdrop
      }}
      className={cn(
        'w-full overflow-y-auto overscroll-contain border border-zinc-200/80 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-[rgb(0_0_0/0.6)] backdrop:backdrop-blur-[2px]',
        'mb-0 mt-auto max-h-[92dvh] max-w-none rounded-t-2xl sm:m-auto sm:max-h-[calc(100dvh-3rem)] sm:max-w-lg sm:rounded-2xl',
        className,
      )}
    >
      {open && (
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="dialog-title" className="text-lg font-semibold tracking-tight">
                {title}
              </h2>
              {description && <div className="mt-1 text-sm text-zinc-500">{description}</div>}
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="-mr-1.5 -mt-1 grid size-9 shrink-0 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900">
              <X className="size-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
