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
 * ~~`detailSiOui` ouvre un texte libre quand il est fourni (les EPI présents).~~
 * [2026-10-22, `lot/guide-par-module` : la question des EPI se répond sur la
 * fiche, le guide y renvoie ; le texte libre est retiré d'ici.]
 */
export function QuestionParametrage({
  action,
  labelOui = "Oui",
  labelNon = "Non",
  suite,
}: {
  action: (
    prev: ReponseParametrage,
    fd: FormData,
  ) => Promise<ReponseParametrage>;
  labelOui?: string;
  labelNon?: string;
  /** Où aller une fois « oui » enregistré. */
  suite?: { href: string; libelle: string };
}) {
  const [state, formAction, pending] = useActionState(action, {
    status: "idle",
  });
  // `null` = personne n'a encore cliqué : la suite n'apparaît qu'après un
  // « oui » enregistré.
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
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Des boutons de soumission, et non un radio puis un « Valider » :
            la question a deux réponses, chacune est un geste, et c'est le
            `name`/`value` du bouton cliqué qui part dans le FormData.
            Même poids pour « Oui » et « Non » : l'un plein, l'autre cerné se
            lisait comme un choix déjà fait (contrôle visuel du 2026-10-13). */}
        <button
          type="submit"
          name="reponse"
          value="oui"
          disabled={pending}
          onClick={() => setChoix("oui")}
          className={buttonVariants({
            variant: "boardClair",
            size: "boardSm",
          })}
        >
          {labelOui}
        </button>
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
