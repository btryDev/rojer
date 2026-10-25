import { requireEtablissement } from "@/lib/auth/scope";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { BarreCompte } from "@/components/layout/BarreCompte";
import { chargerSidebarCounts } from "@/lib/navigation/sidebar-counts";
import { getEtatModules } from "@/lib/etablissements/modules";
import { listerEtablissementsDeLEntreprise } from "@/lib/etablissements/queries";

/**
 * Layout imbriqué pour toutes les pages d'un établissement.
 *
 * Rôles :
 *   1. Garde d'ownership (`requireEtablissement`, scopé par userId).
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
  const { user, etablissement } = await requireEtablissement(id);
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

  // Pastilles de la sidebar : même chargement que le shell DUERP, pour
  // que les deux annoncent les mêmes nombres (ADR-015).
  //
  // La fratrie vient avec, pour le sélecteur de la barre haute (ADR-028). Elle
  // est lue ici et non dans `BarreCompte` : le composant est client, et la
  // charger depuis le layout la met dans le même aller-retour que le reste.
  const [counts, modules, fratrie] = await Promise.all([
    chargerSidebarCounts(id),
    getEtatModules(id, etab.estERP),
    listerEtablissementsDeLEntreprise(etab.entrepriseId),
  ]);

  return (
    <div className="grid min-h-screen grid-cols-1 lg:h-screen lg:grid-cols-[auto_1fr] lg:overflow-hidden">
      <AppSidebar
        etablissement={etab}
        counts={counts}
        modules={modules}
      />
      {/* `relative` : la gélule de compte s'y positionne, en haut à droite. */}
      {/* `pt-[var(--reserve-gelule)]` : la place de la gélule, réservée par
          défaut ; un en-tête à fond la reprend (`.sous-la-gelule`). Sans
          elle, un formulaire ou une fiche passait sous la gélule. */}
      <div className="relative flex min-w-0 flex-col pt-[var(--reserve-gelule)] lg:overflow-y-auto">
        {/* Gélule de compte : la sidebar porte la hiérarchie du produit, la
            gélule les utilitaires de session. Elle flotte au-dessus du
            contenu, sans bande à elle. Cf. `BarreCompte`. */}
        <BarreCompte
          etablissementId={etab.id}
          email={user.email ?? null}
          etablissements={fratrie.map((e) => ({
            id: e.id,
            raisonDisplay: e.raisonDisplay,
          }))}
        />
        {children}
      </div>
    </div>
  );
}
