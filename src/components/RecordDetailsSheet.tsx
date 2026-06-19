import type { ReactNode } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

export const useRecordDetails = (recordType: string) => {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const selectedId = searchParams.get('recordType') === recordType ? searchParams.get('record') : null;
    const openRecord = (recordId: string) => {
        const next = new URLSearchParams(searchParams);
        next.set('recordType', recordType);
        next.set('record', recordId);
        navigate(`${location.pathname}?${next.toString()}`);
    };
    const closeRecord = () => navigate(-1);
    return { selectedId, openRecord, closeRecord };
};

export const RecordDetailsSheet = ({
    title,
    eyebrow,
    children,
    onClose,
    onEdit,
    onDelete,
    deleteLabel = 'Delete',
    canEdit = true,
}: {
    title: string;
    eyebrow: string;
    children: ReactNode;
    onClose: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    deleteLabel?: string;
    canEdit?: boolean;
}) => (
    <Modal onClose={onClose} titleId="record-details-title" className="mt-auto max-w-lg rounded-b-none p-0 sm:my-auto sm:rounded-2xl">
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-border sm:hidden" />
        <header className="flex items-start justify-between gap-4 border-b border-border p-5">
            <div className="min-w-0">
                <p className="mi-label text-primary">{eyebrow}</p>
                <h2 id="record-details-title" className="mt-1 break-words text-xl font-bold">{title}</h2>
            </div>
            <button type="button" onClick={onClose} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent" aria-label="Close details"><X className="h-5 w-5" /></button>
        </header>
        <div className="max-h-[65dvh] overflow-y-auto p-5">{children}</div>
        {(canEdit && onEdit || onDelete) && (
            <footer className="flex gap-2 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {canEdit && onEdit && <Button className="flex-1" onClick={onEdit}><Pencil className="mr-2 h-4 w-4" />Edit</Button>}
                {onDelete && <Button variant="outline" onClick={onDelete}><Trash2 className="mr-2 h-4 w-4" />{deleteLabel}</Button>}
            </footer>
        )}
    </Modal>
);

export const DetailRows = ({ rows }: { rows: Array<[string, ReactNode]> }) => (
    <dl className="grid gap-3">
        {rows.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-background/50 p-3">
                <dt className="mi-label">{label}</dt>
                <dd className="mt-1 break-words text-sm font-semibold">{value || 'Not provided'}</dd>
            </div>
        ))}
    </dl>
);
