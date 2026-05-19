import { recognize } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

export type OcrFieldKey = 'documentType' | 'issueDate' | 'expiryDate' | 'cost' | 'plateNumber' | 'vin' | 'referenceNumber';

export interface OcrFieldSuggestion {
    key: OcrFieldKey;
    value: string;
    confidence: number;
    source: 'pdf-text' | 'ocr' | 'pattern';
}

export interface OcrResult {
    confidence: number;
    suggestions: OcrFieldSuggestion[];
    scannedPages: number;
    source: 'pdf-text' | 'ocr' | 'mixed';
}

const DOCUMENT_TYPE_KEYWORDS: Array<{ type: string; keywords: string[] }> = [
    { type: 'insurance', keywords: ['insurance', 'siguracion', 'tpl', 'police sigurimi', 'polica'] },
    { type: 'registration', keywords: ['registration', 'regjistrim', 'certifikate regjistrimi', 'leje qarkullimi'] },
    { type: 'inspection', keywords: ['inspection', 'kontroll teknik', 'technical inspection', 'kolaudim'] },
    { type: 'tax', keywords: ['tax', 'takse', 'taksa', 'road tax'] },
    { type: 'service', keywords: ['service', 'servis', 'invoice', 'fature', 'maintenance'] },
    { type: 'ownership', keywords: ['ownership', 'title', 'pronesi', 'kontrate'] },
    { type: 'warranty', keywords: ['warranty', 'garanci'] },
];

const clampConfidence = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

const toIsoDate = (value: string) => {
    const trimmed = value.trim();
    const iso = trimmed.match(/\b(20\d{2}|19\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
    if (iso) {
        const [, year, month, day] = iso;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const dmy = trimmed.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2}|19\d{2})\b/);
    if (dmy) {
        const [, day, month, year] = dmy;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return null;
};

const unique = <T,>(items: T[]) => [...new Set(items)];

const extractPdfText = async (file: File) => {
    const document = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const maxPages = Math.min(document.numPages, 3);
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        const text = content.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ');
        pages.push(text);
    }

    return {
        text: normalizeText(pages.join(' ')),
        pages: maxPages,
    };
};

const renderPdfFirstPage = async (file: File) => {
    const document = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const page = await document.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = window.document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is not available for OCR.');

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvas, canvasContext: context, viewport }).promise;

    return canvas;
};

const runOcr = async (source: File | HTMLCanvasElement) => {
    const result = await recognize(source, 'eng');
    return {
        text: normalizeText(result.data.text),
        confidence: clampConfidence(result.data.confidence || 0),
    };
};

const inferDocumentType = (text: string, baseConfidence: number): OcrFieldSuggestion | null => {
    const lower = text.toLowerCase();
    const match = DOCUMENT_TYPE_KEYWORDS.find((candidate) => candidate.keywords.some((keyword) => lower.includes(keyword)));
    if (!match) return null;

    return {
        key: 'documentType',
        value: match.type,
        confidence: clampConfidence(Math.max(65, baseConfidence - 10)),
        source: 'pattern',
    };
};

const inferDates = (text: string, source: OcrFieldSuggestion['source'], baseConfidence: number) => {
    const matches = text.match(/\b(?:20\d{2}|19\d{2})[-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])\b|\b(?:0?[1-9]|[12]\d|3[01])[-/.](?:0?[1-9]|1[0-2])[-/.](?:20\d{2}|19\d{2})\b/g) || [];
    const dates = unique(matches.map(toIsoDate).filter((date): date is string => Boolean(date)))
        .sort((left, right) => new Date(left).getTime() - new Date(right).getTime());

    if (dates.length === 0) return [];
    if (dates.length === 1) {
        return [{ key: 'expiryDate' as const, value: dates[0], confidence: clampConfidence(baseConfidence - 15), source }];
    }

    return [
        { key: 'issueDate' as const, value: dates[0], confidence: clampConfidence(baseConfidence - 15), source },
        { key: 'expiryDate' as const, value: dates[dates.length - 1], confidence: clampConfidence(baseConfidence - 12), source },
    ];
};

