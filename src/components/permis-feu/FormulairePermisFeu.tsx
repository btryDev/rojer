"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChampBoard, SectionChamps } from "@/components/ui-kit";
import { ChampBatiment } from "@/components/batiments/ChampBatiment";
import {
  creerPermisFeu,
  type PermisFeuActionState,
} from "@/lib/permis-feu/actions";
import { NATURES_TRAVAUX, LABEL_NATURE } from "@/lib/permis-feu/schema";
import {
  GROUPES_LABEL,
  DUREES_SURVEILLANCE_MINUTES,
  MESURES_PERMIS_FEU,
  mesuresParGroupe,
  type MesurePermisFeu,
} from "@/lib/permis-feu/referentiel";

type PrestataireLite = {
  id: string;
  raisonSociale: string;
  contactNom: string;
  contactEmail: string;
};

/**
 * Pilule de choix — le même objet pour les trois listes du formulaire :
 * l'annuaire, les natures de point chaud, les durées de surveillance. Le
 * papier les peignait en `--minium` une fois cochées, ce qui faisait lire
 * une sélection comme un retard. Dans le board, un choix retenu est bleu
 * glacier : le registre calme et actif.
 */
const PILULE =
  "inline-flex cursor-pointer items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors";
const PILULE_REPOS =
  "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)]";
const PILULE_RETENUE =
  "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]";

/**
 * La variante cochable porte son état par `has-[:checked]`. Le contour de
 * focus est explicite parce que la case elle-même est `sr-only` : sans lui,
 * une tabulation traverserait la liste sans que rien ne bouge à l'écran.
 */
const PILULE_COCHABLE = `${PILULE} ${PILULE_REPOS} has-[:checked]:bg-[color:var(--board-blue-pale)] has-[:checked]:text-[color:var(--board-blue-ink)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--board-blue-strong)]`;

/** Les champs dont l'erreur s'affiche à côté d'eux ; les autres, en bas du formulaire. */
const CHAMPS_AVEC_ERREUR_RENDUE = new Set([
  "batimentId", "dateDebut", "dateFin", "descriptionTravaux", "donneurOrdreNom", "lieu",
  "mesuresValidees", "naturesTravaux", "prestataireContact", "prestataireEmail", "prestataireRaison",
]);

