"use client";

import { unstable_rethrow } from "next/navigation";
import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirmation } from "@/components/ui-kit/Confirmation";
import { modifierMesure, supprimerMesure } from "@/lib/mesures/actions";
import { LABEL_TYPE_MESURE } from "@/lib/mesures/labels";
import type { TypeMesure } from "@/lib/referentiels/types";
import { cleJourCivil } from "@/lib/dates";

// Valeur d'un `<input type="date">` : le jour civil de Paris. Composant
// client, donc `toISOString()` y décalait la date d'un jour dès que
// l'instant lu n'était pas exactement minuit UTC (cf. ADR-011).
function formatDateISO(d: Date | null): string {
  return d ? cleJourCivil(d) : "";
}

type Statut = "existante" | "prevue";

type Props = {
  id: string;
  libelle: string;
  type: TypeMesure;
  statut: Statut;
  echeance: Date | null;
  responsable: string | null;
  origine: "referentiel" | "custom";
};

export function MesureRow({
  id,
  libelle,
  type,
  statut,
  echeance,
  responsable,
  origine,
}: Props) {
  const [pending, startTransition] = useTransition();
  const { demander, confirmation } = useConfirmation();

  const setStatut = (next: Statut) => {
    if (next === statut) return;
    startTransition(async () => {
      await modifierMesure(id, { statut: next });
    });
  };

  return (
    <div>
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[14px] font-medium leading-[1.45] text-[color:var(--board-ink)]">
            {libelle}
          </p>
          <p className="m-0 mt-1 text-[12.5px] text-[color:var(--board-slate-mid)]">
            {LABEL_TYPE_MESURE[type]}
            {origine === "custom" && " · ajoutée manuellement"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="radiogroup"
            aria-label="Statut de cette mesure"
            className="inline-flex items-center rounded-full border border-[color:var(--board-slate-line)] bg-[color:var(--board-slate-pale)] p-0.5 text-[12px] font-semibold"
          >
            <SegButton
              active={statut === "existante"}
              activeTone="fait"
              onClick={() => setStatut("existante")}
              disabled={pending}
              label="Déjà en place"
            />
            <SegButton
              active={statut === "prevue"}
              activeTone="prevu"
              onClick={() => setStatut("prevue")}
              disabled={pending}
              label="À prévoir"
            />
          </div>
          <Button
            variant="boardClair"
            size="boardSm"
            disabled={pending}
            onClick={() =>
              demander({
                titre: `Supprimer la mesure « ${libelle} » ?`,
                detail:
                  statut === "prevue"
                    ? "Son échéance et son responsable partent avec elle, et " +
                      "elle quitte le plan d'actions. Le risque restera sans " +
                      "cette mesure en regard."
                    : "Le risque restera sans cette mesure en regard : le " +
                      "DUERP ne dira plus qu'elle est en place.",
                agir: "Supprimer la mesure",
                alors: () =>
                  startTransition(async () => {
                    await supprimerMesure(id);
                  }),
              })
            }
          >
            Supprimer
          </Button>
        </div>
      </div>

      {confirmation}

      {statut === "prevue" && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ChampValidable
            id={`mesure-${id}-echeance`}
            label="Échéance"
            type="date"
            initial={formatDateISO(echeance)}
            onSave={async (v) => {
              await modifierMesure(id, { echeance: v || "" });
            }}
          />
          <ChampValidable
            id={`mesure-${id}-responsable`}
            label="Responsable"
            placeholder="Nom ou rôle"
            initial={responsable ?? ""}
            transformAvantSave={(v) => v.trim()}
            onSave={async (v) => {
              await modifierMesure(id, { responsable: v || null });
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Champ texte/date avec validation explicite.
 * - Tant que la valeur ne diffère pas de la dernière enregistrée : UI neutre.
 * - Dès qu'elle diffère : bouton « Enregistrer » apparaît à droite.
 * - Après save réussi : le bouton disparaît, un ✓ « Enregistré » s'affiche
 *   ~1,8 s puis s'efface.
 * - Filet de sécurité : `onBlur` déclenche aussi la sauvegarde (mais un clic
 *   sur le bouton est le signal explicite attendu par l'utilisateur).
 */
function ChampValidable({
  id,
  label,
  initial,
  type = "text",
  placeholder,
  transformAvantSave,
  onSave,
}: {
  id: string;
  label: string;
  initial: string;
  type?: "text" | "date";
  placeholder?: string;
  transformAvantSave?: (v: string) => string;
  onSave: (v: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [etat, setEtat] = useState<"idle" | "saving" | "saved">("idle");

  const normaliser = (v: string) =>
    transformAvantSave ? transformAvantSave(v) : v;
  const valeurNormalisee = normaliser(value);
  const dirty = valeurNormalisee !== saved;

  const enregistrer = async () => {
    if (!dirty) return;
    const v = valeurNormalisee;
    setEtat("saving");
    try {
      await onSave(v);
      setValue(v);
      setSaved(v);
      setEtat("saved");
      window.setTimeout(() => {
        setEtat((prev) => (prev === "saved" ? "idle" : prev));
      }, 1800);
    } catch (e) {
      // Une redirection (saisie fermée, ADR-053) n'est pas un échec : Next la reprend.
      unstable_rethrow(e);
      setEtat("idle");
    }
  };

  return (
    <div>
      <label className="label-board" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="champ-board"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.currentTarget.value)}
        onBlur={enregistrer}
        disabled={etat === "saving"}
      />
      <span className="mt-2 flex h-[20px] items-center justify-end gap-2">
        {dirty ? (
          <>
            <span className="board-eyebrow text-[10px] tracking-[0.16em] text-[color:var(--board-blue-ink)]">
              Non enregistré
            </span>
            <Button
              type="button"
              variant="board"
              size="boardSm"
              onClick={enregistrer}
              disabled={etat === "saving"}
              className="h-7 rounded-full px-3 text-[12px]"
            >
              {etat === "saving" ? "…" : "Enregistrer"}
            </Button>
          </>
        ) : etat === "saved" ? (
          <span className="board-eyebrow inline-flex items-center gap-1 text-[10px] tracking-[0.16em] text-[color:var(--board-green-ink)]">
            <Check aria-hidden className="h-2.5 w-2.5" strokeWidth={3} />
            Enregistré
          </span>
        ) : null}
      </span>
    </div>
  );
}

// Table statique : Tailwind ne voit pas un nom de classe construit à la
// volée (interdit 23). « Déjà en place » est un fait — le vert du board dit
// « fait », pas « conforme » ; « à prévoir » est un rendez-vous à tenir, il
// prend le bleu, pas l'ambre : l'ambre est l'attention d'une échéance
// proche, et une mesure qu'on vient de cocher n'en a pas encore.
const SEG_ACTIF = {
  fait: "bg-[color:var(--board-green)] text-[color:var(--board-green-ink)]",
  prevu:
    "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]",
} as const;

function SegButton({
  active,
  activeTone,
  onClick,
  disabled,
  label,
}: {
  active: boolean;
  activeTone: keyof typeof SEG_ACTIF;
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-3 py-1 transition-colors ${
        active
          ? SEG_ACTIF[activeTone]
          : "text-[color:var(--board-slate-mid)] hover:text-[color:var(--board-ink)]"
      }`}
    >
      {label}
    </button>
  );
}
