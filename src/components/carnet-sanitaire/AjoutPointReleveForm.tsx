"use client";

import { useActionState, useState } from "react";
import { useOuvertureFormulaire } from "./useOuvertureFormulaire";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit";
import { ChampBatiment } from "@/components/batiments/ChampBatiment";
import {
  creerPointReleve,
  modifierPointReleve,
  type CarnetActionState,
} from "@/lib/carnet-sanitaire/actions";
import {
  LABEL_RESEAU,
  SEUIL_DEFAUT,
  TYPES_RESEAU,
} from "@/lib/carnet-sanitaire/schema";
import type { TypeReseauEau } from "@prisma/client";

/**
 * D'où viennent les valeurs proposées — et ce qui n'a pas de texte.
 *
 * La constante vit ICI et non dans `lib/carnet-sanitaire` : c'est un texte
 * d'écran qui cite un arrêté, et `citations-ecran` ne balaie que les surfaces
 * affichées. Dans `lib/`, une date d'arrêté fausse y restait verte
 * (contre-lecture du 2026-09-20).
 *
 * Les CONDITIONS et l'ALTERNATIVE de l'article sont dites : sans « plus de
 * 3 litres » ni « points de puisage à risque », la phrase étendait l'exigence
 * à tout réseau ; sans « ou une élévation quotidienne », elle donnait 55 °C
 * pour la seule voie.
 */
const AIDE_SEUIL_TEMPERATURE =
  "Valeurs proposées, à ajuster. Repères tirés de l'article 36 de l'arrêté du 23 juin 1978, pour les réseaux susceptibles d'alimenter des points de puisage à risque (notamment des douches) : 50 °C au moins en tout point du réseau d'eau chaude, tubes finaux exceptés, quand plus de 3 litres séparent la mise en distribution du point le plus éloigné ; et, pour un stockage de 400 litres et plus, 55 °C au moins en permanence à sa sortie, ou une élévation quotidienne de température. Aux robinets des pièces de toilette, le même article fixe au contraire 50 °C au plus. Les 20 °C proposés pour l'eau froide sont un repère de Rojer : aucun de ces deux textes ne les fixe.";

export function AjoutPointReleveForm({
  etablissementId,
  batiments = [],
  point,
}: {
  etablissementId: string;
  /** Rendu seulement à partir de deux (ADR-019). */
  batiments?: { id: string; nom: string }[];
  /** Présent : corriger ce point (2026-10-12). Le type et le seuil
   *  recalculent la plage de tous ses relevés (`modifierPointReleve`). */
  point?: {
    id: string;
    nom: string;
    localisation: string | null;
    batimentId: string | null;
    typeReseau: TypeReseauEau;
    seuilMinCelsius: number;
  };
}) {
  const boundAction = point
    ? modifierPointReleve.bind(null, etablissementId, point.id)
    : creerPointReleve.bind(null, etablissementId);
  const [state, formAction, pending] = useActionState<
    CarnetActionState,
    FormData
  >(boundAction, { status: "idle" });
  const [type, setType] = useState<TypeReseauEau>(point?.typeReseau ?? "ECS");
  // Une correction faite referme le formulaire : la carte montre le résultat.
  const [ouvert, setOuvert] = useOuvertureFormulaire(state, Boolean(point));
  const err = (champ: string) =>
    state.status === "error" ? state.fieldErrors?.[champ]?.[0] : undefined;
  // Un formulaire de correction par point : ses identifiants ne se répètent pas.
  const sfx = point ? `-${point.id}` : "";

  if (!ouvert) {
    return point ? (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="text-[12px] font-medium text-[color:var(--board-slate-mid)] underline-offset-2 transition-colors hover:text-[color:var(--board-ink)] hover:underline"
      >
        Modifier le point
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className={buttonVariants({ variant: "boardClair", size: "boardSm" })}
      >
        + Ajouter un point de relevé
      </button>
    );
  }

  return (
    // Le formulaire se déplie dans une carte : c'est un sous-bloc, donc le
    // creux ardoise à rayon 22 et non un encadré pointillé, dont le board
    // n'a pas l'équivalent.
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-[22px] bg-[color:var(--board-slate-pale)] p-5"
    >
      <ChampBoard
        id={`nom${sfx}`}
        name="nom"
        label="Nom du point"
        requis
        maxLength={200}
        defaultValue={point?.nom}
        erreur={err("nom")}
        placeholder="Ex : Évier cuisine, Douche vestiaire, Lavabo salle 1…"
      />
      <ChampBatiment
        charte="board"
        batiments={batiments}
        defaultValue={point?.batimentId}
        erreur={
          state.status === "error"
            ? state.fieldErrors?.batimentId?.[0]
            : undefined
        }
      />
      <ChampBoard
        id={`localisation${sfx}`}
        name="localisation"
        label="Localisation (facultatif)"
        maxLength={200}
        defaultValue={point?.localisation ?? undefined}
        placeholder="Ex : RDC, local plonge, 2e étage"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
        <div>
          <label className="label-board" htmlFor={`typeReseau${sfx}`}>
            Type de réseau *
          </label>
          <select
            id={`typeReseau${sfx}`}
            name="typeReseau"
            value={type}
            onChange={(e) => setType(e.target.value as TypeReseauEau)}
            className="champ-board"
          >
            {TYPES_RESEAU.map((t) => (
              <option key={t} value={t}>
                {LABEL_RESEAU[t]}
              </option>
            ))}
          </select>
        </div>
        <ChampBoard
          id={`seuilMinCelsius${sfx}`}
          name="seuilMinCelsius"
          label={`Seuil ${type === "EFS" ? "max" : "min"} (°C)`}
          type="number"
          step="0.5"
          defaultValue={
            point && type === point.typeReseau ? point.seuilMinCelsius : SEUIL_DEFAUT[type]
          }
          key={`seuil-${type}`}
          erreur={err("seuilMinCelsius")}
          aide={AIDE_SEUIL_TEMPERATURE}
        />
      </div>

      {state.status === "error" && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="board" size="boardSm" disabled={pending}>
          {pending ? "Enregistrement…" : point ? "Enregistrer le point" : "Ajouter le point"}
        </Button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="text-[12.5px] font-medium text-[color:var(--board-slate-mid)] transition-colors hover:text-[color:var(--board-ink)]"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
