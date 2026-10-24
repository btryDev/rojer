"use client";

import { useState } from "react";

/**
 * Le texte d'information à remettre aux salariés — art. 13 du RGPD.
 *
 * L'outil ne peut pas informer à la place de l'employeur : c'est lui le
 * responsable de traitement, et c'est à lui de remettre ce texte. Ce que
 * l'outil peut faire, c'est le lui écrire, à jour de ce qu'il collecte
 * réellement — un texte type téléchargé ailleurs décrirait un autre
 * traitement que celui-ci.
 *
 * Le texte est donc affiché en clair plutôt que caché derrière un
 * téléchargement : l'employeur doit pouvoir le lire avant de le diffuser, et
 * répondre s'il en est questionné.
 */
export function TexteInformation({ texte }: { texte: string }) {
  const [copie, setCopie] = useState<"non" | "oui" | "refus">("non");
  const [ouvert, setOuvert] = useState(false);
  // Le navigateur peut refuser (page non sécurisée, permission) : on le dit,
  // et « lire le texte » reste la porte pour le copier à la main.
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie("oui");
    } catch {
      setCopie("refus");
    }
    setTimeout(() => setCopie("non"), 2400);
  };
  const lien =
    "cursor-pointer font-medium text-[color:var(--board-blue-ink)] underline underline-offset-4";

  // ~~Une carte, un paragraphe et deux boutons pleins~~ [2026-10-24, retour
  // de la propriétaire : une ligne du pied d'Équipe]. L'obligation reste
  // dite — elle est réelle et incombe à l'employeur. Le composant se pose
  // dans un pied qui se replie (`flex-wrap`) : des liens, et le texte ouvert
  // prend toute la largeur dessous.
  return (
    <>
      <span>
        Vos salariés doivent être informés de ce suivi :{" "}
        <button type="button" className={lien} onClick={() => setOuvert((o) => !o)}>
          {ouvert ? "masquer le texte" : "lire le texte"}
        </button>
        {" · "}
        <button type="button" className={lien} onClick={copier}>
          {copie === "oui" ? "copié" : copie === "refus" ? "copie impossible, lisez-le" : "le copier"}
        </button>
      </span>
      {/* Une confirmation visuelle ne suffit pas : le changement de libellé
          n'est pas annoncé par un lecteur d'écran. */}
      <span role="status" className="sr-only">
        {copie === "oui"
          ? "Texte copié dans le presse-papier"
          : copie === "refus"
            ? "La copie a échoué : ouvrez le texte pour le copier"
            : ""}
      </span>
      {ouvert && (
        <pre className="m-0 mt-2 max-h-[420px] w-full basis-full overflow-auto whitespace-pre-wrap rounded-[18px] bg-[color:var(--board-slate-pale)] px-5 py-4 font-mono text-[11.5px] leading-[1.65] text-[color:var(--board-slate-ink)]">
          {texte}
        </pre>
      )}
    </>
  );
}
