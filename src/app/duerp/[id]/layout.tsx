import { SaisieDuSite } from "@/components/quotas/SaisieDuSite";
import { MarqueLectureSeule } from "@/components/quotas/MarqueLectureSeule";
import { Suspense } from "react";
import { BandeauAbonnementDuCompte } from "@/components/abonnements/BandeauAbonnementDuCompte";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { EnTetePage } from "@/components/entete-page/EnTetePage";
import { BarreDeListe } from "@/components/ui-kit/BarreDeListe";
import { BarreCompte } from "@/components/layout/BarreCompte";
import { comptesDeLaSession } from "@/lib/auth/compte";
import { getDuerp } from "@/lib/duerps/queries";
import { etapesDuDuerp, type EtapeId } from "@/lib/duerps/etapes";
import { FilDuDuerp } from "@/components/duerps/FilDuDuerp";

const PAGES_DU_FIL: readonly EtapeId[] = [
  "secteur",
  "activites",
  "unites",
  "risques",
  "transverses",
  "synthese",
];
import { getOptionalUser } from "@/lib/auth/require-user";
import { getEtatModules } from "@/lib/etablissements/modules";
import { listerEtablissementsDuCompte } from "@/lib/etablissements/queries";
import { chargerSidebarCounts } from "@/lib/navigation/sidebar-counts";
import {
  trouverReferentielParId,
  trouverReferentielParNaf,
} from "@/lib/referentiels";

/**
 * Shell V2 pour les pages DUERP — aligne /duerp/[id]/* sur le même
 * chrome que /etablissements/[id]/* : rail gauche persistant (AppSidebar
 * avec l'item "DUERP" actif) + topbar sticky avec crumbs → raison sociale
 * → DUERP. L'ancien header éditorial centré a été remplacé ; le contenu
 * interne (fil du wizard, carte de secteur, tableaux de risques) garde sa
 * largeur max-w-5xl pour préserver la lecture de type « document ».
 *
 * Cette largeur est l'exception nommée de la charte board (§ 5, « la
 * largeur de lecture ») : ces pages se lisent en phrases longues, et une
 * ligne de 1400 px ne se lit pas. Elle porte sur la largeur, et sur rien
 * d'autre — le contenu est en charte board comme partout ailleurs, d'où
 * le canvas posé ici : des cartes blanches sur `--paper` ne se
 * détachaient plus du fond.
 */
