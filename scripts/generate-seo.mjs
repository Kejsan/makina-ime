import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const siteUrl = 'https://makinaime.dpdns.org';
const siteName = 'Makina Ime';
const contactEmail = 'infomakinaime@gmail.com';
const defaultRobots = 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1';

const absoluteUrl = (urlPath) => new URL(urlPath, siteUrl).toString();

const organizationSchema = () => ({
  '@type': 'Organization',
  '@id': `${siteUrl}/#organization`,
  name: siteName,
  url: siteUrl,
  logo: absoluteUrl('/icon.png'),
  email: contactEmail,
});

const websiteSchema = () => ({
  '@type': 'WebSite',
  '@id': `${siteUrl}/#website`,
  name: siteName,
  alternateName: ['Makina Ime App', 'Makina Ime Vehicle Management'],
  url: siteUrl,
  publisher: { '@id': `${siteUrl}/#organization` },
  inLanguage: 'en',
});

const webPageSchema = (urlPath, name, description) => ({
  '@type': 'WebPage',
  '@id': `${absoluteUrl(urlPath)}#webpage`,
  url: absoluteUrl(urlPath),
  name,
  description,
  isPartOf: { '@id': `${siteUrl}/#website` },
  publisher: { '@id': `${siteUrl}/#organization` },
  inLanguage: 'en',
});

const webApplicationSchema = (urlPath, name, description, applicationCategory, audienceType) => ({
  '@type': 'WebApplication',
  '@id': `${absoluteUrl(urlPath)}#software`,
  name,
  url: absoluteUrl(urlPath),
  description,
  applicationCategory,
  operatingSystem: 'Web, iOS, Android',
  browserRequirements: 'Requires a modern web browser with JavaScript enabled',
  publisher: { '@id': `${siteUrl}/#organization` },
  audience: {
    '@type': 'Audience',
    audienceType,
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
    availability: 'https://schema.org/InStock',
  },
});

const faqSchema = (items) => ({
  '@type': 'FAQPage',
  mainEntity: items.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
});

const breadcrumbSchema = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
});

const graph = (nodes) => ({
  '@context': 'https://schema.org',
  '@graph': nodes,
});

const personalFaqs = [
  {
    question: 'Is Makina Ime free for personal users?',
    answer: 'Yes. The first version of Makina Ime Personal Garage is free for private vehicle owners, with a paid version planned later for advanced capabilities.',
  },
  {
    question: 'What can I track in a personal garage?',
    answer: 'You can track vehicle profiles, insurance and road tax dates, technical inspections, service history, uploaded document metadata, reminders, fuel, maintenance, and other expenses.',
  },
  {
    question: 'Can I install Makina Ime on my phone?',
    answer: 'Yes. Makina Ime is built as an installable progressive web app, so supported mobile browsers can add it to the home screen for quicker access.',
  },
  {
    question: 'Can vehicle records and expenses be edited later?',
    answer: 'Yes. Vehicle details, manual expenses, service records, and reminders are designed to stay editable as your information changes.',
  },
];

const businessFaqs = [
  {
    question: 'Is Makina Ime Business Fleet free?',
    answer: 'Yes. The first business workspace version is free, with advanced paid capabilities planned for a later release.',
  },
  {
    question: 'What types of businesses can use the fleet workspace?',
    answer: 'Makina Ime Business Fleet is suitable for taxi fleets, rental fleets, company cars, service vans, car sellers, and mixed vehicle operations.',
  },
  {
    question: 'Can teams share access to fleet records?',
    answer: 'Yes. Business workspaces support organization records, member roles, team access, assignments, inspections, issues, work orders, and shared vehicle history.',
  },
  {
    question: 'What fleet information is reported?',
    answer: 'The fleet dashboard is designed to show vehicle status, compliance dates, monthly spend, total expenses, open issues, inspections, work orders, vendors, and vehicle-level records.',
  },
];

