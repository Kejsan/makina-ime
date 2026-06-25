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

let modalLockDepth = 0;
let scrollLockSnapshot: {
    scrollY: number;
    bodyOverflow: string;
    bodyPaddingRight: string;
    htmlOverflow: string;
} | null = null;

const lockDocumentScroll = () => {
    const scrollY = window.scrollY;
    if (modalLockDepth === 0) {
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        scrollLockSnapshot = {
            scrollY,
            bodyOverflow: document.body.style.overflow,
            bodyPaddingRight: document.body.style.paddingRight,
            htmlOverflow: document.documentElement.style.overflow,
        };
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }
    }
    modalLockDepth += 1;
};

const unlockDocumentScroll = () => {
    modalLockDepth = Math.max(0, modalLockDepth - 1);
    if (modalLockDepth > 0 || !scrollLockSnapshot) return;

    const { scrollY, bodyOverflow, bodyPaddingRight, htmlOverflow } = scrollLockSnapshot;
    document.documentElement.style.overflow = htmlOverflow;
    document.body.style.overflow = bodyOverflow;
    document.body.style.paddingRight = bodyPaddingRight;
    scrollLockSnapshot = null;
    window.requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' });
    });
};

export const Modal = ({
    children,
    onClose,
    titleId,
    className,
    shouldConfirmClose,
}: {
    children: ReactNode;
    onClose: () => void;
    titleId?: string;
    className?: string;
    shouldConfirmClose?: () => boolean;
}) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef(onClose);
    const confirmCloseRef = useRef(shouldConfirmClose);
    const hasEditedFormRef = useRef(false);

    useEffect(() => {
        closeRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        confirmCloseRef.current = shouldConfirmClose;
    }, [shouldConfirmClose]);

    const requestClose = () => {
        const shouldBlockClose = confirmCloseRef.current?.() ?? hasEditedFormRef.current;
        if (shouldBlockClose && !window.confirm('You have unsaved changes. Close without saving?')) {
            return;
        }
        closeRef.current();
    };

    useEffect(() => {
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

        lockDocumentScroll();
        window.requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus());

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                requestClose();
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
            unlockDocumentScroll();
            previousFocus?.focus();
        };
    }, []);

    const modal = (
        <div
            className="mi-modal-scroll fixed inset-0 z-50 overflow-y-auto bg-black/75"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    requestClose();
                }
            }}
        >
            <div
                className="mi-modal-frame flex items-start justify-center sm:items-center"
                onMouseDown={(event) => {
                    if (event.target === event.currentTarget) {
                        requestClose();
                    }
                }}
            >
                <div
                    ref={panelRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    aria-label={titleId ? undefined : 'Dialog'}
                    className={cn('mi-surface w-full min-w-0 max-w-full p-4 shadow-2xl sm:p-6', className)}
                    onChangeCapture={(event) => {
                        const target = event.target;
                        if (target instanceof HTMLElement && target.closest('form')) {
                            hasEditedFormRef.current = true;
                        }
                    }}
                    onInputCapture={(event) => {
                        const target = event.target;
                        if (target instanceof HTMLElement && target.closest('form')) {
                            hasEditedFormRef.current = true;
                        }
                    }}
                >
                    {children}
                </div>
            </div>
        </div>
    );

    return typeof document === 'undefined' ? modal : createPortal(modal, document.body);
};
