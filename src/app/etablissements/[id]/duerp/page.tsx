import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { WhyCard } from "@/components/ui-kit/WhyCard";
import { LegalBadge } from "@/components/ui-kit/LegalBadge";
import { getEtablissement } from "@/lib/etablissements/queries";
import { creerDuerp } from "@/lib/duerps/actions";
import { EXTRAIT_R4121_2 } from "@/lib/referentiels/conformite/texte-r4121-2";

// Porte d'entrée DUERP depuis la sidebar (la nav ne connaît que
// l'etablissementId).
//
//  - DUERP avec secteur choisi → relais direct vers le wizard, comme
//    avant (pas de boucle : la cible est l'arbre /duerp/[id]).
//  - Sinon (aucun DUERP, ou DUERP « silencieux » créé sans secteur par
//    l'ancienne version de cette page) → page d'intro pédagogique, SANS
//    création silencieuse : le dirigeant sait ce qu'est ce document
//    avant d'être jeté dans le choix de secteur.
export default async function EtablissementDuerpPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Scope propriétaire (contrairement à l'ancien relais qui interrogeait
  // la table sans vérifier l'utilisateur).
  const etab = await getEtablissement(id);
  if (!etab) notFound();

  const duerp = etab.duerps[0] ?? null;
  if (duerp?.referentielSecteurId) {
    redirect(`/duerp/${duerp.id}/unites`);
  }

  const creerAction = creerDuerp.bind(null, id);

  return (
    // Écran d'application plein : la gouttière, pas une colonne centrée.
    // L'exception de largeur de la charte porte sur le wizard lui-même
    // (`duerp/[id]/layout.tsx`), pas sur cette porte d'entrée.
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <header className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] py-[22px]">
        <Link
          href={`/etablissements/${id}`}
          className="board-eyebrow inline-flex items-center gap-2 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
        >
          <ArrowLeft className="size-3" aria-hidden />
          {etab.raisonDisplay}
        </Link>
        <p className="board-eyebrow m-0 mt-2.5 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          Document unique
        </p>
        <h1 className="board-titre m-0 mt-1.5 text-[clamp(22px,2.2vw,27px)]">
          Votre DUERP
        </h1>
      </header>

      <div className="flex flex-col gap-[22px] px-[var(--board-gutter)] pt-6">
        <WhyCard
          charte="board"
          kicker="Pourquoi ce document"
          titre="Le DUERP : votre évaluation des risques, posée par écrit"
          enjeu="Obligatoire dès le premier salarié."
          tonalite="info"
        >
          <p className="m-0">
            Vous décrivez votre activité, l&apos;outil vous propose les
            risques typiques de votre secteur, vous ajustez. Comptez une
            trentaine de minutes — tout est enregistré au fur et à mesure,
            vous pouvez vous arrêter et reprendre. L&apos;outil structure
            votre évaluation ; il ne certifie pas votre conformité.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <LegalBadge
              charte="board"
              reference="Art. R. 4121-1 CT"
              href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000023795562"
              extrait="L'employeur transcrit et met à jour dans un document unique les résultats de l'évaluation des risques pour la santé et la sécurité des travailleurs à laquelle il procède en application de l'article L. 4121-3."
            />
            <LegalBadge
              charte="board"
              reference="Art. R. 4121-2 CT"
              href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045386446"
              extrait={EXTRAIT_R4121_2}
            >
              <p>
                Trois cas de mise à jour. Seul le premier dépend de
                l&apos;effectif ; les deux autres valent pour tout employeur.
              </p>
            </LegalBadge>
            <LegalBadge
              charte="board"
              reference="Art. L. 4121-3-1 CT"
              href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043893919"
              extrait="Le document unique d'évaluation des risques professionnels […] est conservé, dans ses versions successives, […] pendant une durée qui ne peut être inférieure à quarante ans."
            >
              <p>
                C&apos;est pour cela que l&apos;outil fige une version à
                chaque validation : les versions successives se conservent,
                elles ne s&apos;écrasent pas.
              </p>
            </LegalBadge>
          </div>
        </WhyCard>

        <div className="carte-board flex flex-wrap items-center justify-between gap-4 px-7 py-6 sm:px-8">
          <p className="m-0 max-w-[62ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
            Première étape : choisir votre secteur d&apos;activité
            (restauration, commerce ou bureau — 3 secteurs couverts).
          </p>
          {duerp ? (
            <Link
              href={`/duerp/${duerp.id}/secteur`}
              className={buttonVariants({ variant: "board", size: "board" })}
            >
              Commencer mon DUERP →
            </Link>
          ) : (
            <form action={creerAction}>
              <button
                type="submit"
                className={buttonVariants({ variant: "board", size: "board" })}
              >
                Commencer mon DUERP →
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
