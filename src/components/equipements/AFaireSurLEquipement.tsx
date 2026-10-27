// « À faire sur cet équipement » : le bandeau ambre en tête de la fiche d'un
// appareil incomplet (retour de la propriétaire du 2026-10-27 — « l'indication
// de ce qu'il y a à faire dans une couleur »). Un bloc par geste, dans l'ordre
// où ils se font ; le bandeau disparaît quand tout est rempli.

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { CadreACompleter } from "@/components/ui-kit/CadreACompleter";
import { GESTE_DATE, GESTE_USAGE } from "@/lib/equipements/reste-a-faire";

const LIEN =
  "font-semibold text-[color:var(--board-amber-ink)] underline underline-offset-2 hover:text-[color:var(--board-ink)]";

export function AFaireSurLEquipement({
  questions,
  hrefModifier,
  aDater,
  miseEnService,
}: {
  /** Les questions exigées restées sans réponse, en clair. */
  questions: string[];
  hrefModifier: string;
  /** Les contrôles à rythme sans échéance connue, et où déposer leur rapport. */
  aDater: { id: string; libelle: string; hrefDepot: string }[];
  /**
   * Ce que la fiche dit de la mise en service sous les dates : `null` quand
   * aucun contrôle sans date n'est du référentiel ; sinon la phrase.
   */
  miseEnService: { connue: string; nombre: number } | { inconnue: true } | null;
}) {
  if (questions.length === 0 && aDater.length === 0) return null;

  return (
    <CadreACompleter id="a-faire-equipement" titre="À faire sur cet équipement" className="mt-4">
      <div className="mt-3 flex flex-col divide-y divide-[color:var(--board-amber)]">
        {questions.length > 0 ? (
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 py-3 first:pt-0">
            <div className="min-w-[220px] flex-1">
              <p className="m-0 text-[14px] font-semibold text-[color:var(--board-ink)]">
                {GESTE_USAGE}
                <span className="font-normal text-[color:var(--board-slate-mid)]">
                  {" "}
                  · {questions.length > 1 ? `${questions.length} questions sans réponse` : "une question sans réponse"}
                </span>
              </p>
              <ul className="m-0 mt-1 list-none p-0 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-ink)]">
                {questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
            <Link href={hrefModifier} className={buttonVariants({ variant: "board", size: "boardSm" })}>
              Répondre
            </Link>
          </div>
        ) : null}

        {aDater.length > 0 ? (
          <div className="py-3 first:pt-0 last:pb-0">
            <p className="m-0 text-[14px] font-semibold text-[color:var(--board-ink)]">{GESTE_DATE}</p>
            <p className="m-0 mt-0.5 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
              Sa date calcule le prochain contrôle.
            </p>
            <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
              {aDater.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                  <span className="text-[13px] leading-[1.4] text-[color:var(--board-slate-ink)]">{c.libelle}</span>
                  <Link href={c.hrefDepot} className={buttonVariants({ variant: "boardClair", size: "boardSm" })}>
                    Déposer le rapport
                  </Link>
                </li>
              ))}
            </ul>
            {miseEnService && "inconnue" in miseEnService ? (
              <p className="m-0 mt-3 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-ink)]">
                Appareil neuf, jamais contrôlé&nbsp;?{" "}
                <Link href={hrefModifier} className={LIEN}>
                  Renseignez plutôt sa date de mise en service
                </Link>
                &nbsp;: le premier contrôle se calcule à partir d&apos;elle.
              </p>
            ) : miseEnService ? (
              <p className="m-0 mt-3 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                {`La mise en service du ${miseEnService.connue} ne date pas ${miseEnService.nombre > 1 ? "ces contrôles" : "ce contrôle"} : le premier tombait avant le début du suivi dans Rojer.`}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </CadreACompleter>
  );
}
