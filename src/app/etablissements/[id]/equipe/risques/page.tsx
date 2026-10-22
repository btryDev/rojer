import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FaitActiviteRow } from "@/components/salaries/FaitActiviteRow";
import { requireEtablissement } from "@/lib/auth/scope";
import {
  FAITS_ACTIVITE,
  intituleDuFait,
  type ChampFaitActivite,
} from "@/lib/etablissements/faits-activite";
import { chargerFaitsActivite } from "@/lib/etablissements/faits-activite-queries";
import { LigneCompacte } from "@/components/etats-permanents/LigneCompacte";
import { RevueEnPlace } from "@/components/etats-permanents/RevueEnPlace";
import { ancreEtatPermanent } from "@/lib/etats-permanents/ancre";
import { faitDeLaLigne } from "@/lib/etats-permanents/par-les-risques";
import {
  etatsPermanentsDuDossier,
  type LigneEtatPermanent,
} from "@/lib/etats-permanents/queries";
import { dessinDe, etatCourtDe, versFiche } from "@/lib/etats-permanents/vers-fiche";

/**
 * « Évaluer les risques de vos salariés » — les seules questions qui rendent
 * dues des formations ou un suivi (ADR-041).
 *
 * Un écran court, oui / non, qu'on remplit sans avoir commencé son DUERP : la
 * réponse vit sur l'établissement, et le DUERP la reprend telle quelle dans son
 * étape « Questions transverses ». Rien n'est reposé deux fois.
 *
 * CE QUE LA RÉPONSE REND DÛ SE DÉCLARE ICI (2026-10-21, décision de la
 * propriétaire). Les lignes de « Ce qui doit être en place » qu'un fait
 * d'activité fait naître — formation à la manutention, au travail sur écran,
 * habilitation électrique, carnet de prescriptions — s'affichent sous leur
 * question, avec la même fiche (`RevueEnPlace`), et ont quitté l'écran « en
 * place » (`par-les-risques.ts`). Un « non » les retire (le moteur), un silence
 * les garde « à confirmer » (ADR-041).
 */
export default async function RisquesSalariesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, etablissement } = await requireEtablissement(id);
  const [faits, dossier] = await Promise.all([
    chargerFaitsActivite(id),
    etatsPermanentsDuDossier(id, user.id),
  ]);
  if (!faits) notFound();
  const contexte = { etablissementId: id, entrepriseId: etablissement.entrepriseId };
  // Rangées une fois par fait, lues ensuite par question.
  const parFait = new Map<ChampFaitActivite, LigneEtatPermanent[]>();
  for (const l of dossier.parLesRisques) {
    const champ = faitDeLaLigne(l.obligation);
    if (champ) parFait.set(champ, [...(parFait.get(champ) ?? []), l]);
  }
  const lignesDuFait = (champ: ChampFaitActivite) => parFait.get(champ) ?? [];
  // L'ordre de la fiche suit celui des questions : Précédente et Suivante
  // parcourent ce que l'écran montre.
  const lignesFiche = FAITS_ACTIVITE.flatMap((f) =>
    lignesDuFait(f.champ).map((l) =>
      versFiche(l, { ...contexte, surTitre: "Évaluer les risques de vos salariés" }),
    ),
  );

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
      <RevueEnPlace etablissementId={id} lignes={lignesFiche}>
      <ul className="m-0 flex list-none flex-col gap-3 px-[var(--board-gutter)] pt-6">
        {FAITS_ACTIVITE.map((f) => {
          const lignes = lignesDuFait(f.champ);
          return (
            <FaitActiviteRow
              key={f.champ}
              etablissementId={id}
              champ={f.champ}
              intitule={intituleDuFait(f)}
              pourquoi={f.pourquoi}
              valeur={faits[f.champ]}
            >
              {lignes.length > 0 && (
                <div className="mt-5 border-t border-[color:var(--board-slate-line)] pt-4">
                  <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                    À mettre en place
                  </p>
                  <ul className="m-0 mt-2.5 grid list-none gap-1.5 p-0 sm:grid-cols-2">
                    {lignes.map((l) => (
                      <LigneCompacte
                        key={l.obligation.id}
                        obligationId={l.obligation.id}
                        ancre={ancreEtatPermanent(l.obligation.id)}
                        libelle={l.obligation.libelle}
                        {...dessinDe(l)}
                        etat={etatCourtDe(l)}
                        aConfirmer={l.aConfirmer !== null || l.questionsSansReponse.length > 0}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </FaitActiviteRow>
          );
        })}
      </ul>
      </RevueEnPlace>
    </main>
  );
}
