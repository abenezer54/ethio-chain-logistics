"use client";

import { useEffect } from "react";
import { useLanguage } from "./LanguageProvider";

const ignoredTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE"]);
const textOriginals = new WeakMap<Text, string>();
const attrOriginals = new WeakMap<Element, Partial<Record<string, string>>>();
const translatedAttrs = ["aria-label", "title", "placeholder"];

function preserveSpacing(source: string, translated: string) {
  const leading = source.match(/^\s*/)?.[0] ?? "";
  const trailing = source.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

function shouldTranslateText(node: Text) {
  const parent = node.parentElement;
  if (!parent || ignoredTags.has(parent.tagName)) return false;
  if (parent.closest("[data-no-translate]")) return false;
  return Boolean(node.textContent?.trim());
}

export function AutoTranslate() {
  const { language, translate } = useLanguage();

  useEffect(() => {
    function translateTextNode(node: Text) {
      if (!shouldTranslateText(node)) return;
      const current = node.textContent ?? "";
      const original = textOriginals.get(node) ?? current;
      textOriginals.set(node, original);

      if (language === "en") {
        if (current !== original) node.textContent = original;
        return;
      }

      const trimmed = original.trim();
      const translated = translate(trimmed);
      const next = translated === trimmed ? original : preserveSpacing(original, translated);
      if (current !== next) node.textContent = next;
    }

    function translateAttributes(element: Element) {
      if (ignoredTags.has(element.tagName)) return;
      if (element.closest("[data-no-translate]")) return;
      const originals = attrOriginals.get(element) ?? {};

      for (const attr of translatedAttrs) {
        const current = element.getAttribute(attr);
        const saved = originals[attr] ?? current ?? undefined;
        if (!saved) continue;
        originals[attr] = saved;

        if (language === "en") {
          if (current !== saved) element.setAttribute(attr, saved);
          continue;
        }

        const translated = translate(saved.trim());
        const next = translated === saved.trim() ? saved : preserveSpacing(saved, translated);
        if (current !== next) element.setAttribute(attr, next);
      }

      attrOriginals.set(element, originals);
    }

    function translateTree(root: ParentNode) {
      if (root instanceof Element) translateAttributes(root);

      const elementWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      let element = elementWalker.nextNode();
      while (element) {
        translateAttributes(element as Element);
        element = elementWalker.nextNode();
      }

      const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let textNode = textWalker.nextNode();
      while (textNode) {
        translateTextNode(textNode as Text);
        textNode = textWalker.nextNode();
      }
    }

    translateTree(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target as Text);
          continue;
        }
        if (mutation.type === "attributes" && mutation.target instanceof Element) {
          translateAttributes(mutation.target);
          continue;
        }
        for (const node of mutation.addedNodes) {
          if (node instanceof Text) translateTextNode(node);
          if (node instanceof Element) translateTree(node);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: translatedAttrs,
    });

    return () => observer.disconnect();
  }, [language, translate]);

  return null;
}
