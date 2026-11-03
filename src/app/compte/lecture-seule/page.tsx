import { FilRetour } from "@/components/ui-kit/FilRetour";
import { requireUser } from "@/lib/auth/require-user";

export const metadata = {
  title: "Accès en lecture seule — Rojer",
};

/**
 * Où renvoie une modification refusée à un membre en lecture seule
 * (`verifierSaisie`, ADR-054 § 4). Les boutons de saisie sont masqués pour ce
 * rôle : on n'arrive ici que par un geste resté visible, ou un lien ancien.
 */
export default async function LectureSeulePage() {
  await requireUser();
  return (
    <main className="flex min-h-[calc(100vh-56px)] flex-col bg-[color:var(--board-canvas)] px-6 py-14 sm:px-10">
      <div className="mx-auto w-full max-w-[560px]">
        <FilRetour provenance={null} canonique={{ href: "/entreprises", label: "Mon dossier" }} />
        <h1 className="board-titre m-0 mt-6 text-[clamp(29px,3vw,39px)]">Accès en lecture seule</h1>
        <p className="m-0 mt-3 max-w-[var(--board-mesure)] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Votre dernière modification n&apos;a pas été enregistrée : sur ce compte, vous pouvez consulter et
          exporter les dossiers, pas les modifier.
        </p>
        <p className="m-0 mt-4 max-w-[var(--board-mesure)] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Pour saisir, demandez à un propriétaire du compte de changer votre rôle.
        </p>
      </div>
    </main>
  );
}
