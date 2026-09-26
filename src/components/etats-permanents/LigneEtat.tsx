"use client";

/** Le caractère d'attente, nommé pour qu'aucun ternaire ne porte de littéral. */
const ATTENTE = "…";

import { useTransition } from "react";
import { Check, FileText } from "lucide-react";
import { declarerEnPlace, retirerDeclaration } from "@/lib/etats-permanents/actions";
import { formaterDateFr } from "@/lib/dates";
import { LienEffectifEntreprise } from "@/components/entreprises/LienEffectifEntreprise";
import {
  libelleGeste,
  libelleRetour,
  phraseDeclaration,
} from "@/lib/etats-permanents/phrases";

/**
 * Une ligne de l'écran « Ce qui doit être en place ».
 *
 * **Un bouton, pas une case à cocher**, et la nuance n'est pas cosmétique : une
 * case suggère un formulaire qu'on remplit puis qu'on valide, alors que le
 * geste ici est immédiat et réversible. Le bouton porte son état dans son
 * libellé plutôt que dans une couleur seule — la charte l'impose (« un champ,
 * une encre, jamais l'un sans l'autre ») et un lecteur d'écran n'a pas de
 * couleur.
 *
 * **Le verbe vient du serveur**, il n'est pas décidé ici. « Déclaré en place »
 * pour un état, « Fait le » pour ce qui revient sans rythme écrit : c'est
 * `etats-permanents/regle.ts` qui tranche, à partir de la nature de
 * l'obligation. Le composant ne connaît pas la règle, il rend ce qu'on lui
 * donne — c'est la seconde moitié de « partage la règle, pas la mise en page ».
 */
export function LigneEtat({
  etablissementId,
  obligationId,
  libelle,
  mode,
  pieceAttendue,
  declareLe,
  aConfirmer = null,
}: {
  etablissementId: string;
  obligationId: string;
  libelle: string;
  mode: "etat" | "fait";
  pieceAttendue: string | null;
  declareLe: string | null;
  /**
   * « À confirmer » : la ligne n'est retenue que par la prudence d'un seuil
   * compté sur l'entreprise (C37). La phrase dit de quoi conclure, le lien
   * mène à l'effectif à corriger.
   */
  aConfirmer?: { phrase: string; entrepriseId: string } | null;
}) {
  const [pending, startTransition] = useTransition();
  const declare = declareLe !== null;

  // Aucun libellé n'est recousu ici. Verbe, date et geste sortent entiers de
  // `phrases.ts`, où ils se lisent et se testent — c'est la règle que
  // `phrases.test.ts` fait respecter dans ce fichier même, et c'est elle qui a
  // trouvé le montage `{verbe} {date}` que portait la première version.
  const geste = libelleGeste(mode);

  return (
    <li className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 border-t border-[color:var(--board-slate-line)] py-3.5 first:border-t-0">
      <div className="min-w-0 flex-1 basis-[22rem]">
        <p className="m-0 text-[13.5px] leading-[1.45] text-[color:var(--board-ink)]">
          {libelle}
        </p>

        {/* L'écrit que le texte attend, quand il en attend un.
            L'écran ne le collecte pas — aucune surface de dépôt ici (ADR-027) —
            mais le taire ferait cocher « en place » un registre de sécurité
            sans que rien ne rappelle ce qu'on affirme détenir. Nommer n'est pas
            demander. */}
        {pieceAttendue && (
          <p className="m-0 mt-1 inline-flex items-center gap-1.5 text-[12px] leading-[1.4] text-[color:var(--board-slate-soft)]">
            <FileText className="size-3 shrink-0" aria-hidden />
            Le texte attend un écrit : {pieceAttendue}
          </p>
        )}

        {aConfirmer && (
          <div className="mt-1.5 max-w-[66ch] text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]">
            <p className="m-0">
              <strong className="font-semibold text-[color:var(--board-ink)]">
                À confirmer.
              </strong>{" "}
              {aConfirmer.phrase}
            </p>
            <LienEffectifEntreprise
              entrepriseId={aConfirmer.entrepriseId}
              effectif={null}
              className="m-0 mt-1 text-[12px] leading-[1.5]"
            />
          </div>
        )}

      </div>

      {/* LA DATE EST À CÔTÉ DU BOUTON, PAS SOUS LE LIBELLÉ — 2026-09-03.

          Sous le libellé, elle apparaissait au clic et **rallongeait la
          ligne** : tout ce qui suivait descendait d'une ligne de texte au
          moment précis où le lecteur visait la ligne suivante. C'est la
          seconde moitié du défaut de réordonnancement que `ordre.ts` corrige,
          et elle survivait au tri stable.

          Ici, la hauteur de la rangée est celle du bouton, que la déclaration
          ne change pas : rien ne bouge, ni au-dessus ni au-dessous. La date se
          lit d'ailleurs mieux à côté du geste qui l'a produite, et elle reste
          à un clic de « Revenir dessus » — l'ADR-027 veut une déclaration
          révocable et lisible, pas seulement enregistrée. */}
      <div className="flex shrink-0 items-center gap-3">
        {declare && (
          <span className="text-right text-[12px] leading-[1.4] text-[color:var(--board-slate-mid)]">
            {phraseDeclaration(mode, formaterDateFr(new Date(declareLe)))}
          </span>
        )}
        <button
          type="button"
          disabled={pending}
          aria-pressed={declare}
          onClick={() =>
            startTransition(async () => {
              if (declare)
                await retirerDeclaration(etablissementId, obligationId);
              else await declarerEnPlace(etablissementId, obligationId);
            })
          }
          className="inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-[7px] text-[12.5px] transition-colors disabled:opacity-60"
          style={
            declare
              ? {
                  borderColor: "var(--board-slate-line)",
                  background: "var(--board-slate-pale)",
                  color: "var(--board-slate-mid)",
                }
              : {
                  borderColor: "var(--board-blue-soft)",
                  background: "var(--board-blue-pale)",
                  color: "var(--board-blue-ink)",
                }
          }
        >
          {declare && <Check className="size-3.5" aria-hidden />}
          {pending ? ATTENTE : declare ? libelleRetour() : geste}
        </button>
      </div>
    </li>
  );
}
