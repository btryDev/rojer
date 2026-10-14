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
  LABEL_TYPE_POINT,
  SEUILS_TYPE_POINT,
  TYPES_POINT,
  type SeuilsPoint,
} from "@/lib/carnet-sanitaire/schema";
import type { TypePointReleve, TypeReseauEau } from "@prisma/client";

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
 *
 * 2026-10-14 (chantier § 5) : l'aide accompagne désormais les DEUX seuils
 * préremplis par le type de point. Elle dit d'abord les maximums contre la
 * brûlure (§ 1 de l'article), puis les minimums contre les légionelles (§ 2),
 * et pourquoi la douche et le lavabo n'ont pas de minimum : le texte exempte
 * les tubes finaux. Le champ de l'article — bâtiments d'habitation, de bureaux
 * ou recevant du public — vient de l'article 1er de l'arrêté, lu le même jour.
 *
 * Revue indépendante du 2026-10-14 : ~~« 60 °C au plus aux autres (hors
 * certains points signalés des cuisines et buanderies) »~~ résumait mal le
 * § 1 — le texte dit « dans les autres pièces », et les 90 °C ne valent que
 * dans les cuisines et buanderies « des établissements recevant du public ».
 * Les passages entre guillemets sont recollés MOT POUR MOT depuis l'API
 * Légifrance (`AjoutPointReleveForm.test.tsx` les confronte au texte).
 */
export const AIDE_SEUIL_TEMPERATURE =
  "Valeurs proposées selon le type de point, à ajuster : ce sont des repères. Ils sont tirés de l'article 36 de l'arrêté du 23 juin 1978, qui vise l'eau chaude des bâtiments d'habitation, de bureaux ou recevant du public. Contre la brûlure : « dans les pièces destinées à la toilette, la température maximale de l'eau chaude sanitaire est fixée à 50 °C aux points de puisage » ; « dans les autres pièces, la température de l'eau chaude sanitaire est limitée à 60 °C aux points de puisage » ; « dans les cuisines et les buanderies des établissements recevant du public, la température de l'eau distribuée pourra être portée au maximum à 90 °C en certains points faisant l'objet d'une signalisation particulière ». Contre les légionelles, sur les systèmes de distribution auxquels sont susceptibles d'être raccordés des points de puisage à risque (« il s'agit notamment des douches ») : quand plus de 3 litres séparent le point de mise en distribution du point de puisage le plus éloigné, 50 °C au moins « en tout point du système de distribution, à l'exception des tubes finaux d'alimentation des points de puisage » — d'où l'absence de minimum proposé à un point de puisage ; « lorsque le volume total des équipements de stockage est supérieur ou égal à 400 litres, l'eau contenue dans les équipements de stockage, à l'exclusion des ballons de préchauffage », doit « être en permanence à une température supérieure ou égale à 55 °C à la sortie des équipements » ou « être portée à une température suffisante au moins une fois par 24 heures ». L'article ne fixe pas de température propre à la sortie d'un stockage plus petit. Les 20 °C proposés pour l'eau froide sont un repère de Rojer : aucun de ces textes ne les fixe.";

/** Ce que le formulaire préremplit pour un type ; `""` : point d'avant le
 *  type, qui garde ses seuils. */
function seuilsProposes(
  type: TypePointReleve | "",
  point: { typePoint: TypePointReleve | null } & SeuilsPoint | undefined,
): SeuilsPoint {
  if (point && type === (point.typePoint ?? "")) return point;
  if (type === "") return { seuilMinCelsius: null, seuilMaxCelsius: null };
  return SEUILS_TYPE_POINT[type];
}

export function AjoutPointReleveForm({
  etablissementId,
  batiments = [],
  point,
}: {
  etablissementId: string;
  /** Rendu seulement à partir de deux (ADR-019). */
  batiments?: { id: string; nom: string }[];
  /** Présent : corriger ce point (2026-10-12). Les seuils recalculent la
   *  plage de tous ses relevés (`modifierPointReleve`). `typePoint` à `null` :
   *  point créé avant le type (2026-10-14), qui peut le rester. */
  point?: {
    id: string;
    nom: string;
    localisation: string | null;
    batimentId: string | null;
    typeReseau: TypeReseauEau;
    typePoint: TypePointReleve | null;
    seuilMinCelsius: number | null;
    seuilMaxCelsius: number | null;
  };
}) {
  const boundAction = point
    ? modifierPointReleve.bind(null, etablissementId, point.id)
    : creerPointReleve.bind(null, etablissementId);
  const [state, formAction, pending] = useActionState<
    CarnetActionState,
    FormData
  >(boundAction, { status: "idle" });
  // Pas de type présélectionné à la création : le choix EST la question
  // (« où est ce point ? »), et un défaut silencieux proposerait ses seuils.
  const [type, setType] = useState<TypePointReleve | "">(point ? (point.typePoint ?? "") : "");
  const proposes = seuilsProposes(type, point);
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

      <div>
        <label className="label-board" htmlFor={`typePoint${sfx}`}>
          Type de point *
        </label>
        <select
          id={`typePoint${sfx}`}
          name="typePoint"
          value={type}
          required={!point || point.typePoint !== null}
          onChange={(e) => setType(e.target.value as TypePointReleve | "")}
          className="champ-board"
          aria-invalid={Boolean(err("typePoint"))}
          aria-describedby={`aide-seuils${sfx}`}
        >
          {/* Un point d'avant le type peut le rester ; un point neuf choisit. */}
          {point && point.typePoint === null ? (
            <option value="">Non précisé (point créé avant le choix du type)</option>
          ) : (
            <option value="" disabled>
              Choisir où est le point…
            </option>
          )}
          {TYPES_POINT.map((t) => (
            <option key={t} value={t}>
              {LABEL_TYPE_POINT[t]}
            </option>
          ))}
        </select>
        {/* Sans type, le point garde son réseau. */}
        {point && type === "" && (
          <input type="hidden" name="typeReseau" value={point.typeReseau} />
        )}
        {err("typePoint") && (
          <p className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]">
            {err("typePoint")}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" key={`seuils-${type}`}>
        <ChampBoard
          id={`seuilMinCelsius${sfx}`}
          name="seuilMinCelsius"
          label="Minimum (°C, facultatif)"
          type="number"
          step="0.5"
          defaultValue={proposes.seuilMinCelsius ?? ""}
          erreur={err("seuilMinCelsius")}
        />
        <ChampBoard
          id={`seuilMaxCelsius${sfx}`}
          name="seuilMaxCelsius"
          label="Maximum (°C, facultatif)"
          type="number"
          step="0.5"
          defaultValue={proposes.seuilMaxCelsius ?? ""}
          erreur={err("seuilMaxCelsius")}
        />
      </div>
      <p
        id={`aide-seuils${sfx}`}
        className="m-0 -mt-1 text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]"
      >
        {AIDE_SEUIL_TEMPERATURE}
      </p>

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
