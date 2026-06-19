import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import type { OrganizationMember, WorkspaceCapabilities, WorkspaceType } from '../lib/types';

const personalCapabilities: WorkspaceCapabilities = {
    canView: true,
    canCreateOperationalRecords: true,
    canEditOwnRecords: true,
    canEditAllRecords: true,
    canManageMembers: false,
    canManageOrganization: false,
};

const emptyCapabilities: WorkspaceCapabilities = {
    canView: false,
    canCreateOperationalRecords: false,
    canEditOwnRecords: false,
    canEditAllRecords: false,
    canManageMembers: false,
    canManageOrganization: false,
};

const capabilitiesForMember = (member: OrganizationMember | null): WorkspaceCapabilities => {
    if (!member || member.status !== 'active') return emptyCapabilities;
    const operational = ['owner', 'admin', 'manager', 'driver'].includes(member.role);
    const manager = ['owner', 'admin', 'manager'].includes(member.role);
    const admin = ['owner', 'admin'].includes(member.role);
    return {
        canView: true,
        canCreateOperationalRecords: operational,
        canEditOwnRecords: operational,
        canEditAllRecords: manager,
        canManageMembers: admin,
        canManageOrganization: admin,
    };
};

interface WorkspaceContextValue {
    workspaceType: WorkspaceType;
    organizationId: string | null;
    member: OrganizationMember | null;
    capabilities: WorkspaceCapabilities;
    hasUnsavedChanges: boolean;
    setHasUnsavedChanges: (value: boolean) => void;
    switchWorkspace: (type: WorkspaceType, organizationId?: string | null) => Promise<boolean>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [loadedMember, setLoadedMember] = useState<OrganizationMember | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const accountParams = new URLSearchParams(location.search);
    const businessMatch = location.pathname.match(/^\/business\/([^/]+)/);
    const workspaceType: WorkspaceType = location.pathname.startsWith('/business') || (location.pathname === '/account' && accountParams.get('workspace') === 'business') ? 'business' : 'personal';
    const organizationId = businessMatch?.[1] || (workspaceType === 'business' ? accountParams.get('org') : null);

    useEffect(() => {
        if (!user || !organizationId) return;
        return onSnapshot(doc(db, 'organizationMembers', `${organizationId}_${user.uid}`), (snapshot) => {
            setLoadedMember(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as OrganizationMember : null);
        }, () => setLoadedMember(null));
    }, [organizationId, user]);

    useEffect(() => {
        if (!user || (!location.pathname.startsWith('/personal') && !location.pathname.startsWith('/business'))) return;
        if (workspaceType === 'business' && (!organizationId || loadedMember?.organizationId !== organizationId || loadedMember.status !== 'active')) return;
        void setDoc(doc(db, 'users', user.uid), {
            lastWorkspaceType: workspaceType,
            lastOrganizationId: workspaceType === 'business' ? organizationId : null,
            workspacePreferenceUpdatedAt: serverTimestamp(),
        }, { merge: true });
    }, [loadedMember, location.pathname, organizationId, user, workspaceType]);

    const switchWorkspace = useCallback(async (type: WorkspaceType, nextOrganizationId?: string | null) => {
        if (hasUnsavedChanges && !window.confirm('Discard unsaved changes and switch workspace?')) return false;
        setHasUnsavedChanges(false);
        if (type === 'personal') navigate('/personal');
        else navigate(nextOrganizationId ? `/business/${nextOrganizationId}` : '/business');
        return true;
    }, [hasUnsavedChanges, navigate]);

    const member = user && organizationId && loadedMember?.organizationId === organizationId ? loadedMember : null;
    const value = useMemo<WorkspaceContextValue>(() => ({
        workspaceType,
        organizationId,
        member,
        capabilities: workspaceType === 'personal' ? personalCapabilities : capabilitiesForMember(member),
        hasUnsavedChanges,
        setHasUnsavedChanges,
        switchWorkspace,
    }), [hasUnsavedChanges, member, organizationId, switchWorkspace, workspaceType]);

    return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export const useWorkspace = () => {
    const context = useContext(WorkspaceContext);
    if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider');
    return context;
};

export const useOptionalWorkspace = () => useContext(WorkspaceContext);
