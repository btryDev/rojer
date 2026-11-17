import { AppHeader } from "@/components/layout/AppHeader";
import { CadreDuDossier } from "@/components/layout/CadreDuDossier";
import { MarqueLectureSeule } from "@/components/quotas/MarqueLectureSeule";
import { comptesDeLaSession } from "@/lib/auth/compte";
import { getOptionalUser } from "@/lib/auth/require-user";
import { getOptionalUserEtablissement } from "@/lib/auth/scope";
import { listerEtablissementsDuCompte } from "@/lib/etablissements/queries";

/**
 * Les pages du compte (abonnement, membres, sécurité), dans le dossier
 * (décision de la propriétaire du 2026-11-17) : elles sortaient de l'app —
 * ni rail ni gélule, une colonne centrée comme la connexion.
 *
 * Elles portent sur le compte entier, mais le rail mène toujours aux pages
 * d'un établissement : il mène à celui sur lequel on travaillait
 * (`getOptionalUserEtablissement` : le cookie de la gélule, revalidé par
 * compte, sinon le plus ancien). Aucune entrée ne s'y allume
 * (`deduireActif`). Le rail garde ses pastilles, comme partout (ADR-015) ;
 * le bandeau et la zone de saisie du site ne sont pas repris — la page
 * montre elle-même l'état de l'abonnement.
 *
 * Sans établissement encore (essai démarré, mise en place quittée avant la
 * fin) ou sans compte, le rail n'aurait nulle part où mener : l'en-tête des
 * écrans hors du dossier le remplace (`AppHeader` : la marque, la mise en
 * place, la sortie).
 *
 * Les lectures du compte attendent l'établissement : `comptesDeLaSession`
 * renvoie à la mise en place sans compte.
 */
export default async function CompteLayout({ children }: { children: React.ReactNode }) {
  const etablissement = await getOptionalUserEtablissement();
  if (!etablissement) {
    return (
      <div className="flex min-h-screen flex-col bg-[color:var(--board-canvas)]">
        <MarqueLectureSeule />
        <AppHeader />
        {children}
      </div>
    );
  }

  const [user, fratrie, comptes] = await Promise.all([
    getOptionalUser(),
    listerEtablissementsDuCompte(),
    comptesDeLaSession(),
  ]);
  return (
    <CadreDuDossier etablissement={etablissement} email={user?.email ?? null} fratrie={fratrie} comptes={comptes}>
      {children}
    </CadreDuDossier>
  );
}
