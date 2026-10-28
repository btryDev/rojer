// Le livre du kit est un `<details>` natif (2026-10-28) : replié, son texte
// est DANS le DOM, seulement pas affiché. `textContent` ne voit pas la
// différence ; ces aides la font, pour que les tests « pas lu avant d'ouvrir »
// gardent leur sens. Rangé sous `src/test/` (cf. `fiche-ouverte.tsx`).

/** Le texte affiché : sans le contenu des `<details>` fermés (leur `<summary>` reste). */
export function texteVisible(racine: Element): string {
  const copie = racine.cloneNode(true) as Element;
  for (const d of Array.from(copie.querySelectorAll("details:not([open])"))) {
    for (const enfant of Array.from(d.children))
      if (enfant.tagName !== "SUMMARY") enfant.remove();
  }
  return copie.textContent ?? "";
}

/** Le `<summary>` du livre dont le nom (`aria-label`, sinon le mot) est `nom`. */
export function livre(racine: Element, nom: string): HTMLElement {
  const s = Array.from(racine.querySelectorAll("summary")).find(
    (x) => (x.getAttribute("aria-label") ?? x.textContent?.trim()) === nom,
  );
  if (!s) throw new Error(`livre « ${nom} » introuvable`);
  return s as HTMLElement;
}

/** Vrai si `el` est sous un `<details>` fermé (hors de son `<summary>`). */
export function sousUnLivreFerme(el: Element): boolean {
  for (let d = el.closest("details"); d; d = d.parentElement?.closest("details") ?? null) {
    const s = d.querySelector(":scope > summary");
    if (!d.open && !(s && s.contains(el))) return true;
  }
  return false;
}

/**
 * Pour un rendu statique (`renderToStaticMarkup`) : vrai si `texte` est
 * présent, et chacune de ses occurrences sous un `<details>` sans `open`.
 * Lecture à plat, sans imbrication de `<details>` — suffisant pour un livre.
 */
export function seulementSousUnLivreFerme(html: string, texte: string): boolean {
  let i = html.indexOf(texte);
  if (i < 0) return false;
  for (; i >= 0; i = html.indexOf(texte, i + 1)) {
    const ouverture = html.lastIndexOf("<details", i);
    if (ouverture < 0 || html.lastIndexOf("</details>", i) > ouverture) return false;
    // Le `<summary>` reste visible, livre fermé : le texte doit venir après lui.
    const finSummary = html.indexOf("</summary>", ouverture);
    if (finSummary < 0 || finSummary > i) return false;
    // L'attribut `open`, pas un mot `open` dans une valeur de classe.
    const balise = html
      .slice(ouverture, html.indexOf(">", ouverture) + 1)
      .replace(/"[^"]*"/g, '""');
    if (/\sopen(?=[\s=>/])/.test(balise)) return false;
  }
  return true;
}
