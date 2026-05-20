import crypto from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';

const ALLOWED_CONTENT_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const ALLOWED_DOCUMENT_TYPES = new Set(['insurance', 'registration', 'inspection', 'tax', 'service', 'ownership', 'warranty', 'maintenance', 'permit', 'taxi_permit', 'contract', 'invoice', 'other']);
const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const DEFAULT_SIGNED_URL_TTL_SECONDS = 300;
const SAFE_ID = /^[A-Za-z0-9_-]{1,160}$/;
const ROLE_RANK = { viewer: 0, driver: 1, manager: 2, admin: 3, owner: 4 };
const RATE_LIMITS = {
  createUploadUrl: { user: 20, ip: 60 },
  finalizeUpload: { user: 20, ip: 60 },
  createDownloadUrl: { user: 90, ip: 180 },
  deleteDocument: { user: 30, ip: 90 },
  deleteVehicleCascade: { user: 8, ip: 20 },
};

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'content-type': 'application/json',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  },
  body: JSON.stringify(body),
});

const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const initializeFirebaseAdmin = () => {
  if (getApps().length > 0) return;

  initializeApp({
    credential: cert({
      projectId: requiredEnv('FIREBASE_PROJECT_ID'),
      clientEmail: requiredEnv('FIREBASE_CLIENT_EMAIL'),
      privateKey: requiredEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    }),
  });
};

const getBearerToken = (event) => {
  const header = event.headers.authorization || event.headers.Authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
  return token;
};

const requireAuth = async (event) => {
  initializeFirebaseAdmin();
  return getAuth().verifyIdToken(getBearerToken(event));
};

const assertPlainObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw Object.assign(new Error('Invalid request body'), { statusCode: 400 });
  }
};

const assertAllowedKeys = (body, allowedKeys) => {
  const allowed = new Set(['action', ...allowedKeys]);
  const unknown = Object.keys(body).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    throw Object.assign(new Error('Request contains unsupported fields'), { statusCode: 400 });
  }
};

const requireSafeString = (body, field, maxLength = 500) => {
  const value = body[field];
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) {
    throw Object.assign(new Error(`Invalid ${field}`), { statusCode: 400 });
  }
  return value.trim();
};

const optionalString = (body, field, maxLength = 500) => {
  const value = body[field];
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > maxLength) {
    throw Object.assign(new Error(`Invalid ${field}`), { statusCode: 400 });
  }
  return value.trim();
};

const requireSafeId = (body, field) => {
  const value = requireSafeString(body, field, 160);
  if (!SAFE_ID.test(value)) {
    throw Object.assign(new Error(`Invalid ${field}`), { statusCode: 400 });
  }
  return value;
};

const requireNumber = (body, field) => {
  const value = Number(body[field]);
  if (!Number.isFinite(value)) {
    throw Object.assign(new Error(`Invalid ${field}`), { statusCode: 400 });
  }
  return value;
};

const requireAllowedContentType = (body) => {
  const contentType = requireSafeString(body, 'contentType', 100);
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw Object.assign(new Error('Only PDF, JPEG, and PNG files are allowed'), { statusCode: 400 });
  }
  return contentType;
};

const getMaxUploadBytes = () => Number(process.env.R2_MAX_UPLOAD_BYTES || DEFAULT_MAX_UPLOAD_BYTES);

const requireUploadSize = (body) => {
  const size = requireNumber(body, 'size');
  const maxUploadBytes = getMaxUploadBytes();
  if (size <= 0 || size > maxUploadBytes) {
    throw Object.assign(new Error(`File exceeds ${maxUploadBytes} byte limit`), { statusCode: 400 });
  }
  return size;
};

const requireDocumentType = (body) => {
  const type = optionalString(body, 'type', 50) || 'other';
  if (!ALLOWED_DOCUMENT_TYPES.has(type)) {
    throw Object.assign(new Error('Invalid document type'), { statusCode: 400 });
  }
  return type;
};

const optionalSafeMetadataString = (body, field, maxLength = 80) => {
  const value = optionalString(body, field, maxLength);
  if (!value) return null;
  if (!/^[\w\s./:-]+$/i.test(value)) {
    throw Object.assign(new Error(`Invalid ${field}`), { statusCode: 400 });
  }
  return value;
};