export default async function DuerpLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [duerp, user] = await Promise.all([
    getDuerp(id),
    getOptionalUser(),
  ]);
  if (!duerp) notFound();

  const etab = duerp.etablissement;
  // Le DUERP partage la sidebar de l'établissement : sans cet état ni ces
  // compteurs, registres et pastilles y seraient qualifiés autrement
  // qu'ailleurs dans le produit — entrer dans le wizard faisait
  // disparaître les retards (ADR-015).
  // La fratrie vient avec, pour le sélecteur de la barre haute : le shell DUERP
  // partage la même barre, donc la même règle (ADR-028).
  const [modules, counts, fratrie, comptes] = await Promise.all([
    getEtatModules(etab.id, etab.estERP),
    chargerSidebarCounts(etab.id),
    listerEtablissementsDuCompte(),
    comptesDeLaSession(),
  ]);
  // Secteur affiché dans le contexte : celui choisi dans le wizard en priorité,
  // sinon suggestion par NAF (même règle que la page secteur elle-même).
  const refChoisi = duerp.referentielSecteurId
    ? trouverReferentielParId(duerp.referentielSecteurId)
    : null;
  const refParNaf = trouverReferentielParNaf(duerp.etablissement.codeNaf);
  const ref = refChoisi ?? refParNaf;

  // Le fil des étapes, calculé pour chaque page : la mise en page ne sait pas
  // laquelle est ouverte, `FilDuDuerp` la lit sur l'adresse (2026-11-12).
  const etapesParPage = Object.fromEntries(
    PAGES_DU_FIL.map((page) => [page, etapesDuDuerp(duerp, page)]),
  ) as Record<EtapeId, ReturnType<typeof etapesDuDuerp>>;

  // Le PDF ne se propose qu'un DUERP complété (2026-11-12, décision de la
  // propriétaire) : les quatre étapes avant la synthèse faites. Télécharger
  // un document à moitié rempli n'a pas de sens ; l'aperçu reste ouvert à la
  // synthèse, où le DUERP se valide.
  const complete = etapesParPage.synthese
    .filter((e) => e.id !== "synthese")
    .every((e) => e.faite);

  const effectif = duerp.entreprise.effectif;
  const contexte = [
    `NAF ${duerp.etablissement.codeNaf}`,
    ...(ref ? [ref.nom] : []),
    `${effectif} salarié${effectif > 1 ? "s" : ""}`,
  ];

  return (
    // Mêmes largeurs que le shell d'établissement (2026-10-29).
    <div className="relative grid min-h-screen grid-cols-1 md:h-dvh md:grid-cols-[auto_1fr] md:overflow-hidden">
      <AppSidebar
        etablissement={{
          id: etab.id,
          raisonDisplay: etab.raisonDisplay,
          adresse: etab.adresse,
          effectifSurSite: etab.effectifSurSite,
          entrepriseId: etab.entrepriseId,
        }}
        active="duerp"
        counts={counts}
        modules={modules}
      />

      {/* `relative` : la gélule de compte s'y positionne, en haut à droite. */}
      {/* La place de la gélule, réservée par défaut (voir le shell
          d'établissement). */}
      <div className="relative flex min-w-0 flex-col bg-[color:var(--board-canvas)] pt-[var(--reserve-gelule)] pb-[var(--reserve-nav-bas)] md:overflow-y-auto">
        {/* Le compte se tient en haut à droite ici aussi : le shell DUERP
            partage la même sidebar, donc la même règle. */}
        {/* Lecture seule : masque ce qui mène à une écriture (`data-ecriture`). */}
        <MarqueLectureSeule />
        <BarreCompte
          etablissementId={etab.id}
          email={user?.email ?? null}
          etablissements={fratrie}
          comptes={comptes.comptes}
          compteActif={comptes.actif}
        />
        {/* L'état de l'abonnement (ADR-053 § 3), comme dans le dossier. */}
        <Suspense fallback={null}>
          <BandeauAbonnementDuCompte />
        </Suspense>
        {/* Le grand en-tête, sur chaque étape de l'assistant (décision de la
            propriétaire du 2026-10-25) — le même que la porte d'entrée
            (`etablissements/[id]/duerp`), pour que passer de l'une à
            l'autre ne se lise pas comme changer de page. Il remplace
            `AppTopbar`, son fil d'Ariane et sa pilule de secteur. */}
        <EnTetePage
          item="duerp"
          description="Votre évaluation des risques, unité de travail par unité. Tout est enregistré au fur et à mesure : vous pouvez vous arrêter et reprendre."
          pied={<FilDuDuerp etapesParPage={etapesParPage} />}
        />
        {/* Le contexte du document et sa sortie, au-dessus de l'étape : ce
            que l'en-tête portait à droite, il ne le porte plus. */}
        <div className="px-[var(--board-gutter)] pt-6">
          <BarreDeListe
            contexte={contexte}
            action={
              complete ? (
              // Une balise <a>, pas un <Link> : Next précharge les <Link>, et le
              // préchargement lancerait le rendu du PDF — il prendrait une des
              // deux places d'export de l'utilisateur avant son clic.
              <a
                href={`/duerp/${id}/pdf/preview`}
                className={buttonVariants({
                  variant: "boardClair",
                  size: "boardSm",
                })}
              >
                PDF DUERP ↓
              </a>
              ) : undefined
            }
          />
        </div>

        {/* La saisie fermée (lecture seule, abonnement, site gelé) s'annonce
            dès l'ouverture, comme sur les autres pages du site (ADR-053 § 14). */}
        <div data-zone-saisie className="mx-auto w-full max-w-5xl px-6 py-12 sm:px-10 sm:py-14">
          <Suspense fallback={null}>
            <SaisieDuSite etablissementId={etab.id} />
          </Suspense>
          {children}
        </div>
      </div>
    </div>
  );
}
