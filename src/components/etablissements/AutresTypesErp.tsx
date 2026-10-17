"use client";

import { useState } from "react";
import { TYPE_ERP } from "@/lib/etablissements/schema";
import { LABEL_TYPE_ERP } from "@/lib/etablissements/labels";
import { CHAMP_TEMOIN_TYPES_ERP_AUTRES } from "@/lib/etablissements/types-erp-affiches";

/** La case à cocher du board : encre pleine à l'état coché, filet d'ardoise. */
const CASE_A_COCHER =
  "mt-0.5 size-4 flex-none rounded border-[color:var(--board-slate)] accent-[color:var(--board-ink)]";

/**
 * Les autres types d'ERP d'un établissement qui groupe plusieurs exploitations
 * (ADR-045, arrêté du 25 juin 1980, art. GN 2).
 *
 * REPLIÉ PAR DÉFAUT, et c'est la règle de la propriétaire contre le zèle : la
 * majorité des établissements n'a qu'un type, et ne doit rien voir de plus
 * qu'avant — un lien, aucun champ obligatoire. Il s'ouvre de lui-même quand
 * des types sont déjà cochés : un dossier à plusieurs types voit les siens.
 *
 * Deux usages :
 *  - formulaire natif (fiche établissement) : `nom` donné, les cases portent
 *    ce nom et un champ TÉMOIN est posté. Sans lui, des cases toutes
 *    décochées ne posteraient rien, et l'action ne saurait pas distinguer
 *    « je retire tous les autres types » de « le champ n'était pas affiché » ;
 *  - état contrôlé (parcours d'accueil) : pas de `nom`, le shell poste.
 */
export function AutresTypesErp({
  typeErp,
  valeurs,
  onChange,
  nom,
  erreur,
  signalOuverture = 0,
}: {
  /** Le premier type, déjà choisi au-dessus : il n'est pas proposé ici. */
  typeErp: string;
  valeurs: readonly string[];
  onChange: (valeurs: string[]) => void;
  nom?: string;
  erreur?: string;
  /**
   * Incrémenté par l'écran quand un changement du PREMIER type coche ou
   * décoche une case (revue du lot 3, C3) : le panneau s'ouvre, pour que ce
   * qui a changé se voie.
   */
  signalOuverture?: number;
}) {
  const proposes = TYPE_ERP.filter((t) => t !== typeErp);
  // Ouvert AU MONTAGE seulement s'il y a déjà des types (revue du lot 3, C2) :
  // lié à `valeurs`, décocher le dernier type repliait le panneau, et le
  // focus restait sur une case devenue invisible. Ensuite, c'est le
  // dirigeant qui l'ouvre ou le ferme.
  const [ouvert, setOuvert] = useState(valeurs.length > 0);
  // Ajustement pendant le rendu, et non dans un effet : le signal ouvre le
  // panneau au rendu même où les cases changent.
  const [signalVu, setSignalVu] = useState(signalOuverture);
  if (signalOuverture !== signalVu) {
    setSignalVu(signalOuverture);
    setOuvert(true);
  }
  const bascule = (t: string, coche: boolean) =>
    onChange(
      coche
        ? TYPE_ERP.filter((x) => x === t || valeurs.includes(x))
        : valeurs.filter((x) => x !== t),
    );

  return (
    <div className="flex flex-col gap-2">
      {nom ? <input type="hidden" name={CHAMP_TEMOIN_TYPES_ERP_AUTRES} value="1" /> : null}
      <details
        open={ouvert}
        onToggle={(e) => setOuvert(e.currentTarget.open)}
        className="group"
      >
        <summary className="inline-flex cursor-pointer list-none items-center gap-2 text-[12.5px] font-semibold text-[color:var(--board-slate-ink)] transition-colors hover:text-[color:var(--board-ink)]">
          <span
            aria-hidden
            className="transition-transform group-open:rotate-90 motion-reduce:transition-none"
          >
            ›
          </span>
          Votre arrêté d&apos;ouverture mentionne plusieurs types ? (par
          exemple, un hôtel avec restaurant)
        </summary>

        <fieldset
          aria-describedby={erreur ? "typesErpAutres-aide typesErpAutres-erreur" : "typesErpAutres-aide"}
          className="m-0 mt-3 flex flex-col gap-3 border-0 p-0"
        >
          <legend className="sr-only">Autres types d&apos;ERP de l&apos;établissement</legend>
          <p
            id="typesErpAutres-aide"
            className="m-0 max-w-[66ch] text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]"
          >
            Des exploitations groupées dans un même bâtiment, sans être isolées
            entre elles, forment un seul établissement : cochez les autres types
            que portent l&apos;arrêté d&apos;ouverture ou le procès-verbal de la
            commission de sécurité. La catégorie reste celle de l&apos;arrêté,
            une seule pour l&apos;ensemble (arrêté du 25 juin 1980, art. GN 2).
            Des exploitations isolées entre elles sont autant
            d&apos;établissements (art. GN 3) : déclarez-en un par exploitation.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {proposes.map((t) => (
              <label
                key={t}
                className="flex cursor-pointer items-start gap-3 text-[13px] leading-[1.4] text-[color:var(--board-ink)]"
              >
                <input
                  type="checkbox"
                  name={nom}
                  value={t}
                  checked={valeurs.includes(t)}
                  onChange={(e) => bascule(t, e.currentTarget.checked)}
                  // Sur les cases et non sur le fieldset : le rôle « group »
                  // n'admet pas aria-invalid (relecture du lot 3).
                  aria-invalid={erreur ? true : undefined}

                  className={CASE_A_COCHER}
                />
                <span>{LABEL_TYPE_ERP[t]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </details>
      {erreur ? (
        <p id="typesErpAutres-erreur" className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {erreur}
        </p>
      ) : null}
    </div>
  );
}