const parseBody = (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    assertPlainObject(body);
    return body;
  } catch (error) {
    if (error.statusCode) throw error;
    throw Object.assign(new Error('Invalid JSON body'), { statusCode: 400 });
  }
};

const requireOrganizationMember = async (db, uid, organizationId, minimumRole = 'driver') => {
  const memberSnap = await db.collection('organizationMembers').doc(`${organizationId}_${uid}`).get();
  const member = memberSnap.data();
  if (!memberSnap.exists || member?.status !== 'active' || ROLE_RANK[member.role] < ROLE_RANK[minimumRole]) {
    throw Object.assign(new Error('Vehicle not found'), { statusCode: 404 });
  }
  return member;
};

const requireAccessibleVehicle = async (uid, vehicleId, minimumOrganizationRole = 'driver') => {
  const db = getFirestore();
  const vehicleRef = db.collection('vehicles').doc(vehicleId);
  const vehicleSnap = await vehicleRef.get();

  if (!vehicleSnap.exists) {
    throw Object.assign(new Error('Vehicle not found'), { statusCode: 404 });
  }

  const vehicle = vehicleSnap.data();
  if (vehicle?.ownerType === 'organization') {
    const organizationId = vehicle.ownerId || vehicle.organizationId;
    if (!organizationId) throw Object.assign(new Error('Vehicle not found'), { statusCode: 404 });
    const member = await requireOrganizationMember(db, uid, organizationId, minimumOrganizationRole);
    return { db, vehicleRef, vehicle, organizationId, member };
  }

  if (vehicle?.userId !== uid) {
    throw Object.assign(new Error('Vehicle not found'), { statusCode: 404 });
  }

  return { db, vehicleRef, vehicle, organizationId: null, member: null };
};

const getClientIp = (event) => {
  const header = event.headers['x-forwarded-for'] || event.headers['X-Forwarded-For'] || '';
  return String(header).split(',')[0].trim() || event.headers['client-ip'] || 'unknown';
};

const hashValue = (value) => crypto
  .createHmac('sha256', requiredEnv('RATE_LIMIT_HASH_SECRET'))
  .update(String(value), 'utf8')
  .digest('hex')
  .slice(0, 32);

