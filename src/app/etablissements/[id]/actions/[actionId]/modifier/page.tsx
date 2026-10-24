import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FormulairePoint } from "@/components/points-a-corriger/FormulairePoint";
import { getAction } from "@/lib/actions/queries";
import { modifierActionPlan } from "@/lib/actions/plan";
import { cleJourCivil } from "@/lib/dates";
import { estActionOuverte } from "@/lib/dates/retard";

/**
 * Corriger une action du plan.
 *
 * L'écran manquait, et `modifierActionPlan` existait sans appelant (audit du
 * 2026-10-12) : une échéance ou un responsable mal saisis ne se corrigeaient
 * qu'en supprimant l'action. Le formulaire est celui de la création, prérempli,
 * et l'action serveur en reprend le schéma.
 *
 * Une mesure du DUERP se corrige dans le DUERP, une action levée ou abandonnée
 * se rouvre d'abord : la fiche ne propose « Modifier » dans aucun de ces cas,
 * et une URL tapée à la main y renvoie.
 */
export default async function ModifierActionPage({
  params,
}: {
  params: Promise<{ id: string; actionId: string }>;
}) {
  const { id, actionId } = await params;
  const a = await getAction(actionId);
  if (!a || a.etablissementId !== id) notFound();

  const fiche = `/etablissements/${id}/actions/${actionId}`;
  if (a.risqueId || !estActionOuverte(a)) redirect(fiche);

  const action = modifierActionPlan.bind(null, actionId);

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <header className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] py-[22px]">
        <Link
          href={fiche}
          className="board-eyebrow inline-flex items-center gap-2 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
        >
          <ArrowLeft className="size-3" aria-hidden />
          {a.libelle}
        </Link>
        <h1 className="board-titre m-0 mt-2.5 text-[clamp(22px,2.2vw,27px)]">
          Corriger l&apos;action
        </h1>
      </header>

      <div className="px-[var(--board-gutter)] pt-6">
        <div className="carte-board max-w-[760px] px-7 py-7 sm:px-8">
          <FormulairePoint
            action={action}
            defauts={{
              libelle: a.libelle,
              description: a.description,
              type: a.type,
              criticite: a.criticite,
              echeance: a.echeance ? cleJourCivil(a.echeance) : null,
              responsable: a.responsable,
            }}
            labelAnnuler={{ libelle: "Annuler", href: fiche }}
          />
        </div>
      </div>
    </main>
  );
}
