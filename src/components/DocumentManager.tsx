import { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, Download, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useParams } from 'react-router-dom';
import type { Document } from '../lib/types';

export const DocumentManager = () => {
    const { id: vehicleId } = useParams<{ id: string }>();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

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
        if (!file || !vehicleId) return;

        // Max size 5MB
        if (file.size > 5 * 1024 * 1024) {
            setError('File too large. Max 5MB.');
            return;
        }

        setUploading(true);
        setError('');

        try {
            // 1. Upload to Firebase Storage
            const storagePath = `vehicles/${vehicleId}/documents/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            // 2. Save metadata to Firestore
            await addDoc(collection(db, `vehicles/${vehicleId}/documents`), {
                name: file.name,
                url: downloadURL,
                path: storagePath,
                type: 'other', // Default type
                uploadedAt: serverTimestamp(),
                vehicleId,
                expiryDate: null 
            });

        } catch (err: unknown) {
            console.error(err);
            setError('Failed to upload document.');
        } finally {
            setUploading(false);
            // Reset input
            event.target.value = '';
        }
    };

    const handleDelete = async (docId: string, storagePath: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;
        if (!vehicleId) return;

        try {
            // 1. Delete from Storage
            const storageRef = ref(storage, storagePath);
            await deleteObject(storageRef);

            // 2. Delete from Firestore
            await deleteDoc(doc(db, `vehicles/${vehicleId}/documents`, docId));
        } catch (err) {
            console.error("Error deleting document:", err);
            setError("Failed to delete document.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-foreground">Vehicle Documents</h3>
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
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a 
                                    href={doc.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-2 hover:bg-accent rounded-full text-muted-foreground hover:text-foreground transition-colors"
                                    title="Download"
                                >
                                    <Download className="w-4 h-4" />
                                </a>
                                <button
                                    onClick={() => handleDelete(doc.id, doc.path)}
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
