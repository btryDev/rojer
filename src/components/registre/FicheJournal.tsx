"use client";

// Une fiche à lignes empilées — forme `journal`.
//
// Passage de commission, début d'incendie, nettoyage de hotte : des faits
// datés dont l'historique **est** la valeur. Une ligne de journal ne se
// corrige pas et ne se retire pas — c'est ce qui en fait une pièce
// opposable. Aucun bouton « modifier » ni « supprimer » n'est donc rendu
// ici, et ce n'est pas un oubli : rendre la correction possible ferait du
// registre un document révisable, c'est-à-dire sans force devant une
// commission. On rectifie en ajoutant une ligne, jamais en réécrivant.
//
// L'action côté serveur ne sait faire qu'ajouter : l'interdit est tenu des
// deux côtés, pas seulement à l'écran.

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRepli, LIEN_REPLI } from "@/components/ui/repli";
import type { ChampFiche } from "@/lib/registre/champs";
import { ChampSaisie } from "./ChampSaisie";
import { afficherSaisieLe, afficherValeur } from "@/lib/registre/valeur";
import {
  ETAT_INITIAL,
  type ActionFiche,
  type EtatFiche,
  type LigneJournal,
} from "./types";

export function FicheJournal({
  colonnes,
  lignes,
  action,
  requis,
  libelleAjout = "Consigner cette ligne",
  legendeVide = "Aucune ligne consignée pour l'instant.",
}: {
  colonnes: readonly ChampFiche[];
  /**
   * Les lignes déjà consignées, dans l'ordre où elles doivent se lire —
   * `lignesDuJournal` (`@/lib/registre/schema`) les rend déjà les plus
   * récemment saisies d'abord. Ce composant ne les retrie pas : deux tris
   * concurrents finiraient par diverger.
   */
  lignes: readonly LigneJournal[];
  action: ActionFiche;
  requis?: readonly string[];
  libelleAjout?: string;
  legendeVide?: string;
}) {
  const [state, formAction, pending] = useActionState<EtatFiche, FormData>(
    action,
    ETAT_INITIAL,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Une ligne consignée est partie : le formulaire se vide, sinon la
  // suivante se saisit par-dessus la précédente et on la reconsigne à
  // l'identique d'un clic de trop — dans un journal où rien ne s'efface.
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  const err = (cle: string) =>
    state.status === "error" ? state.fieldErrors?.[cle]?.[0] : undefined;

  const obligatoires = new Set(requis ?? []);

  return (
    <div className="space-y-6">
      {/* Ce qui est déjà consigné vient d'abord : c'est le registre. Le
          formulaire n'est qu'un moyen d'y ajouter. */}
      {lignes.length === 0 ? (
        <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
          {legendeVide}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="tableau-en-cartes w-full md:min-w-[34rem] border-collapse text-[13.5px]">
            <caption className="sr-only">
              Lignes consignées, la plus récemment saisie en premier.
            </caption>
            <thead className="max-md:sr-only">
              <tr className="border-b border-[color:var(--board-slate-line)] text-left">
                {colonnes.map((c) => (
                  <th
                    key={c.cle}
                    scope="col"
                    className="board-eyebrow py-2 pr-4 text-[9.5px] font-semibold tracking-[0.12em] text-[color:var(--board-slate-soft)] last:pr-0"
                  >
                    {c.libelle}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lignes.map((ligne) => {
                const saisie = afficherSaisieLe(ligne.saisieLe);
                return (
                  <tr
                    key={ligne.id}
                    className="border-b border-[color:var(--board-slate-line)] align-top last:border-b-0"
                  >
                    {colonnes.map((c, i) => (
                      <td
                        key={c.cle}
                        data-label={c.libelle}
                        className="py-2.5 pr-4 leading-[1.55] text-[color:var(--board-slate-ink)] last:pr-0"
                      >
                        {afficherValeur(ligne.valeurs[c.cle], c)}
                        {/* L'horodatage de saisie se range sous la première
                            colonne : il situe la ligne sans lui prendre une
                            colonne, et sans se confondre avec la date de
                            l'événement, qui est une réponse comme une autre. */}
                        {i === 0 && saisie && (
                          <span className="mt-0.5 block text-[11px] text-[color:var(--board-slate-soft)]">
                            saisi le {saisie}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* L'ajout, replié quand le journal est déjà tenu — une fiche se lit
          plus souvent qu'elle ne s'écrit ; ouvert quand il est vide, où le
          geste attendu est justement d'écrire la première ligne. */}
      <details open={lignes.length === 0} className="group">
        <summary className={LIEN_REPLI}>
          <ChevronRepli />
          Ajouter une ligne
        </summary>

        <form ref={formRef} action={formAction} className="mt-4 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {colonnes.map((champ) => (
              <div
                key={champ.cle}
                className={
                  champ.type === "texte_long" ? "sm:col-span-2" : undefined
                }
              >
                <ChampSaisie
                  champ={champ}
                  valeurInitiale=""
                  erreur={err(champ.cle)}
                  requis={obligatoires.has(champ.cle)}
                />
              </div>
            ))}
          </div>

          {state.status === "error" && (
            <p className="m-0 text-[13px] text-[color:var(--board-signal-ink)]">
              {state.message}
            </p>
          )}
          {state.status === "success" && (
            <p className="m-0 text-[13px] text-[color:var(--board-green-ink)]">
              Ligne consignée.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" variant="board" size="board" disabled={pending}>
              {pending ? "Enregistrement…" : libelleAjout}
            </Button>
            <p className="m-0 text-[12px] text-[color:var(--board-slate-soft)]">
              Une ligne consignée ne se modifie plus : pour rectifier, ajoutez
              une ligne.
            </p>
          </div>
        </form>
      </details>
    </div>
  );
}
