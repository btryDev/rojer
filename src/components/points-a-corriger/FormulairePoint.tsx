"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit";
import { TYPES_ACTION } from "@/lib/actions/schema";
import { LABEL_TYPE_ACTION } from "@/lib/actions/labels";
import type { ActionPlanState } from "@/lib/actions/plan";
import { ORDRE_SELON_L4121_2 } from "@/lib/verbatim/l4121-2-ordre";
import type { TypeAction } from "@prisma/client";
import { formaterDateCourteFr } from "@/lib/dates";
import { LABEL_RESULTAT } from "@/lib/rapports/resultats";
import type { ControlePourUnPoint, RapportPourUnPoint } from "@/lib/points-a-corriger/queries";

/**
 * Valeurs de départ, pour corriger une action existante avec le formulaire
 * qui l'a créée (audit du 2026-10-12 : `modifierActionPlan` n'avait pas
 * d'écran). L'échéance arrive en clé « AAAA-MM-JJ » (`cleJourCivil`), la
 * forme que lit un `<input type="date">`.
 */
export type DefautsAction = {
  libelle: string;
  description: string | null;
  type: TypeAction;
  criticite: number | null;
  echeance: string | null;
  responsable: string | null;
};

/**
 * À quoi le point se rattache, à la création (ADR-048) :
 *   - `fixe` : le contrôle est connu (la page d'un contrôle) ;
 *   - `choix` : la fiche d'un équipement propose ses contrôles et les
 *     contrôles d'ensemble qui le couvrent.
 * Le rapport d'origine se CHOISIT parmi les rapports récents du contrôle,
 * « pas de rapport précis » par défaut : le rattacher d'office au dernier
 * rapport attribuait à un contrôle conforme d'hier le point d'un vieux
 * rapport (revue du 2026-10-24). `rapportImpose` : seulement juste après le
 * dépôt d'un rapport, quand on sait lequel a relevé le point.
 * `appareils` : pour un contrôle d'ensemble, les appareils que le point peut
 * désigner. `appareilImpose` : la fiche d'un équipement désigne le sien.
 */
export type RattachementPoint =
  | {
      mode: "fixe";
      verificationId: string;
      rapports: RapportPourUnPoint[];
      rapportImpose?: RapportPourUnPoint;
    }
  | { mode: "choix"; controles: ControlePourUnPoint[]; appareilImpose: string };

type Props = {
  action: (
    prev: ActionPlanState,
    formData: FormData,
  ) => Promise<ActionPlanState>;
  labelAnnuler?: { libelle: string; href: string };
  /** Présent : le formulaire corrige un point au lieu d'en créer un. */
  defauts?: DefautsAction;
  /** Requis à la création. */
  rattachement?: RattachementPoint;
  appareils?: { id: string; libelle: string }[];
};

/**
 * Le formulaire d'un point à corriger — création et correction (ADR-048).
 * Après une création, il se vide pour le point suivant : un rapport en relève
 * souvent plusieurs.
 */
export function FormulairePoint(props: Props) {
  // La clé change à chaque création réussie : le formulaire repart vide.
  const [serie, setSerie] = useState(0);
  return <Formulaire key={serie} {...props} surCree={() => setSerie((n) => n + 1)} creesAvant={serie} />;
}