const inferCost = (text: string, source: OcrFieldSuggestion['source'], baseConfidence: number): OcrFieldSuggestion | null => {
    const matches = [...text.matchAll(/(?:€|eur|euro|lek|all)?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d{2,7})(?:\s*(?:€|eur|euro|lek|all))?/gi)];
    const amounts = matches
        .map((match) => Number(match[1].replace(/\.(?=\d{3})/g, '').replace(',', '.')))
        .filter((amount) => Number.isFinite(amount) && amount > 0 && amount < 1000000);

    if (amounts.length === 0) return null;

    return {
        key: 'cost',
        value: Math.max(...amounts).toFixed(2),
        confidence: clampConfidence(baseConfidence - 25),
        source,
    };
};

const inferPlate = (text: string, source: OcrFieldSuggestion['source'], baseConfidence: number): OcrFieldSuggestion | null => {
    const match = text.toUpperCase().match(/\b[A-Z]{1,2}\s?\d{3,4}\s?[A-Z]{1,2}\b/);
    if (!match) return null;
    return {
        key: 'plateNumber',
        value: match[0].replace(/\s+/g, ' '),
        confidence: clampConfidence(baseConfidence - 15),
        source,
    };
};

const inferVin = (text: string, source: OcrFieldSuggestion['source'], baseConfidence: number): OcrFieldSuggestion | null => {
    const match = text.toUpperCase().match(/\b[A-HJ-NPR-Z0-9]{17}\b/);
    if (!match) return null;
    return {
        key: 'vin',
        value: match[0],
        confidence: clampConfidence(baseConfidence - 10),
        source,
    };
};

const inferReferenceNumber = (text: string, source: OcrFieldSuggestion['source'], baseConfidence: number): OcrFieldSuggestion | null => {
    const match = text.match(/\b(?:policy|police|certificate|certifikate|invoice|fature|nr\.?|no\.?)\s*(?:number|nr\.?)?\s*[:#-]?\s*([A-Z0-9/-]{5,30})\b/i);
    if (!match) return null;
    return {
        key: 'referenceNumber',
        value: match[1],
        confidence: clampConfidence(baseConfidence - 20),
        source,
    };
};

const buildSuggestions = (text: string, source: OcrFieldSuggestion['source'], baseConfidence: number) => {
    const suggestions: Array<OcrFieldSuggestion | null> = [
        inferDocumentType(text, baseConfidence),
        ...inferDates(text, source, baseConfidence),
        inferCost(text, source, baseConfidence),
        inferPlate(text, source, baseConfidence),
        inferVin(text, source, baseConfidence),
        inferReferenceNumber(text, source, baseConfidence),
    ];

    const byKey = new Map<OcrFieldKey, OcrFieldSuggestion>();
    suggestions.filter((item): item is OcrFieldSuggestion => Boolean(item)).forEach((item) => {
        const existing = byKey.get(item.key);
        if (!existing || item.confidence > existing.confidence) {
            byKey.set(item.key, item);
        }
    });

    return [...byKey.values()];
};

export const scanDocumentLocally = async (file: File): Promise<OcrResult> => {
    if (file.type === 'application/pdf') {
        const pdfText = await extractPdfText(file);
        if (pdfText.text.length > 80) {
            const suggestions = buildSuggestions(pdfText.text, 'pdf-text', 90);
            return {
                confidence: suggestions.length > 0 ? 90 : 65,
                suggestions,
                scannedPages: pdfText.pages,
                source: 'pdf-text',
            };
        }

        const canvas = await renderPdfFirstPage(file);
        const ocr = await runOcr(canvas);
        return {
            confidence: ocr.confidence,
            suggestions: buildSuggestions(ocr.text, 'ocr', ocr.confidence),
            scannedPages: 1,
            source: 'ocr',
        };
    }

    const ocr = await runOcr(file);
    return {
        confidence: ocr.confidence,
        suggestions: buildSuggestions(ocr.text, 'ocr', ocr.confidence),
        scannedPages: 1,
        source: 'ocr',
    };
};
