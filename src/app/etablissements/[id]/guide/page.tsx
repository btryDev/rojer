import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { ChezVous } from "@/components/guide/ChezVous";
import { GReveal } from "@/components/guide/GReveal";
import { GuideHero } from "@/components/guide/GuideHero";
import { OutilsConformite } from "@/components/guide/OutilsConformite";
import { ParMetier } from "@/components/guide/ParMetier";
import { OutilDetails } from "@/components/guide/OutilDetails";
import { QuiFaitQuoi } from "@/components/guide/QuiFaitQuoi";
import { EnCasControle } from "@/components/guide/EnCasControle";
import { SourcesBloc } from "@/components/guide/SourcesBloc";
import { PrintButton } from "@/components/guide/PrintButton";
import { getEtablissement } from "@/lib/etablissements/queries";
import { listerEquipementsDeLEtablissement } from "@/lib/equipements/queries";
import { construireChezVous } from "@/lib/guide/chez-vous";
import { projeterEtablissement } from "@/lib/matching";
import { METIERS } from "@/lib/guide/metiers";

export const metadata = {
  title: "Comprendre vos obligations — Rojer",
};

/**
 * Page pédagogique — refonte éditoriale (HANDOFF-guide.md).
 * Chaque section est enveloppée d'un GReveal avec délais étagés
 * (0 → 280ms). Respecte prefers-reduced-motion.
 */
export default async function GuidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const etab = await getEtablissement(id);
  if (!etab) notFound();

  // Section personnalisée « Chez vous » : résolution déterministe des
  // obligations sur les déclarations réelles, avec la MÊME projection que le
  // générateur de calendrier — onze champs, pas neuf.
  //
  // La phrase était déjà écrite ici, et elle était fausse : les deux derniers
  // champs manquaient. Un établissement manipulant des matières R. 4227-22
  // voyait donc son calendrier engendrer trois obligations incendie quand
  // cette page n'en annonçait qu'une. Les champs sont désormais requis au type
  // (`matching/types.ts`), l'omission ne compile plus.
  const equipements = await listerEquipementsDeLEtablissement(id);
  const chezVous = construireChezVous(
    projeterEtablissement(etab),
    equipements.map((eq) => ({
      id: eq.id,
      libelle: eq.libelle,
      categorie: eq.categorie,
      caracteristiques: (eq.caracteristiques ?? null) as Record<
        string,
        unknown
      > | null,
    })),
    etab.entreprise.effectif,
  );

  const regimes: string[] = [];
  if (etab.estEtablissementTravail) regimes.push("Travail");
  if (etab.estERP)
    regimes.push(etab.categorieErp ? `ERP · ${etab.categorieErp}` : "ERP");
  // La classe n'est plus affichée depuis le 2026-09-03 : elle n'est plus
  // demandée, donc plus corrigible, et un guide qui affiche une valeur que son
  // lecteur ne peut plus reprendre lui montre une donnée morte.
  if (etab.estIGH) regimes.push("IGH");
  if (etab.estHabitation) regimes.push("Habitation");

  return (
    <>
      <AppTopbar
        title="Comprendre vos obligations"
        subtitle="Ce que la loi attend d'un employeur, traduit simplement. La plateforme vous aide à tenir le fil — elle ne certifie pas votre conformité."
        crumbs={[
          { href: `/etablissements/${id}`, label: etab.raisonDisplay },
          { label: "Comprendre" },
        ]}
        actions={
          <>
            <PrintButton />
            {/* La porte de la page des éléments exclus. Elle vit ici en
                attendant que le lot A8 range les écrans par axe : le guide
                est aujourd'hui le seul endroit où le produit parle de ce
                qu'il couvre, donc le seul d'où l'on peut aller lire ce
                qu'il ne couvre pas. */}
            {/* Les documents obligatoires ont leur page depuis que l'axe
                Documentation existe (ADR-030). Le guide y renvoie au lieu
                d'en garder une copie : deux montages du même composant, ce
                n'est pas deux vérités, mais c'est deux endroits où l'on croit
                l'avoir lue. */}
            <Link
              href={`/etablissements/${id}/documents`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Documents obligatoires
            </Link>
            <Link
              href={`/etablissements/${id}/perimetre`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Ce que Rojer ne couvre pas
            </Link>
            <Link
              href={`/etablissements/${id}/controle`}
              className={buttonVariants({ size: "sm" })}
            >
              Préparer un contrôle →
            </Link>
          </>
        }
      />

      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-20 px-6 py-10 pb-16 sm:gap-24 sm:px-10 sm:py-12">
        <GReveal delay={0}>
          <GuideHero />
        </GReveal>

        <GReveal delay={60}>
          <ChezVous
            data={chezVous}
            etablissementId={id}
            raisonDisplay={etab.raisonDisplay}
            regimes={regimes}
          />
        </GReveal>

        <GReveal delay={70}>
          <ParMetier metiers={METIERS} etablissementId={id} />
        </GReveal>

        <GReveal delay={80}>
          <OutilsConformite />
        </GReveal>

        <GReveal delay={120}>
          <OutilDetails etablissementId={id} />
        </GReveal>

        <GReveal delay={200}>
          <QuiFaitQuoi />
        </GReveal>

        <GReveal delay={240}>
          <EnCasControle etablissementId={id} />
        </GReveal>

        <GReveal delay={280}>
          <SourcesBloc />
        </GReveal>

        <footer className="border-t border-dashed border-[color:var(--board-slate-line)] pt-6 text-center font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[color:var(--board-slate-mid)]">
          § Guide rédigé à partir des sources primaires Légifrance + INRS ·
          Mis à jour 04/2026
        </footer>
      </div>
    </>
  );
}
