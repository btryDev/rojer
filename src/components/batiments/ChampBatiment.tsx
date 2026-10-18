import { Label } from "@/components/ui/label";
import type { Charte } from "@/components/ui-kit";
import { nomDeZone } from "@/lib/batiments/nom-zone";

/**
 * Le champ « Zone » des formulaires à rattachement optionnel — permis de
 * feu, plan de prévention, point de relevé (ADR-029).
 *
 * Rien n'est rendu sous une seule zone : le formulaire ne change pas tant
 * que la question n'a pas de sens. À partir de deux, un select avec « Tout
 * l'établissement » en première option, qui vaut « non précisé ».
 *
 * Ce champ a reçu une prop de charte parce qu'il était appelé des deux côtés
 * de la migration visuelle (`ui-kit/charte.ts`) : un champ à rayon 6 au milieu
 * d'une carte à rayon 30 se voit, et l'inverse aussi.
 *
 * **Ses trois appelants sont désormais board** — permis de feu, plan de
 * prévention, et le carnet sanitaire depuis le 2026-08-28. La branche `papier`
 * n'a donc plus d'appelant : elle se retire au prochain passage, avec le
 * défaut qui l'accompagne. Ce fichier se vide, il ne se remplit pas.
 */
export function ChampBatiment({
  batiments,
  defaultValue,
  erreur,
  aide,
  charte = "papier",
}: {
  batiments: { id: string; nom: string }[];
  defaultValue?: string | null;
  erreur?: string;
  aide?: string;
  /** La grammaire visuelle du formulaire qui porte le champ. */
  charte?: Charte;
}) {
  if (batiments.length < 2) return null;

  const board = charte === "board";
  return (
    <div className={board ? undefined : "space-y-1.5"}>
      {board ? (
        <label className="label-board" htmlFor="batimentId">
          Zone
        </label>
      ) : (
        <Label htmlFor="batimentId">Zone</Label>
      )}
      <select
        id="batimentId"
        name="batimentId"
        defaultValue={defaultValue ?? ""}
        className={
          board
            ? "champ-board"
            : "h-9 w-full rounded-md border border-rule bg-background px-3 py-1 text-sm shadow-sm"
        }
        aria-invalid={Boolean(erreur)}
      >
        <option value="">Non précisé</option>
        {batiments.map((b) => (
          <option key={b.id} value={b.id}>
            {nomDeZone(b.nom)}
          </option>
        ))}
      </select>
      {aide ? (
        <p
          className={
            board
              ? "m-0 mt-1.5 text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]"
              : "text-[0.82rem] text-muted-foreground"
          }
        >
          {aide}
        </p>
      ) : null}
      {erreur ? (
        <p
          className={
            board
              ? "m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]"
              : "text-sm text-destructive"
          }
        >
          {erreur}
        </p>
      ) : null}
    </div>
  );
}
