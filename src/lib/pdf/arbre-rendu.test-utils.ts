// L'ordre de lecture d'un document react-pdf, lu dans son arbre d'éléments.
//
// Le texte d'un PDF rendu n'est pas lisible (flux compressés, polices
// sous-ensemblées — voir `DossierConformiteDocument.test.tsx`), donc un ordre
// « le fait avant le score » ne se vérifie pas dans le fichier. Il se vérifie
// dans l'arbre que le composant rend, avant react-pdf : un parcours en
// profondeur y suit l'ordre du document. Les sous-composants ne sont PAS
// exécutés — on les reconnaît par leur nom, avec leurs props.

import { isValidElement, type ReactElement, type ReactNode } from "react";

export type Noeud = { type: string; props: Record<string, unknown> };

/** Les éléments de l'arbre, dans l'ordre du document. */
export function elementsDansLOrdre(racine: ReactNode): Noeud[] {
  const out: Noeud[] = [];
  const visiter = (n: ReactNode) => {
    if (Array.isArray(n)) return n.forEach(visiter);
    if (!isValidElement(n)) return;
    const el = n as ReactElement<Record<string, unknown>>;
    const t = el.type;
    out.push({
      type: typeof t === "string" ? t : ((t as { name?: string }).name ?? "?"),
      props: el.props,
    });
    visiter(el.props.children as ReactNode);
  };
  visiter(racine);
  return out;
}

/** Le texte direct d'un nœud : ses enfants chaînes, recollés. */
export function texteDirect(n: Noeud): string {
  const c = n.props.children;
  const parts = Array.isArray(c) ? c : [c];
  return parts.filter((p) => typeof p === "string" || typeof p === "number").join("");
}
