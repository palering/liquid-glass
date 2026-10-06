import { labUrl } from "./url.js";
import { createTranslator, resolveLanguage } from "./translation.js";
import "./i18n.css";

const storageKey = "liquid-glass.language.v1";
let saved;
try { saved = localStorage.getItem(storageKey); } catch {}
const translator = createTranslator(resolveLanguage(new URL(location.href).searchParams.get("lang"), saved));
const listeners = new Set();
export const t = (value) => translator.t(value);
export const pageUrl = (path = "") => `${labUrl(path)}?lang=${translator.language}`;
export const onLanguageChange = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};
const excluded = "script, style, textarea, pre, [data-no-i18n], #saved-preset option:not([value=''])";
function localize(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (!node.parentElement?.closest(excluded)) {
      const next = t(node.textContent);
      if (next !== node.textContent) node.textContent = next;
    }
  }
  for (const el of root.querySelectorAll("[aria-label], [title], [placeholder], [alt]")) {
    if (el.closest("[data-no-i18n]")) continue;
    for (const attr of ["aria-label", "title", "placeholder", "alt"]) {
      if (el.hasAttribute(attr)) el.setAttribute(attr, t(el.getAttribute(attr)));
    }
  }
}
export function localizeHtml(markup) {
  const template = document.createElement("template");
  template.innerHTML = markup;
  localize(template.content);
  return template.innerHTML;
}
function updateNavigation() {
  const base = new URL(labUrl(""), location.origin);
  for (const a of document.querySelectorAll("header a[href]")) {
    const url = new URL(a.href);
    if (url.origin === base.origin && url.pathname.startsWith(base.pathname)) {
      url.searchParams.set("lang", translator.language);
      a.href = url.href;
    }
  }
}
function applyLanguage() {
  document.documentElement.lang = translator.language;
  document.title = t(document.title);
  localize(document.querySelector("#app"));
  updateNavigation();
  for (const button of document.querySelectorAll("[data-language]")) {
    button.setAttribute("aria-pressed", String(button.dataset.language === translator.language));
  }
}
export function installLanguageSwitcher() {
  const header = document.querySelector("header");
  const actions = document.createElement("div");
  actions.className = "header-actions";
  actions.append(header.lastElementChild);
  const nav = document.createElement("nav");
  nav.className = "language-switch";
  nav.setAttribute("aria-label", "Language / 语言");
  nav.setAttribute("data-no-i18n", "");
  nav.innerHTML = '<button type="button" data-language="en" lang="en">EN</button><button type="button" data-language="zh-CN" lang="zh-CN">中文</button>';
  actions.append(nav);
  header.append(actions);
  for (const button of nav.querySelectorAll("button")) button.onclick = () => {
    translator.setLanguage(button.dataset.language);
    try { localStorage.setItem(storageKey, translator.language); } catch {}
    const url = new URL(location.href);
    url.searchParams.set("lang", translator.language);
    history.replaceState(null, "", url);
    applyLanguage();
    for (const callback of listeners) callback(translator.language);
  };
  applyLanguage();
}
