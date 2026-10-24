"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

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
export function TexteInformation({
  texte,
  compact = false,
}: {
  texte: string;
  /**
   * Une ligne au lieu d'un paragraphe (2026-10-24, retour de la
   * propriétaire : une carte entière pour un texte à copier). L'obligation
   * reste dite — elle est réelle, et elle incombe à l'employeur.
   */
  compact?: boolean;
}) {
  const [copie, setCopie] = useState(false);
  const [ouvert, setOuvert] = useState(false);

  return (
    <div>
      {compact ? null : (
        <p className="m-0 max-w-[64ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
          Vos salariés doivent être informés que vous suivez leurs titres, sur
          quelle base et pour combien de temps. C&apos;est à vous de le faire —
          vous êtes le responsable de ce traitement. Voici le texte, écrit sur ce
          que Rojer enregistre réellement : remettez-le, affichez-le, ou joignez-le
          au livret d&apos;accueil.
        </p>
      )}

      <div className={(compact ? "" : "mt-4 ") + "flex flex-wrap items-center gap-x-3 gap-y-2"}>
        {compact && (
          <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            Vos salariés doivent être informés de ce suivi : c&apos;est à vous de
            leur remettre ce texte.
          </p>
        )}
        <Button
          variant="boardClair"
          size="boardSm"
          type="button"
          onClick={() => setOuvert((o) => !o)}
        >
          {ouvert ? "Masquer le texte" : "Lire le texte"}
        </Button>
        <Button
          variant="board"
          size="boardSm"
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(texte);
            setCopie(true);
            setTimeout(() => setCopie(false), 2400);
          }}
        >
          {copie ? (
            <>
              <Check className="size-3.5" aria-hidden />
              Copié
            </>
          ) : (
            <>
              <Copy className="size-3.5" aria-hidden />
              Copier le texte
            </>
          )}
        </Button>
        {/* Une confirmation visuelle ne suffit pas : le changement de libellé
            du bouton n'est pas annoncé par un lecteur d'écran. */}
        <span role="status" className="sr-only">
          {copie ? "Texte copié dans le presse-papier" : ""}
        </span>
      </div>

      {ouvert && (
        <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-[18px] bg-[color:var(--board-slate-pale)] px-5 py-4 font-mono text-[11.5px] leading-[1.65] text-[color:var(--board-slate-ink)]">
          {texte}
        </pre>
      )}
    </div>
  );
}
