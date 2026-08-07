/* =============================================================================
 * CORE · dom.ts — Micro-helper de création DOM (aucune dépendance).
 * Port TypeScript FIDÈLE du design system (js/core/dom.js).
 *
 * h(tag, props?, ...children) → HTMLElement
 *   - props.class / className : classes (string ou array)
 *   - props.style : objet de styles OU string
 *   - props.dataset : {key: val} → data-key
 *   - on* (onClick, onInput...) : écouteurs d'événements
 *   - html : innerHTML (contenu de confiance uniquement)
 *   - autres : attributs / propriétés
 * children : string | number | Node | array | falsy (ignoré)
 * ========================================================================== */

export type DomChild = Node | string | number | null | undefined | boolean;
export type DomProps = Record<string, unknown>;

export function h(tag: string, props: DomProps = {}, ...children: DomChild[]): HTMLElement {
  const el = document.createElement(tag);

  for (const [key, val] of Object.entries(props || {})) {
    if (val == null || val === false) continue;

    if (key === 'class' || key === 'className') {
      el.className = Array.isArray(val) ? val.filter(Boolean).join(' ') : String(val);
    } else if (key === 'style' && typeof val === 'object') {
      // Les propriétés personnalisées (--xxx) doivent passer par setProperty :
      // Object.assign(el.style, …) les ignore silencieusement (CSSStyleDeclaration
      // ne réflète pas les clés inconnues via une simple affectation).
      for (const [prop, v] of Object.entries(val as Record<string, string>)) {
        if (v == null) continue;
        if (prop.startsWith('--')) el.style.setProperty(prop, String(v));
        else (el.style as unknown as Record<string, string>)[prop] = String(v);
      }
    } else if (key === 'style') {
      el.setAttribute('style', String(val));
    } else if (key === 'dataset') {
      Object.assign(el.dataset, val as Record<string, string>);
    } else if (key === 'html') {
      el.innerHTML = String(val);
    } else if (key.startsWith('on') && typeof val === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), val as EventListener);
    } else if (key in el && key !== 'list') {
      try { (el as unknown as Record<string, unknown>)[key] = val; } catch { el.setAttribute(key, String(val)); }
    } else {
      el.setAttribute(key, String(val));
    }
  }

  appendChildren(el, children);
  return el;
}

function appendChildren(el: HTMLElement, children: DomChild[]) {
  for (const child of (children.flat(Infinity as 1) as DomChild[])) {
    if (child == null || child === false || child === true) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** Vide un élément de tous ses enfants. */
export function clear(el: Element) { while (el.firstChild) el.removeChild(el.firstChild); }

/** Raccourci querySelector typé. */
export const qs = <T extends Element = Element>(sel: string, root: ParentNode = document): T | null => root.querySelector<T>(sel);
