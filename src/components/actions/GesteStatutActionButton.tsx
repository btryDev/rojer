"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useConfirmation } from "@/components/ui-kit/Confirmation";
import { abandonnerAction, rouvrirAction } from "@/lib/actions/plan";

/**
 * Les deux gestes qui changent le statut d'une action sans la clôturer :
 * rouvrir une action levée ou abandonnée, abandonner une action ouverte.
 * Avant le 2026-10-12, aucun écran ne les proposait — une clôture par erreur
 * ne se défaisait pas, et le statut « abandonnée » n'était atteint par rien.
 *
 * Chacun pose sa question avant d'agir, et la question dit ce qui part.
 */
type Geste = "rouvrir" | "abandonner";

export function GesteStatutActionButton({
  id,
  geste,
  avecJustificatif = false,
  point = false,
}: {
  id: string;
  geste: Geste;
  /** Rouvrir une action levée efface son justificatif : la question le dit. */
  avecJustificatif?: boolean;
  /** Un point à corriger (ADR-048) : ses mots, pas ceux du plan d'actions. */
  point?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { demander, confirmation } = useConfirmation();

  const question =
    point && geste === "rouvrir"
      ? {
          titre: "Rouvrir ce point ?",
          detail: avecJustificatif
            ? "Il redevient à corriger. Sa date de correction, sa pièce, ce " +
              "qui a été fait et le rapport de contre-visite sont effacés : il " +
              "faudra le marquer corrigé de nouveau."
            : "Il redevient à corriger.",
          agir: "Rouvrir le point",
          alors: () =>
            startTransition(async () => {
              await rouvrirAction(id);
              router.refresh();
            }),
        }
      : point
      ? {
          titre: "Abandonner ce point ?",
          detail:
            "Il ne compte plus parmi les points à corriger ni en retard. Il " +
            "reste au dossier, et peut être rouvert.",
          agir: "Abandonner le point",
          alors: () =>
            startTransition(async () => {
              await abandonnerAction(id);
              router.refresh();
            }),
        }
      : geste === "rouvrir"
      ? {
          titre: "Rouvrir cette action ?",
          detail: avecJustificatif
            ? "Elle revient au plan d'actions comme à faire. Sa date de " +
              "levée, son justificatif et le rapport choisi à la clôture sont " +
              "effacés : il faudra la clôturer de nouveau."
            : "Elle revient au plan d'actions comme à faire.",
          agir: "Rouvrir l'action",
          alors: () =>
            startTransition(async () => {
              await rouvrirAction(id);
              router.refresh();
            }),
        }
      : {
          titre: "Abandonner cette action ?",
          detail:
            "Elle sort du plan d'actions : elle ne compte plus parmi les " +
            "actions à faire ni en retard. Elle reste au dossier, et peut " +
            "être rouverte.",
          agir: "Abandonner l'action",
          alors: () =>
            startTransition(async () => {
              await abandonnerAction(id);
              router.refresh();
            }),
        };

  return (
    <>
      <Button
        variant="boardClair"
        size="boardSm"
        disabled={pending}
        onClick={() => demander(question)}
      >
        {geste === "rouvrir"
          ? pending
            ? "Réouverture…"
            : "Rouvrir"
          : pending
            ? "Abandon…"
            : "Abandonner"}
      </Button>
      {confirmation}
    </>
  );
}
