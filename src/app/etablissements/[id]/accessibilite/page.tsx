import Link from "next/link";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { LegalBadge, PastilleFiche, WhyCard } from "@/components/ui-kit";
import { buttonVariants } from "@/components/ui/button";
import { FormSection1 } from "@/components/accessibilite/FormSection1";
import { FormSection2 } from "@/components/accessibilite/FormSection2";
import { FormSection3 } from "@/components/accessibilite/FormSection3";
import { FormSection4 } from "@/components/accessibilite/FormSection4";
import { PublicationPanel } from "@/components/accessibilite/PublicationPanel";
import { requireEtablissement } from "@/lib/auth/scope";
import {
  calculerProgression,
  getRegistreAccessibilite,
} from "@/lib/accessibilite/queries";
import { genererQrCodeDataUrl } from "@/lib/accessibilite/qrcode";
import { publicAppUrl } from "@/lib/email";

export const metadata = {
  title: "Registre d'accessibilité ERP",
};

/**
 * Les quatre rubriques de l'arrêté du 19 avril 2017, chacune dépliable.
 *
 * La numérotation reste : ici l'ordre porte une information — ce sont les
 * quatre rubriques que le texte énumère, et un contrôleur les cherche dans
 * cet ordre. C'est l'exception que la règle du kit prévoit
 * (`SectionChamps` ne numérote pas, faute d'ordre signifiant).
 *
 * Le liseré de tête coloré du papier disparaît : le board ne peint pas un
 * état sur une bande, il le dit par une pastille — un champ, une encre, et
 * le mot (interdit 10).
 */
function Section({
  numero,
  titre,
  sousTitre,
  rempli,
  children,
}: {
  numero: string;
  titre: string;
  sousTitre: string;
  rempli: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="carte-board group" open={!rempli}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-7 py-5 sm:px-8">
        <div className="flex items-baseline gap-4">
          <span className="font-mono text-[22px] font-light tabular-nums text-[color:var(--board-slate-soft)]">
            {numero}
          </span>
          <div>
            <p className="board-titre m-0 text-[17px]">{titre}</p>
            <p className="m-0 mt-1 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
              {sousTitre}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* « Rempli » est un fait de saisie, jamais « conforme » : le vert
              du board dit qu'on a renseigné, pas que le droit est satisfait
              (interdits 16-17). */}
          {rempli && <PastilleFiche ton="fait">Rempli</PastilleFiche>}
          <span
            aria-hidden
            className="text-[12px] text-[color:var(--board-slate-mid)] transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </div>
      </summary>
      <div className="border-t border-[color:var(--board-slate-line)] px-7 py-7 sm:px-8">
        {children}
      </div>
    </details>
  );
}

