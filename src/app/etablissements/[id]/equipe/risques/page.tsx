import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FaitActiviteRow } from "@/components/salaries/FaitActiviteRow";
import { requireEtablissement } from "@/lib/auth/scope";
import { FAITS_ACTIVITE, intituleDuFait } from "@/lib/etablissements/faits-activite";
import { chargerFaitsActivite } from "@/lib/etablissements/faits-activite-queries";

/**
 * « Évaluer les risques de vos salariés » — les seules questions qui rendent
 * dues des formations ou un suivi (ADR-041).
 *
 * Un écran court, oui / non, qu'on remplit sans avoir commencé son DUERP : la
 * réponse vit sur l'établissement, et le DUERP la reprend telle quelle dans son
 * étape « Questions transverses ». Rien n'est reposé deux fois.
 */
export default async function RisquesSalariesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { etablissement } = await requireEtablissement(id);
  const faits = await chargerFaitsActivite(id);
  if (!faits) notFound();

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <header className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] py-[22px]">
        <Link
          href={`/etablissements/${id}/equipe`}
          className="board-eyebrow inline-flex items-center gap-2 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
        >
          <ArrowLeft className="size-3" aria-hidden />
          Équipe — {etablissement.raisonDisplay}
        </Link>
        <h1 className="board-titre m-0 mt-2.5 text-[clamp(22px,2.2vw,27px)]">
          Évaluer les risques de vos salariés
        </h1>
        <p className="m-0 mt-2 max-w-[68ch] text-[13.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
          Ces questions décident des formations et du suivi que le Code du
          travail rend dus à une partie de votre effectif. Répondez pour
          l&apos;établissement ; vous direz ensuite, sur la fiche de chaque
          personne, qui est concerné. Les mêmes réponses apparaissent dans votre
          DUERP.
        </p>
      </header>
      <ul className="m-0 flex list-none flex-col gap-3 px-[var(--board-gutter)] pt-6">
        {FAITS_ACTIVITE.map((f) => (
          <FaitActiviteRow
            key={f.champ}
            etablissementId={id}
            champ={f.champ}
            intitule={intituleDuFait(f)}
            pourquoi={f.pourquoi}
            valeur={faits[f.champ]}
          />
        ))}
      </ul>
    </main>
  );
}
