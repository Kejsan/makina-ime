import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { WorkspaceProvider } from '../context/WorkspaceContext';

const AuthenticatedRouteContent = ({ children, requireUser }: { children: ReactNode; requireUser: boolean }) => {
    const { user } = useAuth();
    if (requireUser && !user) return <Navigate to="/auth" replace />;
    return <>{children}</>;
};

export const AuthenticatedRoute = ({ children, requireUser = false }: { children: ReactNode; requireUser?: boolean }) => (
    <AuthProvider>
        <WorkspaceProvider>
            <AuthenticatedRouteContent requireUser={requireUser}>{children}</AuthenticatedRouteContent>
        </WorkspaceProvider>
    </AuthProvider>
);
