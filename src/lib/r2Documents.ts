import type { User } from 'firebase/auth';

type R2DocumentAction =
    | 'createUploadUrl'
    | 'finalizeUpload'
    | 'createDownloadUrl'
    | 'deleteDocument'
    | 'deleteVehicleCascade';

export const callR2DocumentFunction = async <TResponse>(
    user: User,
    action: R2DocumentAction,
    payload: Record<string, unknown>
): Promise<TResponse> => {
    const token = await user.getIdToken();
    const response = await fetch('/.netlify/functions/r2-document', {
        method: 'POST',
        headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
        },
        body: JSON.stringify({ action, ...payload }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || 'R2 document request failed');
    }

    return data as TResponse;
};
