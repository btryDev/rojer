import { requireEtablissement } from "@/lib/auth/scope";
import { BarreCompte } from "@/components/layout/BarreCompte";
import { comptesDeLaSession } from "@/lib/auth/compte";
import { SidebarAvecPastilles } from "@/components/layout/SidebarAvecPastilles";
import { listerEtablissementsDuCompte } from "@/lib/etablissements/queries";
import { Suspense } from "react";
import { BandeauAbonnementDuCompte } from "@/components/abonnements/BandeauAbonnementDuCompte";
import { SaisieDuSite } from "@/components/quotas/SaisieDuSite";
import { MarqueLectureSeule } from "@/components/quotas/MarqueLectureSeule";

/**
 * Layout imbriqué pour toutes les pages d'un établissement.
 *
 * Rôles :
 *   1. Garde d'ownership (`requireEtablissement`, scopé par compte).
 *   2. Monte la sidebar persistante sur toutes les sous-pages — la
 *      sidebar déduit l'item actif depuis le pathname (cf. AppSidebar).
 *   3. Fait le scroll container à droite pour que la sidebar reste sticky.
 *
 * ~~Chaque page garde la liberté de rendre sa propre AppTopbar si elle
 * veut un en-tête avec actions contextuelles.~~ [2026-10-25 : les pages
 * d'entrée rendent l'en-tête commun (`EnTetePage`) ; leurs actions
 * descendent au-dessus de leur liste (`BarreDeListe`).]
 */
export default async function EtablissementLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // La garde d'appartenance, par la porte commune (404 si l'établissement
  // n'est pas au user). Mémoïsée sur le rendu (audit Next.js du 2026-10-14,
  // H2) : la vigilance prestataires de la barre latérale la redemandait, et
  // c'était une troisième lecture du même établissement.
  //
  // La fratrie, pour le sélecteur de la gélule (ADR-028), est lue en même
  // temps : une lecture des établissements du compte, qui ne dépend pas de
  // la garde. Elle est lue ici et non dans `BarreCompte` : le composant est
  // client.
  const [{ user, etablissement }, fratrie, comptes] = await Promise.all([
    requireEtablissement(id),
    listerEtablissementsDuCompte(),
    comptesDeLaSession(),
  ]);
  // Le client ne reçoit que ce que la barre affiche — l'entreprise chargée
  // par la garde reste ici.
  const etab = {
    id: etablissement.id,
    raisonDisplay: etablissement.raisonDisplay,
    adresse: etablissement.adresse,
    effectifSurSite: etablissement.effectifSurSite,
    entrepriseId: etablissement.entrepriseId,
    // Qualifie le registre d'accessibilité dans la sidebar (ERP seulement).
    estERP: etablissement.estERP,
  };

  return (
    // `md:` et non plus `lg:` (2026-10-29) : la tablette garde le rail, le
    // téléphone n'en a plus (`NavigationMobile`). `relative` : la marque du
    // téléphone s'y pose en haut à gauche, en face de la gélule.
    <div className="relative grid min-h-screen grid-cols-1 md:h-dvh md:grid-cols-[auto_1fr] md:overflow-hidden">
      {/* La barre s'affiche sans attendre ses pastilles, et la page se rend
          en même temps (plan performance, lot 3, `SidebarAvecPastilles`). */}
      <SidebarAvecPastilles etablissement={etab} />
      {/* `relative` : la gélule de compte s'y positionne, en haut à droite. */}
      {/* `pt-[var(--reserve-gelule)]` : la place de la gélule, réservée par
          défaut ; un en-tête à fond la reprend (`.sous-la-gelule`). Sans
          elle, un formulaire ou une fiche passait sous la gélule. */}
      {/* `pb-[var(--reserve-nav-bas)]` : la place de la barre du bas, sur
          téléphone seulement. */}
      <div className="relative flex min-w-0 flex-col pt-[var(--reserve-gelule)] pb-[var(--reserve-nav-bas)] md:overflow-y-auto">
        {/* Gélule de compte : la sidebar porte la hiérarchie du produit, la
            gélule les utilitaires de session. Elle flotte au-dessus du
            contenu, sans bande à elle. Cf. `BarreCompte`. */}
        {/* Lecture seule : masque ce qui mène à une écriture (`data-ecriture`). */}
        <MarqueLectureSeule />
        <BarreCompte
          etablissementId={etab.id}
          email={user.email ?? null}
          etablissements={fratrie}
          comptes={comptes.comptes}
          compteActif={comptes.actif}
        />
        {/* L'état de l'abonnement (ADR-053 § 3) : rien avant le lancement de
            l'offre, ni quand tout va bien ; la page ne l'attend pas. */}
        <Suspense fallback={null}>
          <BandeauAbonnementDuCompte />
        </Suspense>
        {/* La saisie fermée (lecture seule, abonnement, site gelé) s'annonce
            dès l'ouverture — le site gelé par son bandeau, en tête de chaque
            page : les formulaires qui écrivent ne partent plus pour être
            refusés (ADR-053 § 14, lot D). */}
        <div data-zone-saisie className="contents">
          <Suspense fallback={null}>
            <SaisieDuSite etablissementId={etab.id} />
          </Suspense>
          {children}
        </div>
      </div>
    </div>
  );
}
