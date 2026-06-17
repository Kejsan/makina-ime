import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(rootDir, 'src');
const localeDir = path.join(rootDir, 'public', 'locales');

const sourceExtensions = new Set(['.ts', '.tsx']);
const ignoredAttributeNames = new Set([
  'className', 'to', 'href', 'src', 'id', 'htmlFor', 'type', 'name', 'value', 'min', 'max', 'step',
  'target', 'rel', 'path', 'robots', 'variant', 'size', 'tone', 'key', 'role', 'method', 'action',
  'autoComplete', 'inputMode', 'pattern', 'accept', 'width', 'height',
]);

const technicalPropertyNames = new Set([
  'ownerType', 'sourceType', 'status', 'role', 'category', 'vehicleType', 'businessType', 'businessStatus',
  'recurrence', 'preferredCurrency', 'storageProvider', 'storagePath', 'contentType', 'documentType',
  'type', 'path', 'href', 'to', 'id', 'uid', 'email', 'password', 'mode', 'query', 'collection',
  'field', 'operator', 'currency', 'locale', 'robots', 'display', 'theme_color', 'background_color',
]);

const technicalCallNames = new Set([
  'collection', 'doc', 'where', 'orderBy', 'query', 'localStorage.getItem', 'localStorage.setItem',
  'sessionStorage.getItem', 'sessionStorage.setItem', 'startsWith', 'includes', 'match', 'split',
  'join', 'replace', 'toLocaleDateString', 'setSearchParams', 'navigate',
]);

const technicalExactValues = new Set([
  '_blank', 'a', 'active', 'added', 'admin', 'all', 'alt', 'amber', 'appinstalled', 'application-name',
  '(display-mode: standalone)', '(max-width: 767px)', '&copy;', '% OCR', '% scan confidence', '2d',
  'AA 000 XX', 'Answer', 'Audience', 'BreadcrumbList', 'BusinessApplication', 'FAQPage',
  'LifestyleApplication', 'ListItem', 'Offer', 'Organization', 'Question', 'Requires a modern web browser with JavaScript enabled',
  'Web, iOS, Android', 'WebApplication', 'WebPage', 'WebSite',
  'archived', 'aria-label', 'assignedDriverName', 'assignment', 'attributes', 'auth', 'auto',
  'biennial', 'blue', 'browserNotificationsEnabled', 'business', 'businessStatus', 'Button',
  'cancelled', 'canonical', 'canvas', 'car', 'Card', 'characterData', 'checked', 'completed',
  'contract', 'cookies', 'cost', 'createDownloadUrl', 'createUploadUrl', 'critical', 'currency',
  'currentMileage', 'dark', 'de', 'de_DE', 'default', 'defaultReminderLeadTimeDays', 'deleteDocument',
  'deleteVehicleCascade', 'denied', 'department', 'description', 'destructive', 'document',
  'documentType', 'editing', 'email', 'en', 'en_US', 'emerald', 'error', 'es', 'es_ES', 'event',
  'false', 'firebase', 'friday', 'ghost', 'green', 'hidden', 'href', 'id', 'indigo', 'insurance',
  'it', 'it_IT', 'large', 'light', 'locale', 'login', 'manager', 'manual', 'maintenance',
  'monthly', 'none', 'notification', 'open', 'owner', 'pending', 'personal', 'primary', 'privacy',
  'public', 'registration', 'reminders', 'resolved', 'robots', 'root', 'rose', 'scheduled',
  'script', 'secondary', 'service', 'services', 'signin', 'signup', 'slate', 'sm', 'sold',
  'sq', 'sq_AL', 'standalone', 'start', 'str', 'string', 'tax', 'terms', 'text', 'title',
  'true', 'type', 'undefined', 'vehicle', 'vehicleType', 'viewer', 'vin', 'warranty', 'website',
  'workOrders', 'year', 'yearly',
  'Brevo', 'Cloud Firestore', 'Cloudflare R2', 'Deutsch', 'English', 'Español', 'Firebase Auth',
  'Firebase Authentication', 'Italiano', 'Makina Ime', 'Makina Ime App', 'Makina Ime Fleet',
  'Makina Ime Vehicle Management', 'Netlify', 'Notification', 'Shqip', 'Volkswagen', 'Polo',
  'infomakinaime@gmail.com', 'name@example.com', 'Europe/Tirane', 'Europe/Rome', 'Europe/London', 'UTC',
  'certifikate regjistrimi', 'eng', 'fature', 'garanci', 'kolaudim', 'kontrate', 'kontroll teknik',
  'leje qarkullimi', 'polica', 'police sigurimi', 'pronesi', 'regjistrim', 'road tax',
  'servis', 'siguracion', 'taksa', 'takse', 'technical inspection', 'tpl',
  'dismissed', 'emailReminderEnabled', 'en-US', 'expiryDate', 'finalizeUpload', 'function',
  'googlebot', 'granted', 'icon', 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1',
  'Input', 'invoice', 'issueDate', 'km', 'language', 'languageChanged', 'lg', 'link', 'linked',
  'list', 'make', 'makina-ime-theme', 'makina-ime:quick-add', 'meta', 'metadata-only',
  'mixed_fleet', 'mode', 'model', 'month', 'more', 'name', 'noopeneer,noreferrer', 'noopener,noreferrer',
  'number', 'object', 'ocr', 'organization', 'other', 'outline', 'overview', 'ownership', 'p-4',
  'p-5', 'page', 'password', 'pattern', 'pdf-text', 'pdfjs-dist/build/pdf.worker.mjs',
  'permit', 'placeholder', 'plateNumber', 'property', 'r2', 'R2 document request failed',
  'referenceNumber', 's', 'taxi_permit', 'theme-light', 'timezone', 'tinted_glass', 'tinted-glass',
  'useTheme must be used within ThemeProvider',
  'border border-border bg-card/60 text-muted-foreground hover:text-foreground',
  'border border-primary/20 bg-primary/10 font-bold text-primary shadow-sm',
  'mi-field file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50',
  'mi-panel', 'mi-surface',
]);

