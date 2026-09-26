"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit";
import { creerVersion } from "@/lib/versions/actions";
import {
  MOTIFS_VERSION,
  type MotifVersion,
  type VersionActionState,
} from "@/lib/versions/motifs";

export function CreerVersionForm({
  duerpId,
  aucunRisqueNonCote,
}: {
  duerpId: string;
  aucunRisqueNonCote: boolean;
}) {
  const action = creerVersion.bind(null, duerpId);
  const [state, formAction, pending] = useActionState<
    VersionActionState,
    FormData
  >(action, { status: "idle" });
  const [motifCle, setMotifCle] = useState<MotifVersion | "">("");

  const precisionRequise = motifCle === "autre";

  return (
    // Sous-bloc creux : le formulaire vit DANS la carte « Versions figées »,
    // il n'en ouvre pas une seconde (deux cartes emboîtées font deux niveaux
    // de titrage dans une même carte).
    <form
      action={formAction}
      className="space-y-5 rounded-[22px] bg-[color:var(--board-slate-pale)] px-5 py-5"
    >
      <div>
        <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
          Nouvelle version
        </p>
        <p className="m-0 mt-2 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Rojer demande le motif de chaque mise à jour, pour que l&apos;historique
          des versions dise pourquoi chacune a été faite. Choisissez la raison
          qui déclenche cette nouvelle version.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="sr-only">Motif de mise à jour</legend>
        {(Object.entries(MOTIFS_VERSION) as [MotifVersion, string][]).map(
          ([cle, libelle]) => {
            const id = `motif-${cle}`;
            const checked = motifCle === cle;
            return (
              <label
                key={cle}
                htmlFor={id}
                className={`flex cursor-pointer items-start gap-3 rounded-[16px] border p-3 transition-colors ${
                  checked
                    ? "border-[color:var(--board-ink)] bg-[color:var(--board-card)]"
                    : "border-[color:var(--board-slate-line)] bg-[color:var(--board-card)]/60 hover:bg-[color:var(--board-card)]"
                }`}
              >
                <input
                  type="radio"
                  id={id}
                  name="motifCle"
                  value={cle}
                  checked={checked}
                  onChange={() => setMotifCle(cle)}
                  className="mt-1 accent-[color:var(--board-ink)]"
                  required
                />
                <span className="text-[13.5px] leading-[1.45] text-[color:var(--board-ink)]">
                  {libelle}
                </span>
              </label>
            );
          },
        )}
      </fieldset>

      <ChampBoard
        id="motifPrecision"
        name="motifPrecision"
        label={`Précision${precisionRequise ? " (requise)" : " (facultative)"}`}
        placeholder="ex. ouverture service de livraison — juin 2026"
        required={precisionRequise}
        maxLength={300}
      />

      {!aucunRisqueNonCote && (
        // Voile de ligne entière, pas champ plein : le dossier n'a pas
        // d'échéance dépassée, il porte un écart relevé avant de figer.
        <p className="m-0 rounded-[16px] bg-[color:var(--board-signal-wash)] p-3 text-[12.5px] leading-[1.55] text-[color:var(--board-signal-ink)]">
          Certains risques ne sont pas encore cotés. La version figera
          l&apos;état actuel tel quel — la cotation manquante sera marquée
          « n.c. » dans le PDF.
        </p>
      )}

      {state.status === "error" && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}
      {state.status === "success" && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-green-ink)]">
          Version v{state.numero} créée. Le PDF est disponible ci-dessous.
        </p>
      )}

      <Button type="submit" variant="board" size="board" disabled={pending}>
        {pending ? "Création…" : "Valider — créer une nouvelle version"}
      </Button>
    </form>
  );
}
