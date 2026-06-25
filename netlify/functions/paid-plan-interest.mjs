import { createHash } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const accountTypes = new Set(['business', 'personal', 'both']);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const cleanString = (value, maxLength) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
};

const normalizeString = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
};

const clientIpHash = (headers) => {
  const ip = headers['x-nf-client-connection-ip'] || headers['client-ip'] || headers['x-forwarded-for'] || '';
  if (!ip) return null;
  return createHash('sha256').update(`${ip}:${process.env.INTEREST_IP_HASH_SALT || 'makina-ime'}`).digest('hex');
};

const validatePayload = (payload) => {
  const rawName = normalizeString(payload.name);
  const rawEmail = normalizeString(payload.email);
  const rawAccountType = normalizeString(payload.accountType);
  const rawMessage = normalizeString(payload.message);
  const name = rawName.slice(0, 120);
  const email = rawEmail.slice(0, 254).toLowerCase();
  const accountType = rawAccountType.slice(0, 20);
  const message = rawMessage.slice(0, 1000);
  const sourcePath = cleanString(payload.sourcePath, 500);
  const metadata = payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {};
  const errors = {};

  if (name.length > 0 && name.length < 2) errors.name = 'Enter at least 2 characters.';
  if (rawName.length > 120) errors.name = 'Keep the name under 120 characters.';
  if (!emailPattern.test(email)) errors.email = 'Enter a valid email address.';
  if (rawEmail.length > 254) errors.email = 'Keep the email under 254 characters.';
  if (!accountTypes.has(accountType)) errors.accountType = 'Choose a valid account type.';
  if (rawMessage.length > 1000) errors.message = 'Keep the message under 1000 characters.';
  if (payload.accepted !== true) errors.accepted = 'Consent is required before saving this request.';
  if (cleanString(payload.companyWebsite, 200)) errors.form = 'Unable to save this request.';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: {
      name,
      email,
      accountType,
      message,
      sourcePath,
      metadata: {
        referrer: cleanString(metadata.referrer, 500),
        language: cleanString(metadata.language, 80),
        timezone: cleanString(metadata.timezone, 80),
        viewport: cleanString(metadata.viewport, 40),
        displayMode: cleanString(metadata.displayMode, 40),
        installedPwa: metadata.installedPwa === true,
      },
    },
  };
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!event.body || event.body.length > 12000) return json(400, { error: 'Invalid request body' });

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const result = validatePayload(payload);
  if (!result.valid) return json(400, { error: 'Validation failed', errors: result.errors });

  try {
    initializeFirebaseAdmin();
    const db = getFirestore();
    const requestRef = await db.collection('paidPlanInterestRequests').add({
      ...result.data,
      status: 'new',
      source: 'public-interest-form',
      consentToContact: true,
      followUp: {
        needed: true,
        completedAt: null,
        notes: '',
      },
      delivery: {
        confirmationEmail: 'not_configured',
      },
      request: {
        host: cleanString(event.headers.host, 200),
        userAgent: cleanString(event.headers['user-agent'], 500),
        acceptLanguage: cleanString(event.headers['accept-language'], 200),
        ipHash: clientIpHash(event.headers),
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return json(200, { ok: true, requestId: requestRef.id });
  } catch {
    console.error('Paid plan interest submission failed');
    return json(500, { error: 'Submission failed' });
  }
};
