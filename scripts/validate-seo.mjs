import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');
const siteUrl = 'https://makinaime.dpdns.org';

const indexablePages = [
  {
    path: '/',
    title: 'Makina Ime Personal Garage | Free vehicle documents, reminders, and expenses',
    description: 'Makina Ime Personal Garage is a free vehicle management app for private car owners. Track documents, renewal reminders, service history, and expenses from one dashboard.',
  },
  {
    path: '/business-fleet',
    title: 'Makina Ime Business Fleet | Free fleet records, compliance, and expense tracking',
    description: 'Makina Ime Business Fleet is a free fleet management workspace for businesses. Track vehicles, documents, reminders, inspections, work orders, team roles, and expenses.',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy | Makina Ime',
    description: 'Read the Makina Ime Privacy Policy for personal vehicle and business fleet records, document metadata, reminders, account data, exports, and deletion requests.',
  },
  {
    path: '/terms',
    title: 'Terms and Conditions | Makina Ime',
    description: 'Read the Makina Ime Terms and Conditions for personal vehicle accounts, business fleet workspaces, shared records, files, reminders, and service availability.',
  },
  {
    path: '/cookies',
    title: 'Cookie Policy | Makina Ime',
    description: 'Read the Makina Ime Cookie Policy covering necessary browser storage, preferences, PWA behavior, analytics, and cookie controls.',
  },
];

const authPage = {
  path: '/auth',
  title: 'Sign in or create an account | Makina Ime',
  description: 'Sign in to Makina Ime or create a free personal vehicle garage or business fleet workspace account.',
};

const failures = [];

const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const absoluteUrl = (urlPath) => new URL(urlPath, siteUrl).toString();

const readIfExists = async (filePath) => {
  try {
    await access(filePath);
    return readFile(filePath, 'utf8');
  } catch {
    failures.push(`Missing file: ${filePath}`);
    return '';
  }
};

const routeHtmlPath = (urlPath) => {
  if (urlPath === '/') return path.join(distDir, 'index.html');
  return path.join(distDir, `${urlPath.replace(/^\//, '')}.html`);
};

for (const file of ['robots.txt', 'sitemap.xml', 'llms.txt', 'llms-full.txt']) {
  await readIfExists(path.join(publicDir, file));
}

const robots = await readIfExists(path.join(publicDir, 'robots.txt'));
assert(robots.includes(`Sitemap: ${siteUrl}/sitemap.xml`), 'robots.txt must reference the sitemap.');
for (const privatePath of ['/app', '/dashboard', '/calendar', '/profile', '/vehicle/', '/business/']) {
  assert(robots.includes(`Disallow: ${privatePath}`), `robots.txt must disallow ${privatePath}.`);
}
for (const aiAgent of ['OAI-SearchBot', 'GPTBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'Google-Extended']) {
  assert(robots.includes(`User-agent: ${aiAgent}`), `robots.txt must include ${aiAgent}.`);
}

const sitemap = await readIfExists(path.join(publicDir, 'sitemap.xml'));
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
for (const page of indexablePages) {
  assert(sitemapUrls.includes(absoluteUrl(page.path)), `sitemap.xml missing ${page.path}.`);
}
for (const privatePath of ['/auth', '/app', '/dashboard', '/calendar', '/profile', '/vehicle/', '/business/']) {
  assert(!sitemap.includes(`${siteUrl}${privatePath}`), `sitemap.xml should not include private or noindex path ${privatePath}.`);
}

const llms = await readIfExists(path.join(publicDir, 'llms.txt'));
for (const urlPath of ['/', '/business-fleet', '/privacy', '/terms', '/cookies', '/sitemap.xml', '/robots.txt']) {
  assert(llms.includes(absoluteUrl(urlPath)), `llms.txt missing ${urlPath}.`);
}

for (const page of [...indexablePages, authPage]) {
  const html = await readIfExists(routeHtmlPath(page.path));
  assert(html.includes(`<title>${page.title}</title>`), `${page.path} missing expected title.`);
  assert(html.includes(`content="${page.description}"`), `${page.path} missing expected meta description.`);
  assert(html.includes(`rel="canonical" href="${absoluteUrl(page.path)}"`), `${page.path} missing expected canonical.`);
  assert(html.includes('data-route-jsonld="true"'), `${page.path} missing route JSON-LD.`);
  assert(html.includes('class="seo-fallback"'), `${page.path} missing static fallback content.`);

  const jsonMatch = html.match(/<script type="application\/ld\+json" data-route-jsonld="true">([\s\S]*?)<\/script>/);
  assert(Boolean(jsonMatch), `${page.path} missing parseable JSON-LD script.`);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      assert(parsed['@context'] === 'https://schema.org', `${page.path} JSON-LD missing schema.org context.`);
      assert(Array.isArray(parsed['@graph']), `${page.path} JSON-LD missing @graph.`);
    } catch {
      failures.push(`${page.path} has invalid JSON-LD.`);
    }
  }
}

const authHtml = await readIfExists(routeHtmlPath('/auth'));
assert(authHtml.includes('content="noindex,follow"'), '/auth should be noindex,follow.');

if (failures.length) {
  console.error(`SEO validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('SEO validation passed.');