const pages = [
  {
    path: '/',
    title: 'Makina Ime Personal Garage | Free vehicle documents, reminders, and expenses',
    description: 'Makina Ime Personal Garage is a free vehicle management app for private car owners. Track documents, renewal reminders, service history, and expenses from one dashboard.',
    fallbackTitle: 'Makina Ime Personal Garage',
    fallbackParagraphs: [
      'Makina Ime is a free vehicle management app for private car owners. Track car documents, renewal reminders, service history, and expenses from one dashboard.',
      'Use Makina Ime to manage insurance dates, road tax, technical inspection reminders, uploaded document records, service costs, fuel costs, and vehicle history.',
    ],
    jsonLd: graph([
      organizationSchema(),
      websiteSchema(),
      webPageSchema('/', 'Makina Ime Personal Garage | Free vehicle documents, reminders, and expenses', 'Makina Ime Personal Garage is a free vehicle management app for private car owners. Track documents, renewal reminders, service history, and expenses from one dashboard.'),
      webApplicationSchema('/', 'Makina Ime Personal Garage', 'Makina Ime Personal Garage is a free vehicle management app for private car owners. Track documents, renewal reminders, service history, and expenses from one dashboard.', 'LifestyleApplication', 'Private vehicle owners'),
      faqSchema(personalFaqs),
    ]),
  },
  {
    path: '/business-fleet',
    title: 'Makina Ime Business Fleet | Free fleet records, compliance, and expense tracking',
    description: 'Makina Ime Business Fleet is a free fleet management workspace for businesses. Track vehicles, documents, reminders, inspections, work orders, team roles, and expenses.',
    fallbackTitle: 'Makina Ime Business Fleet',
    fallbackParagraphs: [
      'Makina Ime Business Fleet is a free fleet management workspace for companies that need shared vehicle documents, compliance dates, inspections, work orders, assignments, and expense tracking.',
      'Use it for taxi fleets, rental fleets, company cars, service vehicles, car sellers, and mixed fleets that need roles, vehicle status, vendors, open issues, and cost visibility.',
    ],
    jsonLd: graph([
      organizationSchema(),
      websiteSchema(),
      webPageSchema('/business-fleet', 'Makina Ime Business Fleet | Free fleet records, compliance, and expense tracking', 'Makina Ime Business Fleet is a free fleet management workspace for businesses. Track vehicles, documents, reminders, inspections, work orders, team roles, and expenses.'),
      webApplicationSchema('/business-fleet', 'Makina Ime Business Fleet', 'Makina Ime Business Fleet is a free fleet management workspace for businesses. Track vehicles, documents, reminders, inspections, work orders, team roles, and expenses.', 'BusinessApplication', 'Businesses that manage fleets, company vehicles, taxis, rentals, service vehicles, or dealer stock'),
      breadcrumbSchema([
        { name: 'Home', path: '/' },
        { name: 'Business Fleet', path: '/business-fleet' },
      ]),
      faqSchema(businessFaqs),
    ]),
  },
  {
    path: '/privacy',
    title: 'Privacy Policy | Makina Ime',
    description: 'Read the Makina Ime Privacy Policy for personal vehicle and business fleet records, document metadata, reminders, account data, exports, and deletion requests.',
    fallbackTitle: 'Privacy Policy',
    fallbackParagraphs: [
      'Makina Ime stores account, vehicle, document metadata, expense, reminder, service, and business workspace data needed to operate the app.',
      'The policy explains uploaded files, business workspace visibility, service providers, exports, deletion requests, and data rights.',
    ],
    jsonLd: graph([
      organizationSchema(),
      websiteSchema(),
      webPageSchema('/privacy', 'Privacy Policy | Makina Ime', 'Read the Makina Ime Privacy Policy for personal vehicle and business fleet records, document metadata, reminders, account data, exports, and deletion requests.'),
      breadcrumbSchema([
        { name: 'Home', path: '/' },
        { name: 'Privacy Policy', path: '/privacy' },
      ]),
    ]),
  },
  {
    path: '/terms',
    title: 'Terms and Conditions | Makina Ime',
    description: 'Read the Makina Ime Terms and Conditions for personal vehicle accounts, business fleet workspaces, shared records, files, reminders, and service availability.',
    fallbackTitle: 'Terms and Conditions',
    fallbackParagraphs: [
      'Makina Ime helps personal users and business organizations manage vehicle records, documents, service history, expenses, reminders, inspections, issues, work orders, and fleet status.',
      'The terms explain account use, business roles, shared records, file responsibilities, security, service availability, and limitations.',
    ],
    jsonLd: graph([
      organizationSchema(),
      websiteSchema(),
      webPageSchema('/terms', 'Terms and Conditions | Makina Ime', 'Read the Makina Ime Terms and Conditions for personal vehicle accounts, business fleet workspaces, shared records, files, reminders, and service availability.'),
      breadcrumbSchema([
        { name: 'Home', path: '/' },
        { name: 'Terms and Conditions', path: '/terms' },
      ]),
    ]),
  },
  {
    path: '/cookies',
    title: 'Cookie Policy | Makina Ime',
    description: 'Read the Makina Ime Cookie Policy covering necessary browser storage, preferences, PWA behavior, analytics, and cookie controls.',
    fallbackTitle: 'Cookie Policy',
    fallbackParagraphs: [
      'Makina Ime uses necessary browser storage for authentication, session behavior, service workers, app installation behavior, theme, language, and preferences.',
      'The cookie policy explains necessary storage, preferences, analytics, PWA behavior, and browser controls.',
    ],
    jsonLd: graph([
      organizationSchema(),
      websiteSchema(),
      webPageSchema('/cookies', 'Cookie Policy | Makina Ime', 'Read the Makina Ime Cookie Policy covering necessary browser storage, preferences, PWA behavior, analytics, and cookie controls.'),
      breadcrumbSchema([
        { name: 'Home', path: '/' },
        { name: 'Cookie Policy', path: '/cookies' },
      ]),
    ]),
  },
  {
    path: '/auth',
    title: 'Sign in or create an account | Makina Ime',
    description: 'Sign in to Makina Ime or create a free personal vehicle garage or business fleet workspace account.',
    robots: 'noindex,follow',
    fallbackTitle: 'Sign in or create an account',
    fallbackParagraphs: [
      'Use this page to sign in to Makina Ime or create a free personal vehicle garage or business fleet workspace account.',
    ],
    jsonLd: graph([
      organizationSchema(),
      websiteSchema(),
      webPageSchema('/auth', 'Sign in or create an account | Makina Ime', 'Sign in to Makina Ime or create a free personal vehicle garage or business fleet workspace account.'),
    ]),
  },
];

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const seoBlock = (page) => {
  const robots = page.robots || defaultRobots;
  const canonical = absoluteUrl(page.path);
  const jsonLd = JSON.stringify(page.jsonLd, null, 2)
    .split('\n')
    .map((line) => `      ${line}`)
    .join('\n');

  return `<!-- seo:start -->
    <meta name="description" content="${escapeHtml(page.description)}" />
    <meta name="robots" content="${robots}" />
    <meta name="googlebot" content="${robots}" />
    <meta name="application-name" content="${siteName}" />
    <meta property="og:site_name" content="${siteName}" />
    <meta property="og:title" content="${escapeHtml(page.title)}" />
    <meta property="og:description" content="${escapeHtml(page.description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${absoluteUrl('/icon.png')}" />
    <meta property="og:locale" content="en_US" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(page.title)}" />
    <meta name="twitter:description" content="${escapeHtml(page.description)}" />
    <meta name="twitter:image" content="${absoluteUrl('/icon.png')}" />
    <link rel="canonical" href="${canonical}" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <title>${escapeHtml(page.title)}</title>
    <script type="application/ld+json" data-route-jsonld="true">
${jsonLd}
    </script>
    <!-- seo:end -->`;
};

