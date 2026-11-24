"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChampBoard, SectionChamps } from "@/components/ui-kit";
import type { SalarieActionState } from "@/lib/salaries/actions";

/**
 * La saisie d'une personne.
 *
 * Le formulaire est court, et c'est le sujet : on ne demande que ce qui sert à
 * identifier la personne et à dater ses titres. Pas de date de naissance, pas
 * de numéro de sécurité sociale, pas de coordonnées — rien de cela n'est
 * nécessaire pour savoir qu'une attestation expire, et ce qui n'est pas
 * nécessaire ne se collecte pas (`docs/rgpd.md` § 2.3).
 *
 * Chaque champ facultatif dit à quoi il sert. Un champ dont on ne comprend pas
 * l'usage se remplit « au cas où », et c'est ainsi qu'on collecte trop.
 */
export function FormulaireSalarie({
  etablissementId,
  action,
  defauts,
  libelleSoumission = "Ajouter cette personne",
}: {
  etablissementId: string;
  action: (
    prev: SalarieActionState,
    formData: FormData,
  ) => Promise<SalarieActionState>;
  defauts?: {
    nom: string;
    prenom: string;
    poste: string | null;
    entreLe: Date | null;
  };
  libelleSoumission?: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    SalarieActionState,
    FormData
  >(action, { status: "idle" });

  useEffect(() => {
    if (state.status === "success") {
      router.push(`/etablissements/${etablissementId}/equipe/${state.salarieId}`);
    }
  }, [state, etablissementId, router]);

  const err = (champ: string) =>
    state.status === "error" ? state.fieldErrors?.[champ]?.[0] : undefined;

  const jour = (d: Date | null | undefined) =>
    d ? d.toISOString().slice(0, 10) : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <SectionChamps
        titre="Identité"
        chapeau="Le nom et le prénom suffisent à rattacher un titre à une personne. C'est tout ce que Rojer demande."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ChampBoard
            id="prenom"
            name="prenom"
            label="Prénom"
            requis
            maxLength={100}
            defaultValue={defauts?.prenom}
            erreur={err("prenom")}
          />
          <ChampBoard
            id="nom"
            name="nom"
            label="Nom"
            requis
            maxLength={100}
            defaultValue={defauts?.nom}
            erreur={err("nom")}
          />
        </div>
      </SectionChamps>

      <SectionChamps titre="Repères">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ChampBoard
            id="poste"
            name="poste"
            label="Poste ou fonction"
            maxLength={120}
            placeholder="Ex : chef de cuisine, magasinier"
            defaultValue={defauts?.poste ?? undefined}
            erreur={err("poste")}
            aide="Pour vous y retrouver dans la liste. Rojer n'en déduit aucune obligation — c'est vous qui déclarez les titres détenus."
          />
          <ChampBoard
            id="entreLe"
            name="entreLe"
            label="Entrée dans l'effectif"
            type="date"
            defaultValue={jour(defauts?.entreLe)}
            erreur={err("entreLe")}
            aide="Sert de point de départ aux obligations « à l'embauche ». Sans elle, une telle obligation partirait du jour de la saisie, c'est-à-dire d'un retard inventé."
          />
        </div>
      </SectionChamps>

      {state.status === "error" && !state.fieldErrors && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="board" size="board" type="submit" enCours={pending}>
          {pending ? "Enregistrement…" : libelleSoumission}
        </Button>
        <Link
          href={`/etablissements/${etablissementId}/equipe`}
          className={buttonVariants({ variant: "boardClair", size: "board" })}
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
