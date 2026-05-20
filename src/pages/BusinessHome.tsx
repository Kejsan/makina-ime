import { useEffect, useState } from 'react';
import type React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Check, ExternalLink, Plus, Users } from 'lucide-react';
import {
    collection,
    doc,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
    writeBatch,
} from 'firebase/firestore';
import { Layout } from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AppSurface, EmptyState, PageHeader, Panel, StatusPill } from '../components/ui/design-system';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import type { Organization, OrganizationInvite, OrganizationMember } from '../lib/types';

export const BusinessHome = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [memberships, setMemberships] = useState<OrganizationMember[]>([]);
    const [organizations, setOrganizations] = useState<Record<string, Organization>>({});
    const [invites, setInvites] = useState<OrganizationInvite[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [name, setName] = useState('');
    const [businessType, setBusinessType] = useState('mixed_fleet');
    const [city, setCity] = useState('');
    const [currency, setCurrency] = useState<'EUR' | 'ALL'>('EUR');

    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'organizationMembers'),
            where('userId', '==', user.uid),
            where('status', '==', 'active')
        );
        return onSnapshot(q, (snapshot) => {
            setMemberships(snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() } as OrganizationMember)));
        });
    }, [user]);

    useEffect(() => {
        if (!user?.email) return;
        const q = query(
            collection(db, 'organizationInvites'),
            where('email', '==', user.email.toLowerCase()),
            where('status', '==', 'pending')
        );
        return onSnapshot(q, (snapshot) => {
            setInvites(snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() } as OrganizationInvite)));
        });
    }, [user?.email]);

    useEffect(() => {
        if (memberships.length === 0) {
            return;
        }

        const unsubscribes = memberships.map((membership) => onSnapshot(doc(db, 'organizations', membership.organizationId), (snapshot) => {
            if (!snapshot.exists()) return;
            setOrganizations((previous) => ({
                ...previous,
                [membership.organizationId]: { id: snapshot.id, ...snapshot.data() } as Organization,
            }));
        }));

        return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
    }, [memberships]);

    const createOrganization = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!user) return;

        const orgRef = doc(collection(db, 'organizations'));
        const memberRef = doc(db, 'organizationMembers', `${orgRef.id}_${user.uid}`);
        const settingsRef = doc(db, 'organizations', orgRef.id, 'businessSettings', 'default');
        const batch = writeBatch(db);

        batch.set(orgRef, {
            name: name.trim(),
            businessType,
            city: city.trim() || null,
            country: 'Albania',
            defaultCurrency: currency,
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        batch.set(memberRef, {
            organizationId: orgRef.id,
            userId: user.uid,
            email: user.email?.toLowerCase() || '',
            displayName: user.displayName || null,
            role: 'owner',
            status: 'active',
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        batch.set(settingsRef, {
            defaultReminderLeadTimeDays: 30,
            inspectionFailureCreatesWorkOrder: true,
            preferredCurrency: currency,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        await batch.commit();
        setName('');
        setCity('');
        setBusinessType('mixed_fleet');
        setCurrency('EUR');
        setIsCreating(false);
        navigate(`/business/${orgRef.id}`);
    };

    const acceptInvite = async (invite: OrganizationInvite) => {
        if (!user) return;

        const memberRef = doc(db, 'organizationMembers', `${invite.organizationId}_${user.uid}`);
        await setDoc(memberRef, {
            organizationId: invite.organizationId,
            userId: user.uid,
            email: user.email?.toLowerCase() || invite.email,
            displayName: user.displayName || null,
            role: invite.role,
            status: 'active',
            createdBy: invite.createdBy,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        await updateDoc(doc(db, 'organizationInvites', invite.id), {
            status: 'accepted',
            acceptedAt: serverTimestamp(),
            acceptedBy: user.uid,
        });

        navigate(`/business/${invite.organizationId}`);
    };

    return (
        <Layout>
            <div className="space-y-7">
                <PageHeader
                    eyebrow="Business workspaces"
                    title="Fleet organizations"
                    description="Create or join a shared workspace for company cars, taxi fleets, rentals, service vans, or dealership stock."
                    actions={
                        <Button onClick={() => setIsCreating(true)} className="h-11 rounded-xl">
                            <Plus className="mr-2 h-4 w-4" />
                            Create business
                        </Button>
                    }
                />

                {invites.length > 0 && (
                    <AppSurface className="p-5">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="rounded-xl bg-primary/10 p-2 text-primary">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="font-bold">Pending invitations</h2>
                                <p className="text-xs text-muted-foreground">Invites matched to {user?.email}.</p>
                            </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            {invites.map((invite) => (
                                <Panel key={invite.id} className="flex items-center justify-between gap-3 p-4">
                                    <div>
                                        <p className="font-semibold">{invite.organizationName}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">Role: {invite.role}</p>
                                    </div>
                                    <Button size="sm" onClick={() => acceptInvite(invite)}>
                                        <Check className="mr-2 h-4 w-4" />
                                        Accept
                                    </Button>
                                </Panel>
                            ))}
                        </div>
                    </AppSurface>
                )}

                {isCreating && (
                    <AppSurface className="p-6">
                        <form onSubmit={createOrganization} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <Input label="Business name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Makina Ime Fleet" required />
                                <div className="space-y-2">
                                    <label className="mi-label">Business type</label>
                                    <select className="mi-field" value={businessType} onChange={(event) => setBusinessType(event.target.value)}>
                                        <option value="mixed_fleet">Mixed fleet</option>
                                        <option value="taxi">Taxi fleet</option>
                                        <option value="rental">Rental fleet</option>
                                        <option value="dealer">Car seller / stock</option>
                                        <option value="service">Service vehicles</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <Input label="City" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Tirana" />
                                <div className="space-y-2">
                                    <label className="mi-label">Default currency</label>
                                    <select className="mi-field" value={currency} onChange={(event) => setCurrency(event.target.value as 'EUR' | 'ALL')}>
                                        <option value="EUR">EUR</option>
                                        <option value="ALL">ALL</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Button type="submit" className="h-11 flex-1">Create workspace</Button>
                                <Button type="button" variant="outline" className="h-11" onClick={() => setIsCreating(false)}>Cancel</Button>
                            </div>
                        </form>
                    </AppSurface>
                )}

                {memberships.length === 0 ? (
                    <EmptyState
                        icon={Building2}
                        title="No business workspace yet"
                        description="Create one for your company, or accept an invitation when another admin adds you."
                        action={<Button onClick={() => setIsCreating(true)}>Create business</Button>}
                    />
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {memberships.map((membership) => {
                            const organization = organizations[membership.organizationId];
                            return (
                                <Link key={membership.id} to={`/business/${membership.organizationId}`}>
                                    <AppSurface className="h-full p-5 transition-all hover:-translate-y-0.5 hover:border-primary/50">
                                        <div className="mb-5 flex items-start justify-between gap-3">
                                            <div className="rounded-xl bg-primary/10 p-3 text-primary">
                                                <Building2 className="h-6 w-6" />
                                            </div>
                                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <h2 className="text-lg font-bold">{organization?.name || 'Business workspace'}</h2>
                                        <p className="mt-2 text-sm text-muted-foreground">{organization?.city || 'Organization fleet workspace'}</p>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <StatusPill tone="blue">{membership.role}</StatusPill>
                                            <StatusPill tone="emerald">{organization?.defaultCurrency || 'EUR'}</StatusPill>
                                        </div>
                                    </AppSurface>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </Layout>
    );
};