export default async function AccessibilitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { etablissement } = await requireEtablissement(id);

  if (!etablissement.estERP) {
    return (
      <>
        <AppTopbar
          title="Registre d'accessibilité"
          crumbs={[
            { href: `/etablissements/${id}`, label: etablissement.raisonDisplay },
            { label: "Accessibilité" },
          ]}
        />
        <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] px-[var(--board-gutter)] pt-7 pb-16">
          <section className="carte-board px-7 py-8 sm:px-8">
            <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
              Non applicable
            </p>
            <h1 className="board-titre m-0 mt-2 text-[clamp(22px,2.2vw,27px)]">
              Cet établissement n&apos;est pas un ERP
            </h1>
            <p className="m-0 mt-3 max-w-[66ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
              Le registre d&apos;accessibilité est une obligation qui ne concerne
              que les <strong>Établissements Recevant du Public</strong>{" "}
              (restaurants, commerces, bureaux ouverts au public…). Vous pouvez
              modifier le régime de votre établissement si celui-ci doit être
              déclaré ERP.
            </p>
            <div className="mt-5">
              <Link
                href={`/etablissements/${id}/modifier`}
                className={buttonVariants({
                  variant: "boardClair",
                  size: "board",
                })}
              >
                Modifier la fiche établissement →
              </Link>
            </div>
          </section>
        </main>
      </>
    );
  }

  const registre = await getRegistreAccessibilite(id);
  const progression = calculerProgression(registre);

  // Génération du QR code — seulement si un slug existe déjà.
  let qrDataUrl = "";
  let urlPublique = "";
  if (registre?.slugPublic) {
    urlPublique = `${publicAppUrl()}/accessibilite/${registre.slugPublic}`;
    qrDataUrl = await genererQrCodeDataUrl(urlPublique);
  }

  const section1Rempli = Boolean(
    registre?.prestationsFournies && registre.handicapsAccueillis.length > 0,
  );
  const section2Rempli = Boolean(registre?.conformiteRegime);
  const section3Rempli = Boolean(
    registre?.personnelForme || registre?.dateDerniereFormation,
  );
  const section4Rempli = Boolean(
    registre?.equipementsAccessibilite && registre?.modalitesMaintenance,
  );

  return (
    <>
      <AppTopbar
        title="Registre d'accessibilité"
        subtitle="Document obligatoire pour tout ERP — à tenir à disposition du public."
        crumbs={[
          { href: `/etablissements/${id}`, label: etablissement.raisonDisplay },
          { label: "Accessibilité" },
        ]}
      />

      <main className="flex flex-1 flex-col gap-7 bg-[color:var(--board-canvas)] px-[var(--board-gutter)] pt-7 pb-16">
        {/* Why */}
        <WhyCard
          charte="board"
          kicker="Obligation"
          titre="Ce que la loi attend de vous"
          enjeu={
            registre?.publie
              ? "Votre registre est publié. Continuez à le tenir à jour à chaque changement."
              : "Tout ERP doit tenir à disposition du public un registre décrivant les dispositions d'accessibilité prises. Objectif : permettre à une personne en situation de handicap de savoir, avant de venir, ce qu'elle trouvera sur place."
          }
          tonalite={registre?.publie ? "ok" : "info"}
        >
          {/* Deux erreurs, relues à la source le 2026-08-28.
              — `D. 111-19-33` n'institue pas le registre public
                d'accessibilité : R. 111-19-33 portait l'attestation
                d'accessibilité, et il est abrogé depuis 2021. Le registre
                vient de R. 111-19-60, devenu **R. 164-6 CCH** à la
                recodification du 1er juillet 2021. L'extrait ci-dessous était
                d'ailleurs déjà celui de cet article-là.
              — `JORFTEXT000034463079` ne désigne aucun texte. L'arrêté du
                19 avril 2017 est `JORFTEXT000034454237`, et il est cité dans
                le complément, là où il agit : il fixe le contenu, il
                n'institue rien. */}
          <LegalBadge
            charte="board"
            reference="Art. R. 164-6 CCH · Registre d'accessibilité"
            href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819305"
            extrait="L'exploitant de tout établissement recevant du public au sens de l'article R. 143-2 élabore le registre public d'accessibilité prévu à l'article L. 164-1. Celui-ci précise les dispositions prises pour permettre à tous, notamment aux personnes handicapées, quel que soit leur handicap, de bénéficier des prestations en vue desquelles cet établissement a été conçu."
          >
            L&apos;arrêté du 19 avril 2017 définit{" "}
            <strong>4 rubriques obligatoires</strong>{" "}
            : prestations fournies,
            pièces administratives d&apos;accessibilité, formation du
            personnel, et modalités de maintenance.
          </LegalBadge>
        </WhyCard>

        {/* Progression */}
        <div className="carte-board flex items-center gap-4 px-7 py-6 sm:px-8">
          <div className="relative h-14 w-14 shrink-0">
            <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="var(--board-slate-line)"
                strokeWidth="2"
              />
              {/* Complet = tout est renseigné, un fait de saisie : le vert du
                  board. En cours = le registre calme et actif du bleu, pas
                  l'ambre, qui est l'attention et non l'inachevé (interdit 4). */}
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke={
                  progression === 100
                    ? "var(--board-green-ink)"
                    : "var(--board-blue-ink)"
                }
                strokeWidth="2"
                strokeDasharray={`${progression} 100`}
                pathLength={100}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-mono text-[12.5px] font-semibold tabular-nums text-[color:var(--board-ink)]">
              {progression}%
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
              {progression === 0
                ? "Registre vide"
                : progression === 100
                  ? "Registre complet"
                  : "En cours de remplissage"}
            </p>
            <p className="m-0 mt-1 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
              {progression < 100
                ? "Remplissez chaque section en plusieurs passes — rien n'est bloquant."
                : "Toutes les rubriques de l'arrêté sont renseignées."}
            </p>
          </div>
        </div>

        {/* Publication */}
        {registre && (
          <PublicationPanel
            etablissementId={id}
            slugPublic={registre.slugPublic}
            publie={registre.publie}
            urlPublique={urlPublique}
            qrDataUrl={qrDataUrl}
          />
        )}

        {/* Sections */}
        <div className="flex flex-col gap-4">
          <Section
            numero="01"
            titre="Prestations fournies au public"
            sousTitre="Ce que vous proposez et à qui"
            rempli={section1Rempli}
          >
            <FormSection1
              etablissementId={id}
              initial={
                registre
                  ? {
                      prestationsFournies: registre.prestationsFournies,
                      handicapsAccueillis: registre.handicapsAccueillis,
                      servicesAdaptes: registre.servicesAdaptes,
                    }
                  : null
              }
            />
          </Section>

          <Section
            numero="02"
            titre="Régime de conformité et pièces administratives"
            sousTitre="Attestation, Ad'AP, dérogation — état juridique"
            rempli={section2Rempli}
          >
            <FormSection2
              etablissementId={id}
              initial={
                registre
                  ? {
                      conformiteRegime: registre.conformiteRegime,
                      dateConformite: registre.dateConformite,
                      numeroAttestationAccess: registre.numeroAttestationAccess,
                      dateDepotAdap: registre.dateDepotAdap,
                    }
                  : null
              }
            />
          </Section>

          <Section
            numero="03"
            titre="Formation du personnel d'accueil"
            sousTitre="Actions de formation réalisées"
            rempli={section3Rempli}
          >
            <FormSection3
              etablissementId={id}
              initial={
                registre
                  ? {
                      personnelForme: registre.personnelForme,
                      dateDerniereFormation: registre.dateDerniereFormation,
                      organismeFormation: registre.organismeFormation,
                      effectifForme: registre.effectifForme,
                    }
                  : null
              }
            />
          </Section>

          <Section
            numero="04"
            titre="Équipements et maintenance"
            sousTitre="Ce qui est installé et comment c'est entretenu"
            rempli={section4Rempli}
          >
            <FormSection4
              etablissementId={id}
              initial={
                registre
                  ? {
                      equipementsAccessibilite: registre.equipementsAccessibilite,
                      modalitesMaintenance: registre.modalitesMaintenance,
                      dernierControleMaintenance:
                        registre.dernierControleMaintenance,
                    }
                  : null
              }
            />
          </Section>
        </div>
      </main>
    </>
  );
}
