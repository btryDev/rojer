"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit";
import type { ActionState } from "@/lib/entreprises/actions";

type Valeurs = {
  raisonSociale?: string;
  siret?: string | null;
  codeNaf?: string;
  effectif?: number;
  adresse?: string;
};

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  valeursInitiales?: Valeurs;
  libelleSubmit: string;
  labelAnnuler?: { libelle: string; href: string };
};

export function EntrepriseForm({
  action,
  valeursInitiales,
  libelleSubmit,
  labelAnnuler,
}: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    { status: "idle" },
  );

  const err = (champ: string) =>
    state.status === "error" ? state.fieldErrors?.[champ]?.[0] : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <ChampBoard
        id="raisonSociale"
        name="raisonSociale"
        label="Raison sociale"
        requis
        defaultValue={valeursInitiales?.raisonSociale}
        erreur={err("raisonSociale")}
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <ChampBoard
          id="siret"
          name="siret"
          label="SIRET"
          inputMode="numeric"
          pattern="\d{14}"
          defaultValue={valeursInitiales?.siret ?? ""}
          placeholder="14 chiffres"
          aide="Numéro à 14 chiffres identifiant votre établissement. Facultatif ici — figurera en en-tête du DUERP s'il est renseigné."
          erreur={err("siret")}
        />

        <ChampBoard
          id="codeNaf"
          name="codeNaf"
          label="Code NAF"
          requis
          defaultValue={valeursInitiales?.codeNaf}
          placeholder="ex. 56.10A"
          aide="Code d'activité INSEE (ex : 56.10A pour restauration, 47.11A pour commerce alimentaire, 71.12B pour bureau d'études). Il sert à pré-remplir les risques types de votre secteur."
          erreur={err("codeNaf")}
        />
      </div>

      <ChampBoard
        id="effectif"
        name="effectif"
        label="Salariés de l'entreprise"
        requis
        aide="Tous établissements confondus, apprentis non compris (art. L. 1111-3). Les seuils de onze et de cinquante salariés — comité social et économique, règlement intérieur, mise à jour annuelle du document unique — se comptent sur ce nombre : tenez-le à jour quand un site s'ajoute ou grandit."
        // La molette d'un champ nombre modifie une valeur déjà saisie sans
        // que rien ne le signale ; la borne reste au serveur.
        type="text"
        inputMode="numeric"
        defaultValue={valeursInitiales?.effectif}
        erreur={err("effectif")}
      />

      <ChampBoard
        id="adresse"
        name="adresse"
        label="Adresse"
        requis
        defaultValue={valeursInitiales?.adresse}
        erreur={err("adresse")}
      />

      {state.status === "error" && !state.fieldErrors && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}
      {state.status === "success" && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-green-ink)]">
          Enregistré.
        </p>
      )}
      {state.status === "success_avec_avertissement" && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" variant="board" size="board" disabled={pending}>
          {pending ? "Enregistrement…" : libelleSubmit}
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
