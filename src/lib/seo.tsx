import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const SITE_URL = 'https://makinaime.dpdns.org';
export const SITE_NAME = 'Makina Ime';
export const SITE_EMAIL = 'infomakinaime@gmail.com';

type JsonLdNode = Record<string, unknown>;

type SeoProps = {
    title: string;
    description: string;
    path: string;
    image?: string;
    type?: string;
    robots?: string;
    jsonLd?: JsonLdNode | JsonLdNode[];
};

type FaqItem = {
    question: string;
    answer: string;
};

const absoluteUrl = (path: string) => new URL(path, SITE_URL).toString();

const upsertMeta = (attribute: 'name' | 'property', key: string, content: string) => {
    let tag = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
    if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attribute, key);
        document.head.appendChild(tag);
    }
    tag.content = content;
};

const upsertCanonical = (href: string) => {
    let tag = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!tag) {
        tag = document.createElement('link');
        tag.rel = 'canonical';
        document.head.appendChild(tag);
    }
    tag.href = href;
};

const localeMap: Record<string, string> = {
    sq: 'sq_AL',
    en: 'en_US',
    it: 'it_IT',
    de: 'de_DE',
    es: 'es_ES',
};

export const graphJsonLd = (nodes: JsonLdNode[]): JsonLdNode => ({
    '@context': 'https://schema.org',
    '@graph': nodes,
});

export const organizationSchema = (): JsonLdNode => ({
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/icon.png'),
    email: SITE_EMAIL,
});

export const websiteSchema = (): JsonLdNode => ({
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    alternateName: ['Makina Ime App', 'Makina Ime Vehicle Management'],
    url: SITE_URL,
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'en',
});

export const webPageSchema = (path: string, name: string, description: string): JsonLdNode => ({
    '@type': 'WebPage',
    '@id': `${absoluteUrl(path)}#webpage`,
    url: absoluteUrl(path),
    name,
    description,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'en',
});

export const webApplicationSchema = (
    path: string,
    name: string,
    description: string,
    applicationCategory: string,
    audienceType: string
): JsonLdNode => ({
    '@type': 'WebApplication',
    '@id': `${absoluteUrl(path)}#software`,
    name,
    url: absoluteUrl(path),
    description,
    applicationCategory,
    operatingSystem: 'Web, iOS, Android',
    browserRequirements: 'Requires a modern web browser with JavaScript enabled',
    publisher: { '@id': `${SITE_URL}/#organization` },
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

export const faqPageSchema = (items: FaqItem[]): JsonLdNode => ({
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

export const breadcrumbSchema = (items: Array<{ name: string; path: string }>): JsonLdNode => ({
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: absoluteUrl(item.path),
    })),
});

export const Seo = ({
    title,
    description,
    path,
    image = '/icon.png',
    type = 'website',
    robots = 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1',
    jsonLd,
}: SeoProps) => {
    const { t, i18n } = useTranslation();
    const canonical = absoluteUrl(path);
    const imageUrl = absoluteUrl(image);
    const jsonLdString = jsonLd ? JSON.stringify(jsonLd) : '';
    const localizedTitle = t(title);
    const localizedDescription = t(description);

    useEffect(() => {
        document.documentElement.lang = i18n.language?.slice(0, 2) || 'en';
        document.title = localizedTitle;

        upsertMeta('name', 'description', localizedDescription);
        upsertMeta('name', 'robots', robots);
        upsertMeta('name', 'googlebot', robots);
        upsertMeta('name', 'application-name', SITE_NAME);
        upsertMeta('property', 'og:site_name', SITE_NAME);
        upsertMeta('property', 'og:title', localizedTitle);
        upsertMeta('property', 'og:description', localizedDescription);
        upsertMeta('property', 'og:type', type);
        upsertMeta('property', 'og:url', canonical);
        upsertMeta('property', 'og:image', imageUrl);
        upsertMeta('property', 'og:locale', localeMap[i18n.language] || 'en_US');
        upsertMeta('name', 'twitter:card', 'summary_large_image');
        upsertMeta('name', 'twitter:title', localizedTitle);
        upsertMeta('name', 'twitter:description', localizedDescription);
        upsertMeta('name', 'twitter:image', imageUrl);
        upsertCanonical(canonical);

        document.querySelectorAll<HTMLScriptElement>('script[data-seo-jsonld="true"], script[data-route-jsonld="true"]').forEach((scriptTag) => {
            scriptTag.remove();
        });

        if (jsonLdString) {
            const script = document.createElement('script');
            script.type = 'application/ld+json';
            script.dataset.seoJsonld = 'true';
            script.text = jsonLdString;
            document.head.appendChild(script);
        }
    }, [canonical, i18n.language, imageUrl, jsonLdString, localizedDescription, localizedTitle, robots, type]);

    return null;
};
