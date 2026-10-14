"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useConfirmation } from "@/components/ui-kit/Confirmation";
import { renommerUnite, supprimerUnite } from "@/lib/duerps/actions";

type Props = {
  id: string;
  nom: string;
  description?: string | null;
  nombreRisques: number;
};

export function UniteRow({ id, nom, description, nombreRisques }: Props) {
  const [editing, setEditing] = useState(false);
  const [valeur, setValeur] = useState(nom);
  const [pending, startTransition] = useTransition();
  const { demander, confirmation } = useConfirmation();

  const supprimer = () =>
    startTransition(async () => {
      await supprimerUnite(id);
    });

  return (
    // La ligne devient une colonne, et la ligne d'origine descend d'un cran :
    // la question a besoin de la largeur du `<li>`, alors que la colonne
    // d'actions qui la déclenche est `shrink-0`. Sans ce niveau, la carte
    // naîtrait dans une bande de 150 px collée au bord droit.
    <li className="flex flex-col px-7 py-5 sm:px-8">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex flex-wrap items-center gap-2">
              {/* Renommage sur place : le libellé serait redondant avec le nom
                  qu'on est en train de corriger, mais un champ sans nom
                  accessible ne s'annonce pas — d'où l'`aria-label`. */}
              <input
                className="champ-board max-w-md"
                aria-label="Nom de l'unité de travail"
                maxLength={100}
                value={valeur}
                onChange={(e) => setValeur(e.target.value)}
                autoFocus
              />
              <Button
                variant="board"
                size="boardSm"
                disabled={pending || !valeur.trim()}
                onClick={() => {
                  startTransition(async () => {
                    await renommerUnite(id, valeur);
                    setEditing(false);
                  });
                }}
              >
                OK
              </Button>
              <Button
                variant="boardClair"
                size="boardSm"
                onClick={() => {
                  setValeur(nom);
                  setEditing(false);
                }}
              >
                Annuler
              </Button>
            </div>
          ) : (
            <>
              <p className="m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
                {nom}
              </p>
              {description && (
                <p className="m-0 mt-1 max-w-[62ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                  {description}
                </p>
              )}
              <p className="board-eyebrow m-0 mt-2 text-[10px] tracking-[0.16em] tabular-nums text-[color:var(--board-slate-soft)]">
                {nombreRisques === 0
                  ? "Aucun risque renseigné"
                  : `${String(nombreRisques).padStart(2, "0")} risque${nombreRisques > 1 ? "s" : ""} renseigné${nombreRisques > 1 ? "s" : ""}`}
              </p>
            </>
          )}
        </div>
        {!editing && (
          <div className="flex shrink-0 gap-1.5">
            <Button
              variant="boardClair"
              size="boardSm"
              onClick={() => setEditing(true)}
            >
              Renommer
            </Button>
            <Button
              variant="boardClair"
              size="boardSm"
              disabled={pending}
              onClick={() => {
                // Une unité vide n'emporte rien : la question ne se pose que
                // s'il y a quelque chose à perdre. C'était déjà la règle avec
                // la boîte native, et c'est la bonne — une question posée pour
                // rien apprend à répondre sans lire.
                if (nombreRisques === 0) {
                  supprimer();
                  return;
                }
                demander({
                  titre: `Supprimer l'unité de travail « ${nom} » ?`,
                  detail: `Ses ${nombreRisques} risque${nombreRisques > 1 ? "s" : ""} évalué${nombreRisques > 1 ? "s" : ""}, leur cotation et les mesures qui y sont rattachées sont supprimés avec elle. Le DUERP n'en gardera pas trace.`,
                  agir: "Supprimer l'unité",
                  alors: supprimer,
                });
              }}
            >
              Supprimer
            </Button>
          </div>
        )}
      </div>
      {confirmation}
    </li>
  );
}
