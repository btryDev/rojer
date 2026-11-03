"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useConfirmation } from "@/components/ui-kit/Confirmation";
import {
  basculerActif,
  retirerTitre,
  supprimerSalarie,
} from "@/lib/salaries/actions";
import { detailSuppressionSalarie } from "@/lib/salaries/phrases-suppression";
import type { PerimetreSuppressionSalarie } from "@/lib/salaries/suppression";

/**
 * Sortie et retour dans l'effectif.
 *
 * L'action n'est pas « supprimer », et le libellé le dit : elle marque la
 * fiche, et les titres restent. ~~La preuve […] doit survivre au départ
 * (`docs/rgpd.md` § 4.3)~~ — aucun texte identifié ne le fonde (E8,
 * 2026-09-27). La propriétaire a tranché le même jour : la sortie reste ce
 * qu'elle est, un choix de l'employeur qui garde tout ; qui veut effacer a
 * `SupprimerSalarieButton`, juste en dessous.
 *
 * Le geste est donc réversible, et sans confirmation (relevé le 2026-09-27,
 * revue finale ; `docs/rgpd.md` § 4.3 le dit).
 */
export function BasculerEffectif({
  etablissementId,
  salarieId,
  actif,
}: {
  etablissementId: string;
  salarieId: string;
  actif: boolean;
}) {
  const [pending, startTransition] = useTransition();
  // Le retour dans l'effectif peut être refusé par la borne de Rojer
  // (2026-11-03) : le refus se dit sous le bouton.
  const [refus, setRefus] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        variant="boardClair"
        size="boardSm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await basculerActif(etablissementId, salarieId, !actif);
            setRefus(r?.refus ?? null);
          })
        }
      >
        {pending
          ? "…"
          : actif
            ? "Sortie de l'effectif"
            : "Réintégrer à l'effectif"}
      </Button>
      {refus ? (
        <p role="alert" className="m-0 max-w-[320px] text-[12px] leading-[1.5] text-[color:var(--board-signal-ink)]">
          {refus}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Retirer un titre — une correction de saisie, pas un renouvellement.
 *
 * Redéclarer le même titre avec de nouvelles dates suffit à le renouveler
 * (l'action fait un `upsert`). Ce bouton sert à défaire une erreur : un titre
 * saisi sur la mauvaise personne, ou qui n'a jamais existé.
 */
export function RetirerTitreButton({
  etablissementId,
  salarieId,
  titreId,
  libelle,
}: {
  etablissementId: string;
  salarieId: string;
  titreId: string;
  libelle: string;
}) {
  const [pending, startTransition] = useTransition();
  const { demander, confirmation } = useConfirmation();

  return (
    <>
      <button
        type="button"
        disabled={pending}
        className="text-[11.5px] text-[color:var(--board-slate-soft)] underline-offset-2 transition-colors hover:text-[color:var(--board-signal-ink)] hover:underline disabled:opacity-50"
        onClick={() =>
          demander({
            titre: `Retirer « ${libelle} » de cette fiche ?`,
            // Décision de la propriétaire, 2026-09-27 : « quand employeur
            // supprime il est averti que data supprimé définitivement ». Le
            // bouton « Éditer ses données » de la même fiche exporte ce qui
            // est enregistré sur la personne (art. 15) : c'est lui qu'on nomme.
            detail:
              "Ses dates et son repère sont supprimés définitivement, et avec " +
              "eux la trace que cette personne était habilitée : rien ne se " +
              "récupère ensuite. Pour en garder une trace, utilisez d'abord " +
              "« Éditer ses données » sur cette fiche. Pour un " +
              "renouvellement, ne retirez rien : redéclarez le même titre " +
              "avec ses nouvelles dates.",
            agir: "Retirer le titre",
            alors: () =>
              startTransition(async () => {
                await retirerTitre(etablissementId, salarieId, titreId);
              }),
          })
        }
      >
        {pending ? "Retrait…" : "Retirer"}
      </button>
      {confirmation}
    </>
  );
}

/**
 * « Supprimer ce salarié » — l'effacement définitif (décision de la
 * propriétaire, 2026-09-27). La confirmation compte ce qui part — le
 * périmètre est lu côté serveur par la même requête que l'effacement — et
 * nomme l'export qui existe sur la fiche, « Éditer ses données ».
 */
export function SupprimerSalarieButton({
  etablissementId,
  salarieId,
  nom,
  perimetre,
}: {
  etablissementId: string;
  salarieId: string;
  nom: string;
  perimetre: PerimetreSuppressionSalarie;
}) {
  const [pending, startTransition] = useTransition();
  const { demander, confirmation } = useConfirmation();

  return (
    <>
      <Button
        variant="boardClair"
        size="boardSm"
        disabled={pending}
        onClick={() =>
          demander({
            titre: `Supprimer ${nom} et tout ce qui le concerne ?`,
            detail: detailSuppressionSalarie(nom, perimetre),
            agir: "Supprimer définitivement",
            alors: () =>
              startTransition(async () => {
                await supprimerSalarie(etablissementId, salarieId);
              }),
          })
        }
      >
        {pending ? "Suppression…" : "Supprimer ce salarié"}
      </Button>
      {confirmation}
    </>
  );
}
