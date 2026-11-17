import type { ComponentProps, ReactNode } from "react";

import { BarreCompte } from "@/components/layout/BarreCompte";
import { SidebarAvecPastilles } from "@/components/layout/SidebarAvecPastilles";
import { MarqueLectureSeule } from "@/components/quotas/MarqueLectureSeule";
import type { comptesDeLaSession } from "@/lib/auth/compte";

type Props = {
  etablissement: ComponentProps<typeof SidebarAvecPastilles>["etablissement"];
  email: string | null;
  /** Les établissements du compte, pour le sélecteur de la gélule (ADR-028). */
  fratrie: ComponentProps<typeof BarreCompte>["etablissements"];
  comptes: Awaited<ReturnType<typeof comptesDeLaSession>>;
  children: ReactNode;
};

/**
 * Le cadre du dossier : le rail à gauche, la colonne de contenu à droite et
 * la gélule de compte qui y flotte. Partagé par les pages d'un établissement
 * et celles du compte (2026-11-17) ; ce qui est propre à chacune (bandeaux,
 * zone de saisie du site) passe en `children`. Les lectures restent dans
 * chaque layout, qui les lance ensemble.
 */
export function CadreDuDossier({ etablissement, email, fratrie, comptes, children }: Props) {
  return (
    // `md:` et non plus `lg:` (2026-10-29) : la tablette garde le rail, le
    // téléphone n'en a plus (`NavigationMobile`). `relative` : la marque du
    // téléphone s'y pose en haut à gauche, en face de la gélule.
    // `[--reserve-gelule:72px]` : la place de la gélule n'existe que là où
    // elle est (`globals.css`).
    <div className="relative grid min-h-screen grid-cols-1 [--reserve-gelule:72px] md:h-dvh md:grid-cols-[auto_1fr] md:overflow-hidden">
      {/* La barre s'affiche sans attendre ses pastilles, et la page se rend
          en même temps (plan performance, lot 3, `SidebarAvecPastilles`). */}
      <SidebarAvecPastilles etablissement={etablissement} />
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
          etablissementId={etablissement.id}
          email={email}
          etablissements={fratrie}
          comptes={comptes.comptes}
          compteActif={comptes.actif}
        />
        {children}
      </div>
    </div>
  );
}