function Formulaire({
  action,
  labelAnnuler,
  defauts,
  rattachement,
  appareils,
  surCree,
  creesAvant,
}: Props & { surCree: () => void; creesAvant: number }) {
  const correction = defauts !== undefined;
  const [state, formAction, pending] = useActionState<ActionPlanState, FormData>(
    async (prev, fd) => {
      const r = await action(prev, fd);
      if (r.status === "success" && !correction) surCree();
      return r;
    },
    { status: "idle" },
  );
  const controles = rattachement?.mode === "choix" ? rattachement.controles : [];
  const [controleId, setControleId] = useState(controles[0]?.verificationId ?? "");
  const controleChoisi = controles.find((c) => c.verificationId === controleId);

  const err = (champ: string) =>
    state.status === "error" ? state.fieldErrors?.[champ]?.[0] : undefined;

  return (
    <form action={formAction} className="space-y-5">
      {rattachement?.mode === "fixe" && (
        <>
          <input type="hidden" name="verificationId" value={rattachement.verificationId} />
          <RapportOrigine rapports={rattachement.rapports} impose={rattachement.rapportImpose} />
        </>
      )}
      {rattachement?.mode === "choix" && (
        <div>
          <label className="label-board" htmlFor="verificationId">
            Relevé par le contrôle *
          </label>
          <select
            id="verificationId"
            name="verificationId"
            required
            className="champ-board"
            value={controleId}
            onChange={(e) => setControleId(e.currentTarget.value)}
          >
            {controles.map((c) => (
              <option key={c.verificationId} value={c.verificationId}>
                {c.libelle}
                {c.ensemble ? " (contrôle d'ensemble)" : ""}
              </option>
            ))}
          </select>
          {/* Un contrôle d'ensemble désigne l'appareil de cette fiche. */}
          {controleChoisi?.ensemble && (
            <input type="hidden" name="equipementId" value={rattachement.appareilImpose} />
          )}
        </div>
      )}
      {rattachement?.mode === "choix" && controleChoisi && (
        // Remonté à chaque changement de contrôle : un rapport choisi ne
        // survit pas au contrôle qui l'a produit.
        <RapportOrigine key={controleChoisi.verificationId} rapports={controleChoisi.rapports} />
      )}
      {appareils && appareils.length > 0 && (
        <div>
          <label className="label-board" htmlFor="equipementId">
            Appareil concerné
          </label>
          <select id="equipementId" name="equipementId" className="champ-board" defaultValue="">
            <option value="">— Aucun appareil précis —</option>
            {appareils.map((a) => (
              <option key={a.id} value={a.id}>
                {a.libelle}
              </option>
            ))}
          </select>
          <p className="m-0 mt-1.5 text-[12px] text-[color:var(--board-slate-mid)]">
            Choisi, le point s&apos;affiche sur la fiche de l&apos;appareil.
          </p>
        </div>
      )}

      <ChampBoard
        id="libelle"
        name="libelle"
        label="Ce qu'il faut corriger"
        requis
        placeholder="Ex : Remettre en état le BAES de l'entrée principale"
        defaultValue={defauts?.libelle}
        erreur={err("libelle")}
      />

      <div>
        <label className="label-board" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="champ-board"
          placeholder="Détails : référence, localisation, étapes prévues…"
          defaultValue={defauts?.description ?? undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label-board" htmlFor="type">
            Type de mesure *
          </label>
          <select
            id="type"
            name="type"
            required
            defaultValue={defauts?.type ?? "reduction_source"}
            className="champ-board"
            aria-describedby="type-aide"
          >
            {TYPES_ACTION.map((t) => (
              <option key={t} value={t}>
                {LABEL_TYPE_ACTION[t]}
              </option>
            ))}
          </select>
          {/* La hiérarchie des mesures se lit en clair sous le champ : une
              infobulle n'existe pas au doigt. */}
          <p
            id="type-aide"
            className="m-0 mt-1.5 text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]"
          >
            {ORDRE_SELON_L4121_2}{" "}
            L&apos;ordre des types proposés est un
            classement de Rojer.
          </p>
        </div>

        <ChampBoard
          id="criticite"
          name="criticite"
          label="Criticité (1-5)"
          // Un champ `type="number"` change de valeur à la molette, sur une
          // saisie déjà faite et sans que rien ne le signale.
          type="text"
          inputMode="numeric"
          placeholder="3"
          defaultValue={defauts?.criticite ?? undefined}
          aide="1 = correctif mineur, 5 = priorité vitale. Sert au tri du plan d'actions. Facultatif."
          erreur={err("criticite")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChampBoard
          id="echeance"
          name="echeance"
          label="Échéance prévue"
          type="date"
          defaultValue={defauts?.echeance ?? undefined}
          erreur={err("echeance")}
        />

        <ChampBoard
          id="responsable"
          name="responsable"
          label="Responsable"
          placeholder="Ex : DAF, prestataire"
          defaultValue={defauts?.responsable ?? undefined}
          erreur={err("responsable")}
        />
      </div>

      {state.status === "error" && !state.fieldErrors && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}
      {/* Une correction réussie rouvre la fiche (`redirect`) : pas de
          message de succès à poser ici. */}
      {!correction && creesAvant > 0 && state.status === "idle" && (
        <p role="status" className="m-0 text-[12.5px] text-[color:var(--board-green-ink)]">
          {creesAvant > 1 ? `${creesAvant} points ajoutés.` : "Point ajouté."} Ajoutez-en un autre si besoin.
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="board" size="board" disabled={pending}>
          {correction
            ? pending
              ? "Enregistrement…"
              : "Enregistrer la correction"
            : pending
              ? "Ajout…"
              : "Ajouter le point"}
        </Button>
        {labelAnnuler && (
          <Link
            href={labelAnnuler.href}
            className={buttonVariants({
              variant: "boardClair",
              size: "board",
            })}
          >
            {labelAnnuler.libelle}
          </Link>
        )}
      </div>
    </form>
  );
}

/** Libellé d'un rapport : sa date et son résultat. */
function libelleRapport(r: RapportPourUnPoint): string {
  return `Rapport du ${formaterDateCourteFr(r.dateRapport)} · ${LABEL_RESULTAT[r.resultat]}`;
}

/**
 * Le rapport qui a relevé le point : imposé juste après un dépôt, choisi
 * sinon, jamais deviné.
 */
function RapportOrigine({
  rapports,
  impose,
}: {
  rapports: RapportPourUnPoint[];
  impose?: RapportPourUnPoint;
}) {
  if (impose) {
    return (
      <>
        <input type="hidden" name="rapportOrigineId" value={impose.id} />
        <p className="m-0 text-[12.5px] text-[color:var(--board-slate-mid)]">
          Relevé dans le {libelleRapport(impose).replace(/^Rapport/, "rapport")}.
        </p>
      </>
    );
  }
  if (rapports.length === 0) return null;
  return (
    <div>
      <label className="label-board" htmlFor="rapportOrigineId">
        Relevé dans le rapport
      </label>
      <select id="rapportOrigineId" name="rapportOrigineId" className="champ-board" defaultValue="">
        <option value="">— Pas de rapport précis —</option>
        {rapports.map((r) => (
          <option key={r.id} value={r.id}>
            {libelleRapport(r)}
          </option>
        ))}
      </select>
    </div>
  );
}