const technicalPatterns = [
  /^(\.{1,2}\/|\/|#|https?:|mailto:|data:|[a-z]+\/)/i,
  /^[A-Z0-9_]+$/,
  /^(bg|text|border|rounded|flex|grid|inline|hidden|block|w|h|min|max|px|py|pt|pb|mt|mb|ml|mr|gap|space|shadow|ring|focus|hover|dark|sm|md|lg|xl|z|top|left|right|bottom|absolute|relative|sticky|fixed)-/,
  /\[[^\]]+\]/,
  /^script\[/,
  /^data-/,
  /^twitter:/,
  /^og:/,
];

const isTextLike = (value) => /[A-Za-zÀ-ž]/.test(value);
const normalizeText = (value) => value.replace(/\s+/g, ' ').trim();
const looksTechnical = (value) => {
  const trimmed = value.trim();
  if (!trimmed || !isTextLike(trimmed)) return true;
  if (technicalExactValues.has(trimmed)) return true;
  if (technicalPatterns.some((pattern) => pattern.test(trimmed))) return true;
  if (/^[a-z0-9_-]+$/.test(trimmed) && trimmed.length > 18) return true;
  if (/^[.#]?[a-z0-9_-]+(\s+[.#]?[a-z0-9_-]+)+$/i.test(trimmed) && /-/.test(trimmed)) return true;
  return false;
};

const files = [];
const walk = async (dir) => {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
    } else if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
};

const getPropName = (name) => {
  if (!name) return '';
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return '';
};

const getCallName = (expression) => {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return `${getCallName(expression.expression)}.${expression.name.text}`;
  return '';
};

const shouldCollectString = (node) => {
  const value = normalizeText(node.text);
  if (looksTechnical(value)) return false;

  const parent = node.parent;
  if (!parent) return false;
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) return false;
  if (ts.isExternalModuleReference(parent)) return false;

  if (ts.isJsxAttribute(parent)) {
    return !ignoredAttributeNames.has(parent.name.text);
  }

  if (ts.isPropertyAssignment(parent) && parent.name === node) return false;
  if (ts.isPropertyAssignment(parent) && technicalPropertyNames.has(getPropName(parent.name))) return false;

  if (ts.isCallExpression(parent)) {
    const callName = getCallName(parent.expression);
    if (technicalCallNames.has(callName)) return false;
    if (callName === 'console.error' || callName === 'console.warn' || callName === 'console.log') return false;
  }

  if (ts.isLiteralTypeNode(parent)) return false;
  if (ts.isCaseClause(parent)) return false;

  return true;
};

await walk(srcDir);

const found = new Map();
const add = (text, file) => {
  const key = normalizeText(text);
  if (looksTechnical(key)) return;
  const records = found.get(key) || new Set();
  records.add(path.relative(rootDir, file));
  found.set(key, records);
};

for (const file of files) {
  const source = await readFile(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

  const visit = (node) => {
    if (ts.isJsxText(node)) add(node.getText(sf).replace(/[{}]/g, ''), file);
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && shouldCollectString(node)) add(node.text, file);
    ts.forEachChild(node, visit);
  };

  visit(sf);
}

const en = JSON.parse(await readFile(path.join(localeDir, 'en', 'translation.json'), 'utf8'));
const sq = JSON.parse(await readFile(path.join(localeDir, 'sq', 'translation.json'), 'utf8'));

const missingEn = [];
const missingSq = [];
for (const [key, filesForKey] of [...found.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const item = { key, files: [...filesForKey].sort() };
  if (!(key in en)) missingEn.push(item);
  if (!(key in sq)) missingSq.push(item);
}

console.log(JSON.stringify({
  extracted: found.size,
  missingEn,
  missingSq,
}, null, 2));
