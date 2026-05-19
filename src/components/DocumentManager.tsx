import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Download, FileText, Loader2, ScanText, Trash2, Upload, X } from 'lucide-react';
import { collection, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { AppSurface, EmptyState, Panel, StatusPill } from './ui/design-system';
import { db } from '../lib/firebase';
import type { Document } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { callR2DocumentFunction } from '../lib/r2Documents';
import type { OcrFieldKey, OcrResult } from '../lib/ocr';

interface CreateUploadUrlResponse {
    documentId: string;
    key: string;
    uploadUrl: string;
    expiresIn: number;
}

interface DownloadUrlResponse {
    downloadUrl: string;
}

const documentTypes = [
    { value: 'insurance', label: 'Insurance / TPL' },
    { value: 'registration', label: 'Registration Certificate' },
    { value: 'inspection', label: 'Technical Inspection' },
    { value: 'tax', label: 'Road Tax' },
    { value: 'service', label: 'Service Invoice' },
    { value: 'ownership', label: 'Ownership / Title' },
    { value: 'warranty', label: 'Warranty' },
    { value: 'other', label: 'Other' },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const confidenceTone = (confidence: number) => {
    if (confidence >= 80) return 'emerald';
    if (confidence >= 55) return 'amber';
    return 'rose';
};

export const DocumentManager = () => {
    const { id: vehicleId } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState('');
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);

    const [documentType, setDocumentType] = useState('insurance');
    const [issueDate, setIssueDate] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [cost, setCost] = useState('');
    const [plateNumber, setPlateNumber] = useState('');
    const [vin, setVin] = useState('');
    const [referenceNumber, setReferenceNumber] = useState('');

    useEffect(() => {
        if (!vehicleId) return;

        const q = query(
            collection(db, `vehicles/${vehicleId}/documents`),
            where('vehicleId', '==', vehicleId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docsData = snapshot.docs.map((snapshotDoc) => ({
                id: snapshotDoc.id,
                ...snapshotDoc.data(),
            })) as Document[];

            setDocuments(docsData.sort((a, b) => (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0)));
            setLoading(false);
        });

        return unsubscribe;
    }, [vehicleId]);

    const suggestionsByKey = useMemo(() => {
        const map = new Map<OcrFieldKey, number>();
        ocrResult?.suggestions.forEach((suggestion) => map.set(suggestion.key, suggestion.confidence));
        return map;
    }, [ocrResult]);

    const applySuggestions = (result: OcrResult) => {
        result.suggestions.forEach((suggestion) => {
            if (suggestion.key === 'documentType') setDocumentType(suggestion.value);
            if (suggestion.key === 'issueDate') setIssueDate(suggestion.value);
            if (suggestion.key === 'expiryDate') setExpiryDate(suggestion.value);
            if (suggestion.key === 'cost') setCost(suggestion.value);
            if (suggestion.key === 'plateNumber') setPlateNumber(suggestion.value);
            if (suggestion.key === 'vin') setVin(suggestion.value);
            if (suggestion.key === 'referenceNumber') setReferenceNumber(suggestion.value);
        });
    };

    const resetPendingUpload = () => {
        setPendingFile(null);
        setOcrResult(null);
        setScanning(false);
        setUploading(false);
        setIssueDate('');
        setExpiryDate('');
        setCost('');
        setPlateNumber('');
        setVin('');
        setReferenceNumber('');
    };

    const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) return;
        if (file.size > MAX_FILE_SIZE) {
            setError('File too large. Max 5MB.');
            return;
        }

        setError('');
        setPendingFile(file);
        setOcrResult(null);
        setScanning(true);

        try {
            const { scanDocumentLocally } = await import('../lib/ocr');
            const result = await scanDocumentLocally(file);
            setOcrResult(result);
            applySuggestions(result);
        } catch {
            setError('OCR could not read this file. You can still fill the fields manually and upload.');
        } finally {
            setScanning(false);
        }
    };

    const handleConfirmedUpload = async () => {
        if (!pendingFile || !vehicleId || !user) return;

        setUploading(true);
        setError('');

        try {
            const uploadData = await callR2DocumentFunction<CreateUploadUrlResponse>(user, 'createUploadUrl', {
                vehicleId,
                fileName: pendingFile.name,
                contentType: pendingFile.type,
                size: pendingFile.size,
            });

            const uploadResponse = await fetch(uploadData.uploadUrl, {
                method: 'PUT',
                headers: {
                    'content-type': pendingFile.type,
                },
                body: pendingFile,
            });

            if (!uploadResponse.ok) {
                throw new Error('R2 upload failed. Check bucket CORS and credentials.');
            }

            await callR2DocumentFunction(user, 'finalizeUpload', {
                vehicleId,
                documentId: uploadData.documentId,
                key: uploadData.key,
                name: pendingFile.name,
                type: documentType,
                contentType: pendingFile.type,
                size: pendingFile.size,
                issueDate: issueDate || null,
                expiryDate: expiryDate || null,
                cost: cost ? parseFloat(cost) : 0,
                plateNumber: plateNumber || null,
                vin: vin || null,
                referenceNumber: referenceNumber || null,
                ocrAssisted: Boolean(ocrResult),
            });

            resetPendingUpload();
        } catch (err: unknown) {
            console.error('Document upload failed');
            setError(err instanceof Error ? err.message : 'Failed to upload document.');
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async (documentRecord: Document) => {
        if (!user || !vehicleId) return;

        try {
            if (documentRecord.url) {
                window.open(documentRecord.url, '_blank', 'noopener,noreferrer');
                return;
            }

            const data = await callR2DocumentFunction<DownloadUrlResponse>(user, 'createDownloadUrl', {
                vehicleId,
                documentId: documentRecord.id,
            });
            window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
        } catch (err) {
            console.error('Document download link creation failed');
            setError(err instanceof Error ? err.message : 'Failed to create download link.');
        }
    };

    const handleDelete = async (documentRecord: Document) => {
        if (!confirm('Are you sure you want to delete this document?')) return;
        if (!vehicleId || !user) return;

        try {
            if (documentRecord.storageProvider === 'r2') {
                await callR2DocumentFunction(user, 'deleteDocument', {
                    vehicleId,
                    documentId: documentRecord.id,
                });
                return;
            }

            await deleteDoc(doc(db, `vehicles/${vehicleId}/documents`, documentRecord.id));
        } catch (err) {
            console.error('Document deletion failed');
            setError(err instanceof Error ? err.message : 'Failed to delete document.');
        }
    };

    const FieldConfidence = ({ field }: { field: OcrFieldKey }) => {
        const confidence = suggestionsByKey.get(field);
        if (!confidence) return null;
        return <StatusPill tone={confidenceTone(confidence)}>{confidence}% OCR</StatusPill>;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Vehicle Documents</h3>
                    <p className="text-xs text-muted-foreground">OCR runs locally in this browser. Review every suggestion before upload.</p>
                </div>
                <div className="relative">
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileSelected}
                        accept=".pdf,.jpg,.jpeg,.png"
                        disabled={uploading || scanning}
                    />
                    <label htmlFor="file-upload">
                        <Button variant="default" className="cursor-pointer" isLoading={scanning} type="button">
                            <ScanText className="mr-2 h-4 w-4" />
                            Select & scan
                        </Button>
                    </label>
                </div>
            </div>

            {pendingFile && (
                <AppSurface className="p-5">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <p className="mi-label text-primary">Review before upload</p>
                            <h4 className="mt-1 truncate font-bold">{pendingFile.name}</h4>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Confirm or edit OCR suggestions. Raw OCR text is not stored.
                            </p>
                        </div>
                        <button type="button" onClick={resetPendingUpload} className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {scanning && (
                        <Panel className="mb-4 flex items-center gap-3 p-4 text-sm text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            Reading this document locally...
                        </Panel>
                    )}

                    {ocrResult && (
                        <Panel className="mb-4 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <StatusPill tone={confidenceTone(ocrResult.confidence)}>{ocrResult.confidence}% scan confidence</StatusPill>
                                <StatusPill tone="blue">{ocrResult.source}</StatusPill>
                                <StatusPill tone="slate">{ocrResult.scannedPages} page{ocrResult.scannedPages === 1 ? '' : 's'} checked</StatusPill>
                            </div>
                            {ocrResult.suggestions.some((suggestion) => suggestion.confidence < 55) && (
                                <p className="mt-3 flex items-center gap-2 text-xs text-amber-400">
                                    <AlertCircle className="h-4 w-4" />
                                    Some fields are low confidence. Confirm them manually before upload.
                                </p>
                            )}
                        </Panel>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <label className="mi-label">Document type</label>
                                <FieldConfidence field="documentType" />
                            </div>
                            <select className="mi-field" value={documentType} onChange={(event) => setDocumentType(event.target.value)} disabled={uploading}>
                                {documentTypes.map((type) => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <label className="mi-label">Policy / certificate no.</label>
                                <FieldConfidence field="referenceNumber" />
                            </div>
                            <Input value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} disabled={uploading} />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <label className="mi-label">Issue date</label>
                                <FieldConfidence field="issueDate" />
                            </div>
                            <Input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} disabled={uploading} />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <label className="mi-label">Expiry date</label>
                                <FieldConfidence field="expiryDate" />
                            </div>
                            <Input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} disabled={uploading} />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <label className="mi-label">Cost (€)</label>
                                <FieldConfidence field="cost" />
                            </div>
                            <Input type="number" placeholder="0.00" value={cost} onChange={(event) => setCost(event.target.value)} disabled={uploading} />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <label className="mi-label">Plate number</label>
                                <FieldConfidence field="plateNumber" />
                            </div>
                            <Input value={plateNumber} onChange={(event) => setPlateNumber(event.target.value)} disabled={uploading} />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                            <div className="flex items-center justify-between gap-2">
                                <label className="mi-label">VIN</label>
                                <FieldConfidence field="vin" />
                            </div>
                            <Input value={vin} onChange={(event) => setVin(event.target.value)} disabled={uploading} />
                        </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                        <Button onClick={handleConfirmedUpload} isLoading={uploading} className="h-11 flex-1">
                            <Upload className="mr-2 h-4 w-4" />
                            Confirm & upload privately
                        </Button>
                        <Button type="button" variant="outline" className="h-11" onClick={() => setOcrResult(null)} disabled={uploading}>
                            Skip OCR suggestions
                        </Button>
                    </div>
                </AppSurface>
            )}

            {error && (
                <div className="flex items-center rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="mr-2 h-4 w-4" />
                    {error}
                </div>
            )}

            {loading ? (
                <div className="py-8 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                </div>
            ) : documents.length === 0 ? (
                <EmptyState
                    icon={FileText}
                    title="No documents uploaded yet"
                    description="Upload insurance, registration, inspection papers, service invoices, or other vehicle documents."
                />
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {documents.map((documentRecord) => (
                        <AppSurface key={documentRecord.id} className="group flex items-center justify-between p-4 transition-colors hover:border-primary/50">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                                    <FileText className="h-5 w-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate font-medium text-foreground">{documentRecord.name}</p>
                                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                        <span>{documentRecord.uploadedAt?.toDate ? documentRecord.uploadedAt.toDate().toLocaleDateString() : 'Just now'}</span>
                                        {documentRecord.expiryDate && <span>Expires {documentRecord.expiryDate}</span>}
                                        {documentRecord.ocrAssisted && (
                                            <span className="inline-flex items-center gap-1 text-primary">
                                                <CheckCircle className="h-3 w-3" />
                                                OCR assisted
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleDownload(documentRecord)}
                                    className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                    title="Download"
                                >
                                    <Download className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(documentRecord)}
                                    className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                    title="Delete"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </AppSurface>
                    ))}
                </div>
            )}
        </div>
    );
};
