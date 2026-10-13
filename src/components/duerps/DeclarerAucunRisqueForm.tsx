"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { declarerAucunRisque } from "@/lib/duerps/actions";

export function DeclarerAucunRisqueForm({
  uniteId,
  justifInitiale,
}: {
  uniteId: string;
  justifInitiale: string | null;
}) {
  const [ouvert, setOuvert] = useState(Boolean(justifInitiale));
  const [valeur, setValeur] = useState(justifInitiale ?? "");
  const [pending, startTransition] = useTransition();
  const declaree = Boolean(justifInitiale);

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="board-eyebrow inline-flex items-center gap-2 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
      >
        <span aria-hidden className="text-[13px] leading-none">+</span>
        Déclarer « aucun risque significatif »
      </button>
    );
  }

  return (
    // Déclarer l'absence de risque significatif est une saisie du dirigeant,
    // pas un état d'échéance : le bloc porte la surface creuse de l'ardoise,
    // sans champ de couleur (charte, interdit 3).
    <div className="rounded-[22px] bg-[color:var(--board-slate-pale)] px-7 py-6 sm:px-8">
      <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
        Déclaration — aucun risque significatif
      </p>
      <p className="m-0 mt-2.5 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
        Cette déclaration sera reprise dans le DUERP généré. Précisez la
        nature de l&apos;évaluation (ex : « poste purement administratif, pas
        d&apos;exposition physique identifiée hors risques transverses »).
      </p>
      <label className="label-board mt-4 block" htmlFor="aucun-risque-justif">
        Justification
      </label>
      <textarea
        id="aucun-risque-justif"
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
        placeholder="Justification libre (quelques mots)"
        maxLength={1000}
        rows={3}
        className="champ-board"
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="board"
          size="boardSm"
          disabled={pending || !valeur.trim()}
          onClick={() => {
            startTransition(async () => {
              await declarerAucunRisque(uniteId, valeur);
            });
          }}
        >
          {pending
            ? "Enregistrement…"
            : declaree
              ? "Mettre à jour"
              : "Enregistrer la déclaration"}
        </Button>
        {declaree && (
          <Button
            variant="boardClair"
            size="boardSm"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await declarerAucunRisque(uniteId, null);
                setValeur("");
                setOuvert(false);
              });
            }}
          >
            Retirer la déclaration
          </Button>
        )}
        <Button
          variant="boardClair"
          size="boardSm"
          onClick={() => {
            setValeur(justifInitiale ?? "");
            if (!justifInitiale) setOuvert(false);
          }}
        >
          Annuler
        </Button>
      </div>
    </div>
  );
}
