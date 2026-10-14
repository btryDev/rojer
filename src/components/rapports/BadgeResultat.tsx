import type { ResultatVerification } from "@prisma/client";
import { LABEL_RESULTAT } from "@/lib/rapports/resultats";

// Champs du board, alignés sur `BadgeStatut` : le résultat d'un rapport
// et le statut de la vérification qui le porte s'affichent à quelques
// centimètres l'un de l'autre — en Tailwind `emerald`/`rose` d'un côté et
// en jetons du board de l'autre, les deux verts ne tombaient pas juste.
const CLASSE: Record<ResultatVerification, string> = {
  conforme: "bg-[color:var(--board-green)] text-[color:var(--board-green-ink)]",
  observations_mineures:
    "bg-[color:var(--board-amber)] text-[color:var(--board-amber-ink)]",
  ecart_majeur:
    "bg-[color:var(--board-signal)] text-[color:var(--board-signal-ink)]",
  non_verifiable:
    "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)]",
};

export function BadgeResultat({ resultat }: { resultat: ResultatVerification }) {
  return (
    <span className={`pastille-board ${CLASSE[resultat]}`}>
      {LABEL_RESULTAT[resultat]}
    </span>
  );
}
