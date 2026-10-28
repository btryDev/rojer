// « Évaluez les risques de vos salariés » en tête d'Équipe : le même cadre ambre
// que « Ce qu'il reste à faire » des Équipements (retour de la propriétaire du
// 2026-10-28). Ne se pose que tant qu'un fait d'activité reste sans réponse
// (décision du 2026-10-24) : tout répondu, les réponses se revoient au DUERP.

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { CadreACompleter, PuceACompleter } from "@/components/ui-kit/CadreACompleter";
import { pluriel } from "@/lib/rendu/pluriel";
import { enumerer } from "@/lib/etablissements/guide-par-module";

export function EvaluerRisquesACompleter({
  sansReponse,
  href,
}: {
  /** Les faits sans réponse, en nom court (« manutention », « écran »…). */
  sansReponse: string[];
  href: string;
}) {
  const n = sansReponse.length;
  if (n === 0) return null;

  return (
    <CadreACompleter id="evaluer-risques-titre" titre="Ce qu'il reste à faire">
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 max-w-[var(--board-mesure)]">
          <p className="m-0 flex items-center gap-2.5 text-[14px] font-semibold leading-[1.4] text-[color:var(--board-ink)]">
            <PuceACompleter />
            Évaluez les risques de vos salariés
          </p>
          <p className="m-0 mt-1 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-ink)]">
            {`${pluriel(n, "question")} sans réponse : ${enumerer(sansReponse)}. Elles décident des formations, du suivi et des consignes dus à une partie de l'effectif.`}
          </p>
        </div>
        <Link href={href} className={buttonVariants({ variant: "board", size: "boardSm" })}>
          Évaluer les risques →
        </Link>
      </div>
    </CadreACompleter>
  );
}
