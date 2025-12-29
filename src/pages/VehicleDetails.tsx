import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Layout } from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ArrowLeft, Car, Wrench, DollarSign, FileText, Calendar } from 'lucide-react';
import { ServiceLog } from '../components/ServiceLog';
import { ExpenseTracker } from '../components/ExpenseTracker';

export const VehicleDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [vehicle, setVehicle] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'expenses' | 'documents'>('overview');

    useEffect(() => {
        if (!id) return;
        const unsubscribe = onSnapshot(doc(db, 'vehicles', id), (doc) => {
            if (doc.exists()) {
                setVehicle({ id: doc.id, ...doc.data() });
            } else {
                navigate('/');
            }
            setLoading(false);
        });
        return unsubscribe;
    }, [id, navigate]);

    if (loading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-[50vh]">
                     <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
            </Layout>
        );
    }

    if (!vehicle) return null;

    return (
        <Layout>
            <div className="space-y-6">
                <Button variant="ghost" onClick={() => navigate('/')} className="pl-0 hover:bg-transparent -ml-2 text-muted-foreground hover:text-foreground group">
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </Button>

                <div className="flex flex-col md:flex-row justify-between items-start gap-4 animate-in slide-in-from-left-2 duration-300">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                            {vehicle.make} {vehicle.model}
                        </h1>
                        <p className="text-muted-foreground flex items-center gap-3 mt-2 text-lg">
                            <span className="flex items-center gap-1.5 bg-surface px-2 py-1 rounded-md border border-border/50 text-sm">
                                <Calendar className="w-3.5 h-3.5" />
                                {vehicle.year}
                            </span>
                            <span className="flex items-center gap-1.5 bg-surface px-2 py-1 rounded-md border border-border/50 text-sm">
                                <Car className="w-3.5 h-3.5" />
                                {vehicle.plateNumber || 'No Plate'}
                            </span>
                        </p>
                    </div>
                    {/* Add edit/delete actions here later */}
                </div>

                <div className="sticky top-20 z-10 bg-background/80 backdrop-blur-md py-2 border-b border-border/50 -mx-4 px-4 md:mx-0 md:px-0 md:bg-transparent md:backdrop-blur-none md:border-none md:static">
                    <div className="flex space-x-1 bg-surface/50 p-1 rounded-xl w-full md:w-fit overflow-x-auto no-scrollbar border border-white/5">
                        {[
                            { id: 'overview', label: 'Overview', icon: Car },
                            { id: 'services', label: 'Service Log', icon: Wrench },
                            { id: 'expenses', label: 'Expenses', icon: DollarSign },
                            { id: 'documents', label: 'Documents', icon: FileText },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                }`}
                            >
                                <tab.icon className="w-4 h-4 mr-2" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="animate-in fade-in zoom-in-95 duration-200 min-h-[400px]">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="p-8 border-primary/10 bg-gradient-to-br from-surface to-surface/50">
                                <h3 className="text-xl font-bold mb-6 flex items-center">
                                    <Car className="w-5 h-5 mr-3 text-primary" />
                                    Vehicle Information
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between py-3 border-b border-dashed border-border/50">
                                        <span className="text-muted-foreground">Make</span>
                                        <span className="font-medium text-lg">{vehicle.make}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-dashed border-border/50">
                                        <span className="text-muted-foreground">Model</span>
                                        <span className="font-medium text-lg">{vehicle.model}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-dashed border-border/50">
                                        <span className="text-muted-foreground">Year</span>
                                        <span className="font-medium text-lg">{vehicle.year}</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-dashed border-border/50">
                                        <span className="text-muted-foreground">Registration Expiry</span>
                                        <span className={`font-medium text-lg ${!vehicle.registrationExpiry ? 'text-muted-foreground' : 'text-foreground'}`}>
                                            {vehicle.registrationExpiry?.toDate().toLocaleDateString() || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </Card>
                            <Card className="p-6 flex items-center justify-center border-dashed border-2 border-border/50 bg-transparent shadow-none group hover:border-primary/30 transition-colors">
                                <div className="text-center text-muted-foreground group-hover:text-primary/70 transition-colors">
                                    <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 border border-border group-hover:border-primary/30 group-hover:scale-110 transition-all duration-300">
                                        <Car className="w-10 h-10 opacity-50" />
                                    </div>
                                    <p className="font-medium">Vehicle photo coming soon...</p>
                                </div>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'services' && <ServiceLog vehicleId={id!} />}
                    {activeTab === 'expenses' && <ExpenseTracker vehicleId={id!} />}
                    {activeTab === 'documents' && (
                        <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-xl">
                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium">Document Storage</h3>
                            <p className="mt-2 text-sm max-w-xs mx-auto">Upload and manage your vehicle documents, insurance papers, and licenses.</p>
                            <Button variant="outline" className="mt-6 cursor-not-allowed opacity-50">Coming Soon</Button>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};
