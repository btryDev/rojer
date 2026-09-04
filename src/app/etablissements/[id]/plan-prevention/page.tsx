import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  CarteFiche,
  LegalBadge,
  LigneFiche,
  LignesFiche,
  PastilleFiche,
  TuileDate,
  TuileMuette,
  WhyCard,
} from "@/components/ui-kit";
import { requireEtablissement } from "@/lib/auth/scope";
import { ETAT_PLAN } from "@/lib/plan-prevention/etats";
import { listPlansPrevention } from "@/lib/plan-prevention/queries";
import { classerDate, type RegistreLigne } from "@/lib/calendrier/etats";
import { formaterDateCourteFr } from "@/lib/dates";

export const metadata = {
  title: "Plans de prévention",
};


/**
 * Le registre des plans de prévention, en charte board — jumeau de l'écran
 * des permis de feu, et bâti sur le même patron de liste : bandeau bord à
 * bord, gouttière `--board-gutter`, lignes du kit `fiche/`.
 *
 * Ce qu'il remplace : `AppTopbar`, colonne `max-w-4xl`, `cartouche` coiffé
 * d'un filet de couleur, et un `EmptyState` en charte papier.
 */
export default async function PlanPreventionListePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { etablissement } = await requireEtablissement(id);
  const plans = await listPlansPrevention(id);
  const maintenant = new Date();

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <header className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] py-[22px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0 flex-1">
            <Link
              href={`/etablissements/${id}`}
              className="board-eyebrow inline-flex items-center gap-2 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
            >
              <ArrowLeft className="size-3" aria-hidden />
              {etablissement.raisonDisplay}
            </Link>
            <h1 className="board-titre m-0 mt-2.5 text-[clamp(22px,2.2vw,27px)]">
              Plans de prévention
            </h1>
            <p className="m-0 mt-2 max-w-[68ch] text-[13.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
              Obligatoire pour toute entreprise extérieure qui intervient chez
              vous.
            </p>
          </div>

          <Link
            href={`/etablissements/${id}/plan-prevention/nouveau`}
            className={buttonVariants({ variant: "board", size: "board" })}
          >
            <Plus className="size-3.5" aria-hidden />
            Nouveau plan
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-7 px-[var(--board-gutter)] pt-6">
        {plans.length === 0 ? (
          /* État vide, pas état d'erreur : il dit ce que l'écran fera, d'où
             viendront les données, et ouvre une porte (charte § 6). */
          <section className="carte-board px-7 py-8 sm:px-8">
            <div className="flex max-w-[62ch] flex-col gap-3">
              <h2 className="board-titre m-0 text-[22px]">
                Vos plans de prévention
              </h2>
              <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                Dès qu&apos;une entreprise extérieure intervient chez vous
                (nettoyage, entretien, travaux, livraisons régulières…), vous
                devez analyser conjointement les risques d&apos;interférence.
                Cette liste conserve l&apos;historique de ces analyses.
              </p>
              <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                Créez un plan pour votre prochaine intervention. Le diagnostic
                intégré vous dit si l&apos;<strong>écrit</strong>{" "}
                est
                obligatoire ; le plan lui-même est dû dès qu&apos;un risque
                d&apos;interférence existe, quelle que soit la durée.
              </p>
              <div className="mt-2">
                <Link
                  href={`/etablissements/${id}/plan-prevention/nouveau`}
                  className={buttonVariants({
                    variant: "board",
                    size: "board",
                  })}
                >
                  <Plus className="size-3.5" aria-hidden />
                  Créer un plan de prévention
                </Link>
              </div>
            </div>
          </section>
        ) : (
          /* Pas de sur-titre sur la carte : le `h1` nomme déjà la vue
             (interdit 12). */
          <CarteFiche corpsClassName="py-1.5">
            <LignesFiche>
              {plans.map((p) => {
                // Un plan clos est un acquis quelle que soit sa date. Un plan
                // annulé n'a plus de rendez-vous : lui peindre une tuile-date
                // annoncerait une intervention qui n'aura pas lieu.
                const etat: RegistreLigne =
                  p.statut === "clos"
                    ? "faite"
                    : classerDate(p.dateDebut, maintenant);
                const nbRisques = p._count.lignes;
                return (
                  <LigneFiche
                    key={p.id}
                    href={`/etablissements/${id}/plan-prevention/${p.id}`}
                    tuile={
                      p.statut === "annule" ? (
                        <TuileMuette>Annulé</TuileMuette>
                      ) : (
                        <TuileDate date={p.dateDebut} etat={etat} />
                      )
                    }
                    surtitre={
                      <span className="tabular-nums">
                        PP-{String(p.numero).padStart(3, "0")}
                      </span>
                    }
                    titre={p.entrepriseExterieureRaison}
                    detail={
                      <>
                        {nbRisques} risque{nbRisques > 1 ? "s" : ""} identifié
                        {nbRisques > 1 ? "s" : ""}
                        <span className="mt-0.5 block font-mono text-[11.5px] tabular-nums text-[color:var(--board-slate-soft)]">
                          Du {formaterDateCourteFr(p.dateDebut)} au{" "}
                          {formaterDateCourteFr(p.dateFin)}
                          {p.dureeHeuresEstimee
                            ? ` · ${p.dureeHeuresEstimee} h`
                            : ""}
                        </span>
                      </>
                    }
                    droite={
                      <PastilleFiche ton={ETAT_PLAN[p.statut].ton}>
                        {ETAT_PLAN[p.statut].mot}
                      </PastilleFiche>
                    }
                  />
                );
              })}
            </LignesFiche>
          </CarteFiche>
        )}

        <WhyCard
          charte="board"
          kicker="Pourquoi cette page"
          titre="Protéger les deux parties contre les risques d'interférence."
          enjeu="Une entreprise qui intervient chez vous fait intervenir son personnel dans votre environnement : si un accident survient faute d'analyse conjointe, votre responsabilité est engagée."
          tonalite="info"
        >
          {/* CE QUE LES 400 HEURES CONDITIONNENT, ET CE QU'ELLES NE
              CONDITIONNENT PAS. C'est R. 4512-6 qui fait naître le plan, dès
              que l'analyse conjointe révèle un risque d'interférence et quelle
              que soit la durée ; R. 4512-7 ne commande que l'ÉCRIT. Cette
              carte était la seule surface du module à préserver la
              distinction — « écrit obligatoire si… » — sans dire pour autant
              ce qui reste dû en dessous du seuil. Elle le dit maintenant :
              sous 400 heures, le dirigeant doit toujours coordonner et
              inspecter. Verbatim relevé le 2026-09-02
              (`referentiels/corpus/code-travail-plan-prevention.ts`). */}
          <p className="m-0">
            Le plan de prévention naît de l&apos;<strong>analyse conjointe des
            risques</strong>, dès qu&apos;un risque d&apos;interférence existe
            et quelle que soit la durée (art. R. 4512-6). Il doit être établi{" "}
            <strong>par écrit</strong> si les travaux atteignent{" "}
            <strong>400 h sur 12 mois</strong>{" "}
            OU figurent sur la liste des
            travaux dangereux de l&apos;arrêté du 19-03-1993 (art. R. 4512-7).
            Sous ce seuil, l&apos;inspection commune préalable et
            l&apos;accord sur les mesures restent dus.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <LegalBadge
              charte="board"
              reference="Art. R. 4512-6 à R. 4512-12 CT"
              href="https://www.legifrance.gouv.fr/codes/id/LEGISCTA000018529787/"
            />
            {/* Ici se tenait « Décret 92-158 », sans lien. Relu à la source
                le 2026-08-28 : ce décret a créé les art. R. 237-1 à
                R. 237-28 du code du travail, et ce sont EUX que le décret
                n° 2008-244 du 7 mars 2008 a ABROGÉS au 1er mai 2008 en les
                recodifiant. Sa propre fiche reste affichée « en vigueur »,
                parce que c'est un texte modificateur : l'abrogation se lit
                sur les articles du code, pas sur lui. Il est l'ancêtre des
                articles R. 4512-* cités ci-contre, pas une source en vigueur.
                Une pastille de source ne cite pas un texte abrogé — la
                filiation, si elle intéresse, se lit dans un commentaire de
                code, pas dans un écran qu'on ouvre devant un inspecteur. */}
            <LegalBadge
              charte="board"
              reference="Arrêté du 19 mars 1993 · Travaux dangereux"
              href="https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000179892/"
              extrait="Un plan de prévention est établi par écrit dans les conditions prévues au deuxième alinéa de l'article R. 4512-7 du code du travail pour les travaux dangereux ci-après énumérés."
            />
          </div>
        </WhyCard>
      </div>
    </main>
  );
}
