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
    // Une carte par unité (2026-11-12) : nom et description en haut, les
    // gestes en pied de carte.
    <li className="carte-board flex flex-col px-5 py-4 sm:px-6">
      <div className="flex h-full flex-col justify-between gap-3">
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
              <p className="m-0 text-[15px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
                {nom}
              </p>
              {/* Deux lignes au plus : la page doit tenir sur un écran
                  (2026-11-12). Le texte entier reste dans `title`. */}
              {description && (
                <p
                  title={description}
                  className="m-0 mt-1 line-clamp-2 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]"
                >
                  {description}
                </p>
              )}
              {/* ~~Le compte de risques renseignés~~ (retiré le 2026-11-12) :
                  les risques sont l'étape suivante, l'écran des unités n'en
                  parle pas. `nombreRisques` sert encore à la confirmation de
                  suppression. */}
            </>
          )}
        </div>
        {!editing && (
          <div className="flex flex-wrap gap-1.5">
            <Button
              data-ecriture
              variant="boardClair"
              size="boardSm"
              onClick={() => setEditing(true)}
            >
              Renommer
            </Button>
            <Button
              data-ecriture
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
