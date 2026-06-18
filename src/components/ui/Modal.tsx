import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

export const Modal = ({
    children,
    onClose,
    titleId,
    className,
}: {
    children: ReactNode;
    onClose: () => void;
    titleId?: string;
    className?: string;
}) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef(onClose);

    useEffect(() => {
        closeRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        const scrollY = window.scrollY;
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const body = document.body;
        const previousStyles = {
            position: body.style.position,
            top: body.style.top,
            width: body.style.width,
            overflow: body.style.overflow,
        };

        body.style.position = 'fixed';
        body.style.top = `-${scrollY}px`;
        body.style.width = '100%';
        body.style.overflow = 'hidden';
        window.requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus());

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeRef.current();
                return;
            }
            if (event.key !== 'Tab' || !panelRef.current) return;
            const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(focusableSelector));
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            body.style.position = previousStyles.position;
            body.style.top = previousStyles.top;
            body.style.width = previousStyles.width;
            body.style.overflow = previousStyles.overflow;
            window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' });
            previousFocus?.focus();
        };
    }, []);

    const modal = (
        <div className="mi-modal-scroll fixed inset-0 z-50 overflow-y-auto bg-black/75" role="presentation">
            <div className="flex min-h-full items-start justify-center p-4 py-[max(1rem,env(safe-area-inset-top))] sm:items-center">
                <div
                    ref={panelRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    aria-label={titleId ? undefined : 'Dialog'}
                    className={cn('mi-surface w-full p-6 shadow-2xl', className)}
                >
                    {children}
                </div>
            </div>
        </div>
    );

    return typeof document === 'undefined' ? modal : createPortal(modal, document.body);
};
