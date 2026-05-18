import { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, Download, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import type { Document } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { callR2DocumentFunction } from '../lib/r2Documents';

interface CreateUploadUrlResponse {
    documentId: string;
    key: string;
    uploadUrl: string;
    expiresIn: number;
}

interface DownloadUrlResponse {
    downloadUrl: string;
}

export const DocumentManager = () => {
    const { id: vehicleId } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [documentType, setDocumentType] = useState('insurance');
    const [issueDate, setIssueDate] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [cost, setCost] = useState('');

    const documentTypes = [
        { value: 'insurance', label: 'Insurance / TPL' },
        { value: 'registration', label: 'Registration Certificate' },
        { value: 'inspection', label: 'Technical Inspection' },
        { value: 'tax', label: 'Road Tax' },
        { value: 'service', label: 'Service Invoice' },
        { value: 'ownership', label: 'Ownership / Title' },
        { value: 'warranty', label: 'Warranty' },
        { value: 'other', label: 'Other' }
    ];

    useEffect(() => {
        if (!vehicleId) return;

        const q = query(
            collection(db, `vehicles/${vehicleId}/documents`),
            where('vehicleId', '==', vehicleId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Document[];
            
            // Sort by uploadedAt desc
            setDocuments(docsData.sort((a, b) => 
                (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0)
            ));
            setLoading(false);
        });

        return unsubscribe;
    }, [vehicleId]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !vehicleId || !user) return;

        // Max size 5MB
        if (file.size > 5 * 1024 * 1024) {
            setError('File too large. Max 5MB.');
            return;
        }

        setUploading(true);
        setError('');

        try {
            const uploadData = await callR2DocumentFunction<CreateUploadUrlResponse>(user, 'createUploadUrl', {
                vehicleId,
                fileName: file.name,
                contentType: file.type,
                size: file.size,
            });

            const uploadResponse = await fetch(uploadData.uploadUrl, {
                method: 'PUT',
                headers: {
                    'content-type': file.type,
                },
                body: file,
            });

            if (!uploadResponse.ok) {
                throw new Error('R2 upload failed. Check bucket CORS and credentials.');
            }

            await callR2DocumentFunction(user, 'finalizeUpload', {
                vehicleId,
                documentId: uploadData.documentId,
                key: uploadData.key,
                name: file.name,
                type: documentType,
                contentType: file.type,
                size: file.size,
                issueDate: issueDate || null,
                expiryDate: expiryDate || null,
                cost: cost ? parseFloat(cost) : 0,
            });

            setIssueDate('');
            setExpiryDate('');
            setCost('');
        } catch (err: unknown) {
            console.error('Document upload failed');
            setError(err instanceof Error ? err.message : 'Failed to upload document.');
        } finally {
            setUploading(false);
            // Reset input
            event.target.value = '';
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
            setError(err instanceof Error ? err.message : "Failed to delete document.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-foreground">Vehicle Documents</h3>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <select
                        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={documentType}
                        onChange={(event) => setDocumentType(event.target.value)}
                        disabled={uploading}
                    >
                        {documentTypes.map((type) => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                    </select>
                    <div className="relative">
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept=".pdf,.jpg,.jpeg,.png"
                        disabled={uploading}
                    />
                    <label htmlFor="file-upload">
                        <Button 
                            variant="default" 
                            className="cursor-pointer" 
                            isLoading={uploading}
                            type="button"
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Document
                        </Button>
                    </label>
                    </div>
                </div>
            </div>

            <Card className="p-4 bg-surface/40">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        type="date"
                        label="Issue Date"
                        value={issueDate}
                        onChange={(event) => setIssueDate(event.target.value)}
                        disabled={uploading}
                    />
                    <Input
                        type="date"
                        label="Expiry Date"
                        value={expiryDate}
                        onChange={(event) => setExpiryDate(event.target.value)}
                        disabled={uploading}
                    />
                    <Input
                        type="number"
                        label="Cost (€)"
                        placeholder="0.00"
                        value={cost}
                        onChange={(event) => setCost(event.target.value)}
                        disabled={uploading}
                    />
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                    When R2 is configured, expiry dates will create reminders and document costs will be linked into expenses.
                </p>
            </Card>

            {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md flex items-center text-sm">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {error}
                </div>
            )}

            {loading ? (
                <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                </div>
            ) : documents.length === 0 ? (
                <div className="text-center py-12 bg-surface/50 rounded-lg border border-border border-dashed">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No documents uploaded yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">Upload insurance, registration, or inspection papers.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {documents.map((doc) => (
                        <Card key={doc.id} className="p-4 flex items-center justify-between group hover:border-primary/50 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-medium truncate text-foreground">{doc.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {doc.uploadedAt?.toDate ? doc.uploadedAt.toDate().toLocaleDateString() : 'Just now'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleDownload(doc)}
                                    className="p-2 hover:bg-accent rounded-full text-muted-foreground hover:text-foreground transition-colors"
                                    title="Download"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(doc)}
                                    className="p-2 hover:bg-destructive/10 rounded-full text-muted-foreground hover:text-destructive transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
