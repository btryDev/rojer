import { PageDuCompte } from "@/components/compte/PageDuCompte";
import { requireUser } from "@/lib/auth/require-user";

export const metadata = {
  title: "Accès en lecture seule — Rojer",
};

/**
 * Où renvoie une modification refusée à un membre en lecture seule
 * (`verifierSaisie`, ADR-054 § 4). Les boutons de saisie ne sont pas encore
 * masqués pour ce rôle (lot à part) : c'est ici qu'aboutit tout geste tenté.
 */
export default async function LectureSeulePage() {
  await requireUser();
  return (
    <PageDuCompte
      titre="Accès en lecture seule"
      description="Votre dernière modification n'a pas été enregistrée : sur ce compte, vous pouvez consulter et exporter les dossiers, pas les modifier."
    >
      <p className="m-0 max-w-[var(--board-mesure)] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
        Pour saisir, demandez à un propriétaire du compte de changer votre rôle.
      </p>
    </PageDuCompte>
  );
}
