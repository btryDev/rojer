"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { ReponseParametrage } from "@/lib/etablissements/parametrage";

/**
 * Une question de paramétrage posée et répondue **dans la checklist** —
 * ADR-025 § 7. Pas d'écran, pas de détour : le dirigeant lit la question et y
 * répond au même endroit, ce qui est aussi la raison pour laquelle elle peut
 * exister avant que le lot A8 lui donne un foyer.
 *
 * La réponse « oui » peut appeler une suite (déclarer la prescription de
 * l'assureur) : `suite` la nomme, et elle n'apparaît qu'une fois la réponse
 * enregistrée. Un lien affiché avant la réponse laisserait le dirigeant partir
 * saisir sa prescription sans que la question soit répondue — la checklist
 * rouvrirait la question à son retour, avec la prescription déjà là.
 *
 * `detailSiOui` ouvre un texte libre quand il est fourni (les EPI présents).
 * Il n'est demandé qu'après le clic sur « Oui », pour que la question ferme
 * quand la réponse est « non » — la plupart des dossiers.
 */
export function QuestionParametrage({
  action,
  labelOui = "Oui",
  labelNon = "Non",
  detailSiOui,
  suite,
}: {
  action: (
    prev: ReponseParametrage,
    fd: FormData,
  ) => Promise<ReponseParametrage>;
  labelOui?: string;
  labelNon?: string;
  /** Étiquette et exemple du texte libre ouvert par « Oui ». */
  detailSiOui?: { label: string; placeholder: string };
  /** Où aller une fois « oui » enregistré. */
  suite?: { href: string; libelle: string };
}) {
  const [state, formAction, pending] = useActionState(action, {
    status: "idle",
  });
  // `null` = personne n'a encore cliqué. Distinct de « a répondu non » :
  // le même booléen pour les deux rouvrirait le détail à chaque rendu.
  const [choix, setChoix] = useState<"oui" | "non" | null>(null);

  if (state.status === "success" || state.status === "success_avec_avertissement") {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p className="m-0 text-[12.5px] text-[color:var(--board-slate-mid)]">
          {state.status === "success" ? "Réponse enregistrée." : state.message}
        </p>
        {choix === "oui" && suite && (
          <Link
            href={suite.href}
            className={buttonVariants({ variant: "board", size: "boardSm" })}
          >
            {suite.libelle} →
          </Link>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3">
      {detailSiOui && choix === "oui" && (
        <div className="max-w-[52ch]">
          <label className="label-board" htmlFor="detail-parametrage">
            {detailSiOui.label}
          </label>
          <textarea
            id="detail-parametrage"
            name="detail"
            rows={2}
            className="champ-board"
            placeholder={detailSiOui.placeholder}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Des boutons de soumission, et non un radio puis un « Valider » :
            la question a deux réponses, chacune est un geste, et c'est le
            `name`/`value` du bouton cliqué qui part dans le FormData.
            Exception quand un détail est demandé : le premier clic sur
            « Oui » ne soumet pas, il ouvre le champ — sinon la réponse
            partirait avant que le texte libre ait pu être écrit. */}
        {detailSiOui && choix !== "oui" ? (
          <button
            type="button"
            onClick={() => setChoix("oui")}
            className={buttonVariants({
              variant: "boardClair",
              size: "boardSm",
            })}
          >
            {labelOui}
          </button>
        ) : (
          <button
            type="submit"
            name="reponse"
            value="oui"
            disabled={pending}
            onClick={() => setChoix("oui")}
            className={buttonVariants({ variant: "board", size: "boardSm" })}
          >
            {detailSiOui ? "Enregistrer" : labelOui}
          </button>
        )}
        <button
          type="submit"
          name="reponse"
          value="non"
          disabled={pending}
          onClick={() => setChoix("non")}
          className={buttonVariants({
            variant: "boardClair",
            size: "boardSm",
          })}
        >
          {labelNon}
        </button>
      </div>

      {state.status === "error" && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}
    </form>
  );
}