export function FormulairePermisFeu({
  etablissementId,
  prestataires,
  batiments = [],
}: {
  etablissementId: string;
  prestataires: PrestataireLite[];
  /** Rendu seulement à partir de deux (ADR-019). */
  batiments?: { id: string; nom: string }[];
}) {
  const router = useRouter();
  const boundAction = creerPermisFeu.bind(null, etablissementId);
  const [state, formAction, pending] = useActionState<
    PermisFeuActionState,
    FormData
  >(boundAction, { status: "idle" });

  const [prestataireChoisi, setPrestataireChoisi] =
    useState<PrestataireLite | null>(null);

  useEffect(() => {
    if (state.status === "success") {
      router.push(
        `/etablissements/${etablissementId}/permis-feu/${state.permisFeuId}`,
      );
    }
  }, [state, etablissementId, router]);

  const err = (champ: string) =>
    state.status === "error" ? state.fieldErrors?.[champ]?.[0] : undefined;

  const groupes = mesuresParGroupe();
  const nbObligatoires = (
    Object.values(groupes).flat() as MesurePermisFeu[]
  ).filter((m) => m.priorite === "obligatoire").length;

  return (
    <form action={formAction} className="flex flex-col gap-9">
      {/* Les sections ne sont plus numérotées : la numérotation ne se garde
          que si l'ordre porte une information, et on remplit ces champs
          dans l'ordre qu'on veut. */}
      <SectionChamps titre="Entreprise qui réalise les travaux">
        {prestataires.length > 0 && (
          <fieldset className="m-0 border-0 p-0">
            <legend className="label-board">
              Choisir dans l&apos;annuaire
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {prestataires.map((p) => {
                const actif = prestataireChoisi?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={actif}
                    onClick={() => setPrestataireChoisi(actif ? null : p)}
                    className={
                      `${PILULE} ` +
                      (actif
                        ? PILULE_RETENUE
                        : `${PILULE_REPOS} hover:bg-[color:var(--board-blue-pale)] hover:text-[color:var(--board-blue-ink)]`)
                    }
                  >
                    {p.raisonSociale}
                  </button>
                );
              })}
            </div>
            <p className="m-0 mt-2 text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]">
              Sinon, saisissez manuellement ci-dessous.
            </p>
          </fieldset>
        )}

        <input
          type="hidden"
          name="prestataireId"
          value={prestataireChoisi?.id ?? ""}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ChampBoard
            id="prestataireRaison"
            name="prestataireRaison"
            label="Raison sociale"
            requis
            maxLength={200}
            defaultValue={prestataireChoisi?.raisonSociale ?? ""}
            key={prestataireChoisi?.id ?? "libre"}
            erreur={err("prestataireRaison")}
          />
          <ChampBoard
            id="prestataireContact"
            name="prestataireContact"
            label="Nom du technicien"
            requis
            maxLength={200}
            defaultValue={prestataireChoisi?.contactNom ?? ""}
            key={`contact-${prestataireChoisi?.id ?? "libre"}`}
            erreur={err("prestataireContact")}
          />
        </div>

        <ChampBoard
          id="prestataireEmail"
          name="prestataireEmail"
          type="email"
          label="Email du technicien"
          requis
          maxLength={200}
          placeholder="jean.dupond@entreprise.fr"
          defaultValue={prestataireChoisi?.contactEmail ?? ""}
          key={`email-${prestataireChoisi?.id ?? "libre"}`}
          erreur={err("prestataireEmail")}
          aide="Enregistrée sur le permis, avec le nom du technicien."
        />
      </SectionChamps>

      <SectionChamps titre="Donneur d'ordre" chapeau="Qui signe côté site.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ChampBoard
            id="donneurOrdreNom"
            name="donneurOrdreNom"
            label="Nom et prénom"
            requis
            maxLength={200}
            erreur={err("donneurOrdreNom")}
          />
          <ChampBoard
            id="donneurOrdreFonction"
            name="donneurOrdreFonction"
            label="Fonction"
            maxLength={120}
            placeholder="Ex : Gérant, Responsable technique…"
          />
        </div>
      </SectionChamps>

      <SectionChamps
        titre="Nature et lieu des travaux"
        chapeau="Quoi, où, quand."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ChampBoard
            id="dateDebut"
            name="dateDebut"
            type="datetime-local"
            label="Début des travaux"
            requis
            erreur={err("dateDebut")}
          />
          <ChampBoard
            id="dateFin"
            name="dateFin"
            type="datetime-local"
            label="Fin des travaux"
            requis
            erreur={err("dateFin")}
          />
        </div>

        <ChampBatiment
          charte="board"
          batiments={batiments}
          erreur={err("batimentId")}
        />

        <ChampBoard
          id="lieu"
          name="lieu"
          label="Lieu précis"
          requis
          maxLength={500}
          placeholder="Ex : Sous-sol, local technique nord, près de la chaudière"
          erreur={err("lieu")}
        />

        <fieldset className="m-0 border-0 p-0">
          <legend className="label-board">Type(s) de point chaud *</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {NATURES_TRAVAUX.map((n) => (
              <label key={n} className={PILULE_COCHABLE}>
                <input
                  type="checkbox"
                  name="naturesTravaux"
                  value={n}
                  className="sr-only"
                />
                {LABEL_NATURE[n]}
              </label>
            ))}
          </div>
          {err("naturesTravaux") && (
            <p className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]">
              {err("naturesTravaux")}
            </p>
          )}
        </fieldset>

        <div>
          <label className="label-board" htmlFor="descriptionTravaux">
            Description des travaux *
          </label>
          <textarea
            id="descriptionTravaux"
            name="descriptionTravaux"
            required
            rows={4}
            maxLength={4000}
            minLength={10}
            className="champ-board min-h-[104px] resize-y"
            aria-invalid={Boolean(err("descriptionTravaux"))}
            aria-describedby={
              err("descriptionTravaux")
                ? "descriptionTravaux-erreur"
                : undefined
            }
            placeholder="Ex : Soudage de raccords sur tuyauterie inox au plafond du local technique. 4 soudures, durée estimée 3h."
          />
          {err("descriptionTravaux") && (
            <p
              id="descriptionTravaux-erreur"
              className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]"
            >
              {err("descriptionTravaux")}
            </p>
          )}
        </div>
      </SectionChamps>

      <SectionChamps
        titre="Check-list à valider avant, pendant, après"
        chapeau={`Une sélection de Rojer : ${MESURES_PERMIS_FEU.length} mesures reprises mot pour mot de la brochure INRS ED 6030, qui en décrit davantage. Rojer en signale ${nbObligatoires} comme prioritaires ; l'INRS ne les classe pas. Cochez celles qui sont en place.`}
      >
        {/* Les trois groupes sont séparés par le blanc, pas par un filet
            pointillé : le board sépare par filet plein ou pas du tout, et
            ici chaque mesure est déjà un bloc creux qui se détache. */}
        {(["avant", "pendant", "apres"] as const).map((g) => (
          <div key={g} className="flex flex-col gap-2.5">
            <div>
              <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                {GROUPES_LABEL[g].label}
              </p>
              <p className="m-0 mt-1 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                {GROUPES_LABEL[g].sous}
              </p>
            </div>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {groupes[g].map((m) => (
                <li key={m.id}>
                  {/* Cocher est un fait de saisie — « cette mesure est en
                      place » —, jamais un verdict de conformité : c'est
                      exactement ce que dit le vert du board. */}
                  <label className="flex cursor-pointer items-start gap-3 rounded-[18px] bg-[color:var(--board-slate-pale)] px-4 py-3 transition-colors has-[:checked]:bg-[color:var(--board-green)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--board-blue-strong)]">
                    <input
                      type="checkbox"
                      name="mesuresValidees"
                      value={m.id}
                      className="mt-0.5 size-4 flex-none accent-[color:var(--board-ink)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-2">
                        <span className="text-[13.5px] font-semibold leading-[1.4] text-[color:var(--board-ink)]">
                          {m.libelle}
                        </span>
                        {m.priorite === "obligatoire" && (
                          <span className="text-[11.5px] font-semibold text-[color:var(--board-signal-ink)]">
                            prioritaire
                          </span>
                        )}
                      </span>
                      {m.explication && (
                        <span className="mt-1 block text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                          {m.explication}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {/* Le refus d'une mesure retirée revient en `fieldErrors` : sans
            cette ligne, un formulaire ouvert avant le changement de liste
            échouait en silence (contre-lecture du 2026-09-26). */}
        {err("mesuresValidees") && (
          <p role="alert" className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
            {err("mesuresValidees")}
          </p>
        )}

        <fieldset className="m-0 border-0 p-0">
          <legend className="label-board">
            Durée de surveillance post-travaux *
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {DUREES_SURVEILLANCE_MINUTES.map((mn) => (
              <label key={mn} className={PILULE_COCHABLE}>
                <input
                  type="radio"
                  name="dureeSurveillanceMinutes"
                  value={mn}
                  defaultChecked={mn === 120}
                  className="sr-only"
                />
                {mn / 60}h{" "}
                {mn === 120
                  ? "(standard)"
                  : mn === 240
                    ? "(renforcé)"
                    : "(intensif)"}
              </label>
            ))}
          </div>
          <p className="m-0 mt-2 max-w-[62ch] text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]">
            L&apos;INRS (ED 6030)&nbsp;: «&nbsp;Surveillance à réaliser
            pendant 2 h au moins après l&apos;arrêt des travaux.&nbsp;»
            «&nbsp;Standard&nbsp;», «&nbsp;renforcé&nbsp;» et
            «&nbsp;intensif&nbsp;» sont des libellés de Rojer.
          </p>
        </fieldset>

        <div>
          <label className="label-board" htmlFor="mesuresNotes">
            Notes additionnelles sur la prévention
          </label>
          <textarea
            id="mesuresNotes"
            name="mesuresNotes"
            rows={3}
            maxLength={2000}
            className="champ-board min-h-[84px] resize-y"
            placeholder="Mesures spécifiques liées aux contraintes du site…"
          />
        </div>
      </SectionChamps>

      {/* Le message général ne se masque plus dès qu'il y a des erreurs de
          champ : un champ sans `err()` rendu (durée, fonction, notes…)
          restait muet (vérification du 2026-09-26). Toute erreur qu'aucun
          champ n'affiche est listée ici, sans câblage champ par champ. */}
      {state.status === "error" &&
        (!state.fieldErrors ||
          Object.keys(state.fieldErrors).some((k) => !CHAMPS_AVEC_ERREUR_RENDUE.has(k))) && (
          <div role="alert" className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
            <p className="m-0">{state.message}</p>
            {state.fieldErrors ? (
              <ul className="m-0 mt-1 pl-4">
                {Object.entries(state.fieldErrors)
                  .filter(([k]) => !CHAMPS_AVEC_ERREUR_RENDUE.has(k))
                  .map(([k, msgs]) => (
                    <li key={k}>{msgs?.[0]}</li>
                  ))}
              </ul>
            ) : null}
          </div>
        )}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="board" size="board" type="submit" disabled={pending}>
          {pending ? "Création…" : "Créer le permis et demander les signatures"}
        </Button>
        <Link
          href={`/etablissements/${etablissementId}/permis-feu`}
          className={buttonVariants({ variant: "boardClair", size: "board" })}
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
