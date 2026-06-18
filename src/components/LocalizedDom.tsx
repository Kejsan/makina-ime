import { useEffect } from 'react';
import i18n from '../i18n';

const translatedAttributes = ['aria-label', 'placeholder', 'title', 'alt'] as const;

const ignoredTags = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE']);

const shouldSkip = (node: Text) => {
    const parent = node.parentElement;
    if (!parent) return true;
    return ignoredTags.has(parent.tagName);
};

const translateValue = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || !i18n.exists(trimmed)) return value;

    const translated = i18n.t(trimmed);
    if (!translated || translated === trimmed) return value;

    const leading = value.match(/^\s*/)?.[0] || '';
    const trailing = value.match(/\s*$/)?.[0] || '';
    return `${leading}${translated}${trailing}`;
};

export const LocalizedDom = () => {
    useEffect(() => {
        const textOriginals = new WeakMap<Text, string>();
        const alertOriginal = window.alert;
        const confirmOriginal = window.confirm;

        const translateTextNode = (node: Text) => {
            if (shouldSkip(node)) return;

            const previousOriginal = textOriginals.get(node);
            const previousTranslation = previousOriginal ? translateValue(previousOriginal) : null;
            const original = previousOriginal && node.data === previousTranslation ? previousOriginal : node.data;
            const translated = translateValue(original);

            if (translated !== original) {
                textOriginals.set(node, original);
                if (node.data !== translated) node.data = translated;
            } else {
                textOriginals.delete(node);
                if (node.data !== original) node.data = original;
            }
        };

        const translateElement = (element: Element) => {
            translatedAttributes.forEach((attribute) => {
                const value = element.getAttribute(attribute);
                if (!value) return;

                const originalAttribute = `data-l10n-original-${attribute}`;
                const original = element.getAttribute(originalAttribute) || value;
                if (!element.hasAttribute(originalAttribute)) {
                    element.setAttribute(originalAttribute, original);
                }

                const translated = translateValue(original);
                if (value !== translated) element.setAttribute(attribute, translated);
            });
        };

        const translateTree = (root: Node) => {
            if (root.nodeType === Node.TEXT_NODE) {
                translateTextNode(root as Text);
                return;
            }

            if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;

            if (root.nodeType === Node.ELEMENT_NODE) {
                translateElement(root as Element);
            }

            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
            let current = walker.nextNode();

            while (current) {
                if (current.nodeType === Node.TEXT_NODE) {
                    translateTextNode(current as Text);
                } else if (current.nodeType === Node.ELEMENT_NODE) {
                    translateElement(current as Element);
                }
                current = walker.nextNode();
            }
        };

        window.alert = (message?: unknown) => alertOriginal.call(window, typeof message === 'string' ? translateValue(message) : message);
        window.confirm = (message?: string) => confirmOriginal.call(window, typeof message === 'string' ? translateValue(message) : message);

        const pendingNodes = new Set<Node>();
        let frameId = 0;
        const flushPendingNodes = () => {
            frameId = 0;
            pendingNodes.forEach(translateTree);
            pendingNodes.clear();
        };
        const scheduleNode = (node: Node) => {
            pendingNodes.add(node);
            if (!frameId) frameId = window.requestAnimationFrame(flushPendingNodes);
        };

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'characterData') {
                    scheduleNode(mutation.target);
                }
                mutation.addedNodes.forEach(scheduleNode);
                if (mutation.type === 'attributes') {
                    translateElement(mutation.target as Element);
                }
            });
        });

        const run = () => translateTree(document.body);

        run();
        i18n.on('languageChanged', run);
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: [...translatedAttributes],
            characterData: true,
            childList: true,
            subtree: true,
        });

        return () => {
            observer.disconnect();
            if (frameId) window.cancelAnimationFrame(frameId);
            pendingNodes.clear();
            i18n.off('languageChanged', run);
            window.alert = alertOriginal;
            window.confirm = confirmOriginal;
        };
    }, []);

    return null;
};