const fallbackBlock = (page) => {
  const paragraphs = page.fallbackParagraphs
    .map((paragraph) => `        <p>${escapeHtml(paragraph)}</p>`)
    .join('\n');

  return `<!-- seo-fallback:start -->
      <main class="seo-fallback">
        <h1>${escapeHtml(page.fallbackTitle)}</h1>
${paragraphs}
        <nav aria-label="Primary pages">
          <a href="/">Personal vehicle management</a>
          <a href="/business-fleet">Business fleet management</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms and Conditions</a>
          <a href="/cookies">Cookie Policy</a>
        </nav>
      </main>
      <!-- seo-fallback:end -->`;
};

const replaceBlock = (html, start, end, replacement) => {
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);
  if (!pattern.test(html)) {
    throw new Error(`Missing block markers ${start} ${end}`);
  }
  return html.replace(pattern, replacement);
};

const routeTargets = (urlPath) => {
  if (urlPath === '/') return [path.join(distDir, 'index.html')];

  const cleanPath = urlPath.replace(/^\//, '');
  return [
    path.join(distDir, `${cleanPath}.html`),
    path.join(distDir, cleanPath, 'index.html'),
  ];
};

const baseHtml = await readFile(path.join(distDir, 'index.html'), 'utf8');

for (const page of pages) {
  let html = replaceBlock(baseHtml, '<!-- seo:start -->', '<!-- seo:end -->', seoBlock(page));
  html = replaceBlock(html, '<!-- seo-fallback:start -->', '<!-- seo-fallback:end -->', fallbackBlock(page));

  for (const target of routeTargets(page.path)) {
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, html, 'utf8');
  }
}

console.log(`Generated SEO HTML snapshots for ${pages.length} routes.`);