const enforceRateLimitCounter = async ({ scope, key, action, limit }) => {
  const windowMs = 60 * 1000;
  const windowId = Math.floor(Date.now() / windowMs);
  const db = getFirestore();
  const ref = db.collection('rateLimits').doc(`${scope}_${key}_${action}_${windowId}`);

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const current = snap.exists ? Number(snap.data()?.count || 0) : 0;
    if (current >= limit) {
      throw Object.assign(new Error('Too many requests'), { statusCode: 429 });
    }

    transaction.set(ref, {
      scope,
      key,
      action,
      windowId,
      count: current + 1,
      expiresAt: Timestamp.fromMillis((windowId + 2) * windowMs),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
};

const enforceRateLimit = async (uid, event, action) => {
  const limits = RATE_LIMITS[action] || { user: 30, ip: 90 };
  await enforceRateLimitCounter({ scope: 'user', key: hashValue(uid), action, limit: limits.user });
  await enforceRateLimitCounter({ scope: 'ip', key: hashValue(getClientIp(event)), action, limit: limits.ip });
};

const sanitizeFileName = (fileName) => {
  const clean = String(fileName || 'document')
    .replace(/[^\w.\- ]+/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 120);

  return clean || 'document';
};

const encodeRfc3986 = (value) => encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
const encodePath = (path) => path.split('/').map(encodeRfc3986).join('/');
const hmac = (key, value, encoding) => crypto.createHmac('sha256', key).update(value, 'utf8').digest(encoding);
const sha256Hex = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');

const getSigningKey = (secretKey, dateStamp) => {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, 'auto');
  const kService = hmac(kRegion, 's3');
  return hmac(kService, 'aws4_request');
};

const createPresignedR2Url = ({ method, key, expiresSeconds, contentType }) => {
  const endpoint = new URL(requiredEnv('R2_ENDPOINT'));
  const bucket = requiredEnv('R2_BUCKET_NAME');
  const accessKeyId = requiredEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = requiredEnv('R2_SECRET_ACCESS_KEY');

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const canonicalUri = `/${encodePath(`${bucket}/${key}`)}`;
  const signedHeaders = contentType ? 'content-type;host' : 'host';
  const canonicalHeaders = contentType
    ? `content-type:${contentType}\nhost:${endpoint.host}\n`
    : `host:${endpoint.host}\n`;

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresSeconds),
    'X-Amz-SignedHeaders': signedHeaders,
  });

  const canonicalQueryString = [...queryParams.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${encodeRfc3986(name)}=${encodeRfc3986(value)}`)
    .join('&');

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signature = hmac(getSigningKey(secretAccessKey, dateStamp), stringToSign, 'hex');
  queryParams.set('X-Amz-Signature', signature);

  return `${endpoint.origin}${canonicalUri}?${queryParams.toString()}`;
};

const deleteR2Object = async (key) => {
  const deleteUrl = createPresignedR2Url({ method: 'DELETE', key, expiresSeconds: 60 });
  const response = await fetch(deleteUrl, { method: 'DELETE' });
  if (!response.ok && response.status !== 404) {
    throw Object.assign(new Error('Could not delete private file'), { statusCode: 502 });
  }
};

const verifyR2Object = async ({ key, contentType, size }) => {
  const headUrl = createPresignedR2Url({ method: 'HEAD', key, expiresSeconds: 60 });
  const response = await fetch(headUrl, { method: 'HEAD' });

  if (response.status === 404) {
    throw Object.assign(new Error('Uploaded file was not found'), { statusCode: 400 });
  }

  if (!response.ok) {
    throw Object.assign(new Error('Could not verify uploaded file'), { statusCode: 502 });
  }

  const storedSize = Number(response.headers.get('content-length') || size);
  const storedContentType = (response.headers.get('content-type') || contentType).split(';')[0];

  if (Number.isFinite(storedSize) && storedSize !== size) {
    throw Object.assign(new Error('Uploaded file size mismatch'), { statusCode: 400 });
  }

  if (storedContentType && storedContentType !== contentType) {
    throw Object.assign(new Error('Uploaded file type mismatch'), { statusCode: 400 });
  }
};

const createUploadUrl = async (uid, body) => {
  assertAllowedKeys(body, ['vehicleId', 'fileName', 'contentType', 'size']);
  const vehicleId = requireSafeId(body, 'vehicleId');
  const { db, vehicle, organizationId } = await requireAccessibleVehicle(uid, vehicleId, 'driver');
  const fileName = sanitizeFileName(requireSafeString(body, 'fileName', 180));
  const contentType = requireAllowedContentType(body);
  const size = requireUploadSize(body);
  const expiresSeconds = Number(process.env.R2_SIGNED_URL_TTL_SECONDS || DEFAULT_SIGNED_URL_TTL_SECONDS);

  const documentRef = db.collection('vehicles').doc(vehicleId).collection('documents').doc();
  const key = vehicle?.ownerType === 'organization'
    ? `organizations/${organizationId}/vehicles/${vehicleId}/documents/${documentRef.id}/${fileName}`
    : `users/${uid}/vehicles/${vehicleId}/documents/${documentRef.id}/${fileName}`;

  return {
    documentId: documentRef.id,
    key,
    uploadUrl: createPresignedR2Url({
      method: 'PUT',
      key,
      expiresSeconds,
      contentType,
    }),
    expiresIn: expiresSeconds,
  };
};

const finalizeUpload = async (uid, body) => {
  assertAllowedKeys(body, ['vehicleId', 'documentId', 'key', 'name', 'type', 'contentType', 'size', 'issueDate', 'expiryDate', 'cost', 'plateNumber', 'vin', 'referenceNumber', 'ocrAssisted']);
  const vehicleId = requireSafeId(body, 'vehicleId');
  const documentId = requireSafeId(body, 'documentId');
  const key = requireSafeString(body, 'key', 700);
  const { db, vehicle, organizationId } = await requireAccessibleVehicle(uid, vehicleId, 'driver');
  const expectedPrefix = vehicle?.ownerType === 'organization'
    ? `organizations/${organizationId}/vehicles/${vehicleId}/documents/${documentId}/`
    : `users/${uid}/vehicles/${vehicleId}/documents/${documentId}/`;

  if (!key.startsWith(expectedPrefix)) {
    throw Object.assign(new Error('Invalid document upload key'), { statusCode: 400 });
  }

  const contentType = requireAllowedContentType(body);
  const size = requireUploadSize(body);
  const cost = body.cost === undefined || body.cost === null || body.cost === '' ? 0 : Number(body.cost);
  const type = requireDocumentType(body);
  const name = sanitizeFileName(requireSafeString(body, 'name', 180));
  const issueDate = optionalString(body, 'issueDate', 40);
  const expiryDate = optionalString(body, 'expiryDate', 40);
  const plateNumber = optionalSafeMetadataString(body, 'plateNumber', 30);
  const vin = optionalSafeMetadataString(body, 'vin', 30);
  const referenceNumber = optionalSafeMetadataString(body, 'referenceNumber', 80);
  const ocrAssisted = body.ocrAssisted === undefined || body.ocrAssisted === null ? false : body.ocrAssisted;

  if (typeof ocrAssisted !== 'boolean') {
    throw Object.assign(new Error('Invalid ocrAssisted'), { statusCode: 400 });
  }

  if (!Number.isFinite(cost) || cost < 0 || cost > 1000000) {
    throw Object.assign(new Error('Invalid document cost'), { statusCode: 400 });
  }

  await verifyR2Object({ key, contentType, size });

  const documentRef = db.collection('vehicles').doc(vehicleId).collection('documents').doc(documentId);
  const batch = db.batch();
  let expenseId = null;

  if (cost > 0) {
    const expenseRef = db.collection('vehicles').doc(vehicleId).collection('expenses').doc();
    expenseId = expenseRef.id;
    batch.set(expenseRef, {
      userId: uid,
      ownerType: vehicle?.ownerType || 'personal',
      ownerId: vehicle?.ownerType === 'organization' ? organizationId : uid,
      organizationId: organizationId || null,
      vehicleId,
      category: type === 'insurance' ? 'Insurance' : type === 'tax' ? 'Tax' : type === 'service' ? 'Maintenance' : 'Document',
      amount: cost,
      date: Timestamp.now(),
      notes: `Document: ${name}`,
      sourceType: 'document',
      sourceId: documentId,
      sourceLabel: name,
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  batch.set(documentRef, {
    userId: uid,
    ownerType: vehicle?.ownerType || 'personal',
    ownerId: vehicle?.ownerType === 'organization' ? organizationId : uid,
    organizationId: organizationId || null,
    createdBy: uid,
    vehicleId,
    name,
    type,
    path: key,
    storageProvider: 'r2',
    contentType,
    size,
    issueDate,
    expiryDate,
    plateNumber,
    vin,
    referenceNumber,
    ocrAssisted,
    cost: cost > 0 ? cost : 0,
    expenseId,
    uploadedAt: FieldValue.serverTimestamp(),
  });

  if (expiryDate) {
    const dueDate = new Date(expiryDate);
    if (!Number.isNaN(dueDate.getTime())) {
      const reminderRef = db.collection('reminders').doc();
      batch.set(reminderRef, {
        userId: uid,
        ownerType: vehicle?.ownerType || 'personal',
        ownerId: vehicle?.ownerType === 'organization' ? organizationId : uid,
        organizationId: organizationId || null,
        createdBy: uid,
        vehicleId,
        title: `${name} renewal`,
        type,
        dueDate: Timestamp.fromDate(dueDate),
        leadTimeDays: 14,
        recurrence: type === 'insurance' || type === 'tax' || type === 'inspection' || type === 'registration' ? 'yearly' : 'none',
        completed: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  }

  try {
    await batch.commit();
  } catch {
    await deleteR2Object(key).catch(() => undefined);
    throw Object.assign(new Error('Could not finalize upload'), { statusCode: 500 });
  }

  return { documentId, expenseId };
};

const createDownloadUrl = async (uid, body) => {
  assertAllowedKeys(body, ['vehicleId', 'documentId']);
  const vehicleId = requireSafeId(body, 'vehicleId');
  const documentId = requireSafeId(body, 'documentId');
  const { db, vehicle } = await requireAccessibleVehicle(uid, vehicleId, 'driver');
  const documentSnap = await db.collection('vehicles').doc(vehicleId).collection('documents').doc(documentId).get();

  if (!documentSnap.exists) {
    throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  }

  const data = documentSnap.data();
  if (vehicle?.ownerType !== 'organization' && data?.userId && data.userId !== uid) {
    throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  }

  const expiresSeconds = Number(process.env.R2_SIGNED_URL_TTL_SECONDS || DEFAULT_SIGNED_URL_TTL_SECONDS);
  return {
    downloadUrl: createPresignedR2Url({
      method: 'GET',
      key: data.path,
      expiresSeconds,
    }),
    expiresIn: expiresSeconds,
  };
};

const deleteDocument = async (uid, body) => {
  assertAllowedKeys(body, ['vehicleId', 'documentId']);
  const vehicleId = requireSafeId(body, 'vehicleId');
  const documentId = requireSafeId(body, 'documentId');
  const { db, vehicle } = await requireAccessibleVehicle(uid, vehicleId, 'manager');
  const documentRef = db.collection('vehicles').doc(vehicleId).collection('documents').doc(documentId);
  const documentSnap = await documentRef.get();

  if (!documentSnap.exists) {
    return { deleted: true };
  }

  const data = documentSnap.data();
  if (vehicle?.ownerType !== 'organization' && data?.userId && data.userId !== uid) {
    throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  }

  if (data?.path) {
    await deleteR2Object(data.path);
  }

  const batch = db.batch();
  batch.delete(documentRef);
  if (data?.expenseId) {
    batch.delete(db.collection('vehicles').doc(vehicleId).collection('expenses').doc(data.expenseId));
  }
  await batch.commit();

  return { deleted: true };
};

const deleteVehicleCascade = async (uid, body) => {
  assertAllowedKeys(body, ['vehicleId']);
  const vehicleId = requireSafeId(body, 'vehicleId');
  const { db, vehicleRef, vehicle, organizationId } = await requireAccessibleVehicle(uid, vehicleId, 'manager');
  const vehiclePath = db.collection('vehicles').doc(vehicleId);

  const reminderQuery = vehicle?.ownerType === 'organization'
    ? db.collection('reminders').where('ownerType', '==', 'organization').where('ownerId', '==', organizationId).where('vehicleId', '==', vehicleId)
    : db.collection('reminders').where('userId', '==', uid).where('vehicleId', '==', vehicleId);

  const [services, expenses, documents, reminders, inspections, issues, workOrders] = await Promise.all([
    vehiclePath.collection('services').get(),
    vehiclePath.collection('expenses').get(),
    vehiclePath.collection('documents').get(),
    reminderQuery.get(),
    vehiclePath.collection('inspections').get(),
    vehiclePath.collection('issues').get(),
    vehiclePath.collection('workOrders').get(),
  ]);

  for (const documentSnap of documents.docs) {
    const path = documentSnap.data()?.path;
    if (path) {
      await deleteR2Object(path);
    }
  }

  let batch = db.batch();
  let count = 0;
  const queueDelete = async (ref) => {
    batch.delete(ref);
    count += 1;
    if (count >= 450) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  };

  for (const snap of services.docs) await queueDelete(snap.ref);
  for (const snap of expenses.docs) await queueDelete(snap.ref);
  for (const snap of documents.docs) await queueDelete(snap.ref);
  for (const snap of reminders.docs) await queueDelete(snap.ref);
  for (const snap of inspections.docs) await queueDelete(snap.ref);
  for (const snap of issues.docs) await queueDelete(snap.ref);
  for (const snap of workOrders.docs) await queueDelete(snap.ref);
  await queueDelete(vehicleRef);

  if (count > 0) {
    await batch.commit();
  }

  return { deleted: true };
};

const handlers = {
  createUploadUrl,
  finalizeUpload,
  createDownloadUrl,
  deleteDocument,
  deleteVehicleCascade,
};

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const eventId = crypto.randomUUID();

  try {
    const decodedToken = await requireAuth(event);
    const body = parseBody(event);
    const action = String(body.action || '');
    const actionHandler = handlers[action];

    if (!actionHandler) {
      return json(400, { error: 'Unknown action', eventId });
    }

    await enforceRateLimit(decodedToken.uid, event, action);
    return json(200, await actionHandler(decodedToken.uid, body));
  } catch (error) {
    const statusCode = error.statusCode || 500;
    console.error('R2 document function failed', {
      eventId,
      statusCode,
      message: statusCode === 500 ? 'internal-error' : error.message,
    });

    return json(statusCode, {
      error: statusCode === 500 ? 'Unexpected server error' : error.message,
      eventId,
    });
  }
};
