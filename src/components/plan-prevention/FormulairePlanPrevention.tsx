"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChampBoard, LegalBadge, SectionChamps } from "@/components/ui-kit";
import { ChampBatiment } from "@/components/batiments/ChampBatiment";
import {
  creerPlanPrevention,
  type PlanActionState,
} from "@/lib/plan-prevention/actions";
import { diagnostiquerPlan } from "@/lib/plan-prevention/schema";
import {
  CHAPEAU_R4512_8,
  RUBRIQUES_R4512_8,
  URL_R4512_8,
} from "@/lib/plan-prevention/contenu-r4512-8";

type PrestataireLite = {
  id: string;
  raisonSociale: string;
  contactNom: string;
  contactEmail: string;
  siret: string | null;
};

/**
 * POURQUOI CES DEUX RÉPÉTEURS SONT CONTRÔLÉS, ET POURQUOI ILS PORTENT UNE CLÉ.
 *
 * Ils ne l'étaient pas : `key={i}`, `defaultValue`, et un état jamais mis à
 * jour à la frappe. React réconcilie alors par POSITION — retirer le rang 0 de
 * trois rangs conserve les nœuds 0 et 1 avec le texte qu'ils portaient et
 * démonte le 2. L'utilisateur clique « Retirer » sur la PREMIÈRE phase et perd
 * la TROISIÈME, la première restant sous ses yeux. Sur un formulaire dont le
 * produit n'offre aucun chemin d'édition, ce qui est perdu là ne se rattrape
 * jamais.
 *
 * Une clé stable par rang, et la valeur tenue par l'état : le nœud suit la
 * donnée au lieu de suivre son rang.
 *
 * Le répéteur des risques d'interférence avait le même défaut depuis toujours.
 * Il est corrigé du même geste : ce lot en installait une seconde instance sur
 * le même écran, et laisser les deux se comporter différemment aurait fait de
 * la correction une bizarrerie plutôt qu'une règle.
 */
type LigneState = {
  cle: string;
  risque: string;
  mesureEntrepriseUtilisatrice: string;
  mesureEntrepriseExterieure: string;
};

type PhaseState = { cle: string; phase: string; moyensPrevention: string };

let compteurRang = 0;
const nouvelleCle = () => `rang-${(compteurRang += 1)}`;

/** Les quatre rubriques de `R. 4512-8` qui sont un bloc de texte — le 1° est
 *  une liste appariée, il a son propre répéteur. L'ordre et le libellé
 *  viennent de `contenu-r4512-8.ts` : les nommer ici en aurait fait une
 *  deuxième liste, à côté de celle que la fiche et le ZIP servent déjà. */
const RUBRIQUES_TEXTE = [
  { numero: 2, name: "adaptationMateriels", rows: 3,
    placeholder:
      "Ex : nacelle élévatrice conforme et vérifiée du 12-03-2026, contrôle quotidien avant usage ; groupe électrogène EE raccordé sur le tableau de chantier, entretien à la charge de l'EE." },
  { numero: 3, name: "instructionsTravailleurs", rows: 3,
    placeholder:
      "Ex : accueil sécurité à l'arrivée, port du harnais obligatoire en toiture, interdiction de fumer, consignes d'évacuation remises au chef d'équipe." },
  { numero: 4, name: "organisationSecours", rows: 3,
    placeholder:
      "Ex : trousse de secours en cuisine, deux SST présents en journée (M. Dupond, Mme Martin), défibrillateur dans le hall, téléphone d'alerte au comptoir, accès pompiers par la cour." },
  { numero: 5, name: "participationCroisee", rows: 3,
    placeholder:
      "Ex : aucun salarié de l'établissement ne participe aux travaux ; le chef d'équipe EE commande seul son personnel et rend compte au gérant chaque matin." },
] as const;

/** Même pilule que le formulaire jumeau du permis de feu : un choix retenu
 *  est bleu glacier, jamais rouge — le papier peignait la sélection en
 *  `--minium`, ce qui faisait lire un choix comme un retard. */
const PILULE =
  "inline-flex cursor-pointer items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors";
const PILULE_REPOS =
  "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)]";
const PILULE_RETENUE =
  "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]";

/** Le textarea du board : mêmes jetons que `.champ-board`, hauteur libre. */
const TEXTAREA = "champ-board resize-y";

export function FormulairePlanPrevention({
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
  const boundAction = creerPlanPrevention.bind(null, etablissementId);
  const [state, formAction, pending] = useActionState<
    PlanActionState,
    FormData
  >(boundAction, { status: "idle" });

  const [prestataireChoisi, setPrestataireChoisi] =
    useState<PrestataireLite | null>(null);

  const [dureeHeures, setDureeHeures] = useState<number | null>(null);
  const [travauxDangereux, setTravauxDangereux] = useState(false);
  const diagnostic = useMemo(
    () => diagnostiquerPlan({ dureeHeuresEstimee: dureeHeures, travauxDangereux }),
    [dureeHeures, travauxDangereux],
  );

  const [lignes, setLignes] = useState<LigneState[]>(() => [
    {
      cle: nouvelleCle(),
      risque: "",
      mesureEntrepriseUtilisatrice: "",
      mesureEntrepriseExterieure: "",
    },
  ]);

  const [phases, setPhases] = useState<PhaseState[]>(() => [
    { cle: nouvelleCle(), phase: "", moyensPrevention: "" },
  ]);

  useEffect(() => {
    if (state.status === "success") {
      router.push(
        `/etablissements/${etablissementId}/plan-prevention/${state.planId}`,
      );
    }
  }, [state, etablissementId, router]);

  const err = (champ: string) =>
    state.status === "error" ? state.fieldErrors?.[champ]?.[0] : undefined;

  function ajouterLigne() {
    setLignes((l) => [
      ...l,
      {
        cle: nouvelleCle(),
        risque: "",
        mesureEntrepriseUtilisatrice: "",
        mesureEntrepriseExterieure: "",
      },
    ]);
  }

  function retirerLigne(cle: string) {
    setLignes((l) => (l.length === 1 ? l : l.filter((x) => x.cle !== cle)));
  }

  function majLigne(cle: string, champ: keyof Omit<LigneState, "cle">, v: string) {
    setLignes((l) => l.map((x) => (x.cle === cle ? { ...x, [champ]: v } : x)));
  }

  function ajouterPhase() {
    setPhases((p) => [
      ...p,
      { cle: nouvelleCle(), phase: "", moyensPrevention: "" },
    ]);
  }

  function retirerPhase(cle: string) {
    setPhases((p) => (p.length === 1 ? p : p.filter((x) => x.cle !== cle)));
  }

  function majPhase(cle: string, champ: keyof Omit<PhaseState, "cle">, v: string) {
    setPhases((p) => p.map((x) => (x.cle === cle ? { ...x, [champ]: v } : x)));
  }

  return (
    <form action={formAction} className="flex flex-col gap-9">
      {/* Le diagnostic reste sur un creux ardoise, quelle que soit sa
          conclusion : « plan écrit obligatoire » dit ce que la loi impose,
          pas où en est le dossier — ce n'est pas une échéance, et le board
          ne pose pas de rose là où rien n'a d'échéance (interdit 3). Ce
          sont les raisons, elles, qui portent l'encre de signal. */}
      <section className="rounded-[22px] bg-[color:var(--board-slate-pale)] px-6 py-5">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          Diagnostic — avez-vous besoin d&apos;un plan écrit ?
        </p>
        {/* « PLAN ÉCRIT RECOMMANDÉ » SE LISAIT « PLAN RECOMMANDÉ ». Le titre
            est la seule ligne de cette carte qu'on lit à coup sûr, et il
            répondait à la question de l'écrit par un mot — « recommandé » —
            qui, sous un titre commençant par « Plan », qualifiait le plan.
            Deux faits plutôt qu'un : le plan est dû (R. 4512-6, quelle que
            soit la durée), l'écrit ne l'est pas ici (R. 4512-7). */}
        <h2 className="board-titre m-0 mt-2 text-[22px]">
          {diagnostic.ecritObligatoire
            ? "Plan écrit obligatoire"
            : "Plan dû, écrit non imposé"}
        </h2>
        <p className="m-0 mt-2 max-w-[66ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
          {diagnostic.recommandation}
        </p>
        {diagnostic.raisons.length > 0 && (
          <ul className="m-0 mt-3 flex list-none flex-col gap-1 p-0 text-[12.5px] leading-[1.5] text-[color:var(--board-signal-ink)]">
            {diagnostic.raisons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <LegalBadge
            charte="board"
            reference="Art. R. 4512-7 CT"
            href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529783"
          />
        </div>
      </section>

      {/* Les sections ne sont plus numérotées : la numérotation ne se garde
          que si l'ordre porte une information. */}
      <SectionChamps titre="Entreprise extérieure" chapeau="Qui intervient chez vous.">
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
          </fieldset>
        )}

        <input
          type="hidden"
          name="prestataireId"
          value={prestataireChoisi?.id ?? ""}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ChampBoard
            id="entrepriseExterieureRaison"
            name="entrepriseExterieureRaison"
            label="Raison sociale"
            requis
            maxLength={200}
            defaultValue={prestataireChoisi?.raisonSociale ?? ""}
            key={prestataireChoisi?.id ?? "libre"}
            erreur={err("entrepriseExterieureRaison")}
          />
          <ChampBoard
            id="entrepriseExterieureSiret"
            name="entrepriseExterieureSiret"
            label="SIRET"
            inputMode="numeric"
            maxLength={17}
            defaultValue={prestataireChoisi?.siret ?? ""}
            key={`siret-${prestataireChoisi?.id ?? "libre"}`}
            erreur={err("entrepriseExterieureSiret")}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ChampBoard
            id="efChefNom"
            name="efChefNom"
            label="Chef d'entreprise extérieure"
            requis
            maxLength={200}
            defaultValue={prestataireChoisi?.contactNom ?? ""}
            key={`ef-${prestataireChoisi?.id ?? "libre"}`}
            erreur={err("efChefNom")}
          />
          <ChampBoard
            id="efChefEmail"
            name="efChefEmail"
            type="email"
            label="Email"
            requis
            maxLength={200}
            defaultValue={prestataireChoisi?.contactEmail ?? ""}
            key={`emailef-${prestataireChoisi?.id ?? "libre"}`}
            erreur={err("efChefEmail")}
          />
        </div>

        {/* `type="text" inputMode="numeric"` plutôt que `type="number"` :
            la molette d'un champ nombre modifie une valeur déjà saisie au
            premier défilement de page (charte § 5). Zod coerce la chaîne
            et tient les bornes côté serveur. */}
        <ChampBoard
          id="efEffectifIntervenant"
          name="efEffectifIntervenant"
          label="Effectif qui interviendra"
          type="text"
          inputMode="numeric"
          maxLength={4}
          defaultValue={1}
          className="max-w-[220px]"
          erreur={err("efEffectifIntervenant")}
        />
      </SectionChamps>

      <SectionChamps
        titre="Entreprise utilisatrice (vous)"
        chapeau="Qui signe côté site."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ChampBoard
            id="euChefNom"
            name="euChefNom"
            label="Nom du chef d'entreprise"
            requis
            maxLength={200}
            erreur={err("euChefNom")}
          />
          <ChampBoard
            id="euChefFonction"
            name="euChefFonction"
            label="Fonction"
            maxLength={120}
            placeholder="Ex : Gérant, Directeur d'établissement…"
            erreur={err("euChefFonction")}
          />
        </div>
      </SectionChamps>

      <SectionChamps titre="Travaux prévus" chapeau="Nature, durée, lieu.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ChampBoard
            id="dateDebut"
            name="dateDebut"
            type="datetime-local"
            label="Début"
            requis
            erreur={err("dateDebut")}
          />
          <ChampBoard
            id="dateFin"
            name="dateFin"
            type="datetime-local"
            label="Fin"
            requis
            erreur={err("dateFin")}
          />
        </div>

        <ChampBoard
          id="dureeHeuresEstimee"
          name="dureeHeuresEstimee"
          label="Durée totale estimée (heures)"
          type="text"
          inputMode="numeric"
          maxLength={5}
          className="max-w-[220px]"
          // Les deux moitiés du 1° de R. 4512-7 que le produit ne reprenait
          // pas, relevées au verbatim le 2026-09-02 : le total compte « les
          // entreprises sous-traitantes auxquelles elles peuvent faire
          // appel », et le seuil se déclenche aussi « dès lors qu'il apparaît,
          // en cours d'exécution des travaux, que le nombre d'heures doit
          // atteindre 400 heures ». Le module ne recalcule rien après
          // validation — c'est une limite, et l'aide la nomme plutôt que de
          // la taire.
          aide="Seuil R. 4512-7 : l'écrit est obligatoire dès 400 h atteintes sur une période d'au plus 12 mois. Comptez les heures de tous les intervenants, sous-traitants de l'entreprise extérieure compris. Le seuil vaut aussi s'il apparaît en cours de chantier que les 400 h seront atteintes : Rojer ne refait pas ce diagnostic après validation du plan."
          erreur={err("dureeHeuresEstimee")}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10);
            setDureeHeures(Number.isNaN(n) ? null : n);
          }}
        />

        <label className="flex cursor-pointer items-start gap-3 rounded-[18px] bg-[color:var(--board-slate-pale)] px-4 py-3.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--board-blue-strong)]">
          <input
            type="checkbox"
            name="travauxDangereux"
            checked={travauxDangereux}
            onChange={(e) => setTravauxDangereux(e.target.checked)}
            className="mt-0.5 size-4 flex-none accent-[color:var(--board-ink)]"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold leading-[1.4] text-[color:var(--board-ink)]">
              Les travaux figurent sur la liste dangereuse (arrêté 19-03-1993)
            </span>
            <span className="mt-1 block text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]">
              Ex : travaux sur toiture, espaces confinés, amiante,
              radioprotection, soudage en hauteur, travaux à chaud, tension
              &gt; 50V, levage lourd…
            </span>
          </span>
        </label>

        <ChampBatiment
          charte="board"
          batiments={batiments}
          erreur={err("batimentId")}
          aide="La zone principale de l'opération ; détaillez les lieux ci-dessous si elle en traverse plusieurs."
        />

        <ChampBoard
          id="lieux"
          name="lieux"
          label="Lieux d'intervention"
          requis
          maxLength={1000}
          placeholder="Ex : toiture, local technique sous-sol, chaufferie"
          erreur={err("lieux")}
        />

        <div>
          <label className="label-board" htmlFor="naturesTravaux">
            Nature précise des travaux *
          </label>
          <textarea
            id="naturesTravaux"
            name="naturesTravaux"
            required
            rows={4}
            maxLength={4000}
            className={`${TEXTAREA} min-h-[104px]`}
            aria-invalid={Boolean(err("naturesTravaux"))}
            aria-describedby={
              err("naturesTravaux") ? "naturesTravaux-erreur" : undefined
            }
            placeholder="Ex : remplacement complet de la membrane d'étanchéité toiture terrasse de 120 m², avec pose ponctuelle de chalumeau."
          />
          {err("naturesTravaux") && (
            <p
              id="naturesTravaux-erreur"
              className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]"
            >
              {err("naturesTravaux")}
            </p>
          )}
        </div>
      </SectionChamps>

      <SectionChamps
        titre="Inspection commune préalable"
        chapeau="Obligatoire avant démarrage, quelle que soit la durée des travaux. Art. R. 4512-2 : « Il est procédé, préalablement à l'exécution de l'opération réalisée par une entreprise extérieure, à une inspection commune des lieux de travail, des installations qui s'y trouvent et des matériels éventuellement mis à disposition des entreprises extérieures. »"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[220px_1fr]">
          <ChampBoard
            id="inspectionDate"
            name="inspectionDate"
            type="date"
            label="Date de l'inspection"
            erreur={err("inspectionDate")}
          />
          <div>
            <label className="label-board" htmlFor="inspectionParticipants">
              Participants à l&apos;inspection
            </label>
            <textarea
              id="inspectionParticipants"
              name="inspectionParticipants"
              rows={2}
              maxLength={2000}
              className={`${TEXTAREA} min-h-[72px]`}
              placeholder="Ex : M. Dupond (gérant), Mme Martin (chef de chantier EE), M. Petit (CSE)"
            />
          </div>
        </div>
      </SectionChamps>

      <SectionChamps
        titre="Analyse conjointe des risques d'interférence"
        chapeau="Pour chaque risque identifié lors de l'inspection, indiquez la mesure prise par chaque partie."
      >
        {/* Les risques sont séparés par un filet plein : le board sépare
            ainsi, ou pas du tout — il n'a pas de pointillé. */}
        {lignes.map((l, i) => (
          <div
            key={l.cle}
            className="flex flex-col gap-4 border-t border-[color:var(--board-slate-line)] pt-5 first:border-t-0 first:pt-0"
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                Risque #{i + 1}
              </p>
              {lignes.length > 1 && (
                <button
                  type="button"
                  onClick={() => retirerLigne(l.cle)}
                  className="text-[12.5px] font-semibold text-[color:var(--board-slate-mid)] transition-colors hover:text-[color:var(--board-signal-ink)]"
                >
                  Retirer
                </button>
              )}
            </div>

            <ChampBoard
              id={`risque-${l.cle}`}
              name={`lignes[${i}].risque`}
              label="Description du risque"
              requis
              value={l.risque}
              onChange={(e) => majLigne(l.cle, "risque", e.target.value)}
              maxLength={500}
              placeholder="Ex : chute de hauteur depuis la toiture sans garde-corps"
            />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="label-board" htmlFor={`mesureEU-${l.cle}`}>
                  Votre mesure (entreprise utilisatrice)
                </label>
                <textarea
                  id={`mesureEU-${l.cle}`}
                  name={`lignes[${i}].mesureEntrepriseUtilisatrice`}
                  value={l.mesureEntrepriseUtilisatrice}
                  onChange={(e) =>
                    majLigne(
                      l.cle,
                      "mesureEntrepriseUtilisatrice",
                      e.target.value,
                    )
                  }
                  rows={2}
                  maxLength={500}
                  className={`${TEXTAREA} min-h-[72px]`}
                />
              </div>
              <div>
                <label className="label-board" htmlFor={`mesureEE-${l.cle}`}>
                  Mesure EE (entreprise extérieure)
                </label>
                <textarea
                  id={`mesureEE-${l.cle}`}
                  name={`lignes[${i}].mesureEntrepriseExterieure`}
                  value={l.mesureEntrepriseExterieure}
                  onChange={(e) =>
                    majLigne(
                      l.cle,
                      "mesureEntrepriseExterieure",
                      e.target.value,
                    )
                  }
                  rows={2}
                  maxLength={500}
                  className={`${TEXTAREA} min-h-[72px]`}
                />
              </div>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={ajouterLigne}
            className={buttonVariants({
              variant: "boardClair",
              size: "boardSm",
            })}
          >
            Ajouter un risque
          </button>
          {err("lignes") && (
            <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
              {err("lignes")}
            </p>
          )}
        </div>
      </SectionChamps>

      {/* LES CINQ RUBRIQUES QUE LE PLAN ÉMIS NE PORTAIT PAS. R. 4512-8 écrit
          que les mesures du plan « comportent AU MOINS » cinq dispositions ;
          le formulaire n'en collectait aucune, et le ZIP remis à un tiers
          citait l'article en en-tête. Aucune n'est requise à la saisie : le
          produit n'a pas de porte de validation sur les plans, et en poser une
          au seul point de création aurait bloqué ici sans rien exiger à la
          clôture. Ce qui est vide se lit vide, sur la fiche comme dans le ZIP. */}
      <SectionChamps
        titre="Contenu minimal du plan"
        chapeau={`Art. R. 4512-8 : « ${CHAPEAU_R4512_8} » Ce que vous laissez vide est signalé comme manquant sur la fiche du plan et dans le dossier de contrôle — rien ne vous empêche d'enregistrer.`}
      >
        <div>
          <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            1° — {RUBRIQUES_R4512_8[0].titre}
          </p>
          <p className="m-0 mt-1.5 max-w-[70ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            « {RUBRIQUES_R4512_8[0].verbatim}. » À distinguer des risques
            d&apos;interférence ci-dessus : ceux-là naissent de la co-activité,
            les phases dangereuses sont celles de l&apos;opération elle-même.
          </p>
        </div>

        {phases.map((f, i) => (
          <div
            key={f.cle}
            className="flex flex-col gap-4 border-t border-[color:var(--board-slate-line)] pt-5"
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                Phase #{i + 1}
              </p>
              {phases.length > 1 && (
                <button
                  type="button"
                  onClick={() => retirerPhase(f.cle)}
                  className="text-[12.5px] font-semibold text-[color:var(--board-slate-mid)] transition-colors hover:text-[color:var(--board-signal-ink)]"
                >
                  Retirer
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ChampBoard
                id={`phase-${f.cle}`}
                name={`phases[${i}].phase`}
                label="Phase d'activité dangereuse"
                value={f.phase}
                onChange={(e) => majPhase(f.cle, "phase", e.target.value)}
                maxLength={500}
                placeholder="Ex : découpe au chalumeau en toiture"
              />
              <div>
                <label className="label-board" htmlFor={`moyens-${f.cle}`}>
                  Moyens de prévention spécifiques correspondants
                </label>
                <textarea
                  id={`moyens-${f.cle}`}
                  name={`phases[${i}].moyensPrevention`}
                  value={f.moyensPrevention}
                  onChange={(e) =>
                    majPhase(f.cle, "moyensPrevention", e.target.value)
                  }
                  rows={2}
                  maxLength={500}
                  className={`${TEXTAREA} min-h-[72px]`}
                  placeholder="Ex : permis de feu, extincteur à poste, surveillance 2 h après arrêt"
                />
              </div>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={ajouterPhase}
            className={buttonVariants({
              variant: "boardClair",
              size: "boardSm",
            })}
          >
            Ajouter une phase
          </button>
          {/* `extrairePhases` remonte désormais au schéma tout rang dont un
              champ porte quelque chose. Sans cet affichage, son erreur
              n'arriverait nulle part et la saisie semblerait avalée. */}
          {err("phases") && (
            <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
              {err("phases")}
            </p>
          )}
        </div>

        {RUBRIQUES_TEXTE.map((r) => {
          const rubrique = RUBRIQUES_R4512_8.find(
            (x) => x.numero === r.numero,
          )!;
          return (
            <div
              key={r.name}
              className="border-t border-[color:var(--board-slate-line)] pt-5"
            >
              <label className="label-board" htmlFor={r.name}>
                {r.numero}° — {rubrique.titre}
              </label>
              <p className="m-0 mb-2 mt-1 max-w-[70ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                « {rubrique.verbatim}. »
              </p>
              <textarea
                id={r.name}
                name={r.name}
                rows={r.rows}
                maxLength={4000}
                className={`${TEXTAREA} min-h-[88px]`}
                placeholder={r.placeholder}
                aria-invalid={Boolean(err(r.name))}
                aria-describedby={err(r.name) ? `${r.name}-erreur` : undefined}
              />
              {err(r.name) && (
                <p
                  id={`${r.name}-erreur`}
                  className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]"
                >
                  {err(r.name)}
                </p>
              )}
            </div>
          );
        })}

        <div>
          <LegalBadge
            charte="board"
            reference="Art. R. 4512-8 CT"
            href={URL_R4512_8}
          />
        </div>
      </SectionChamps>

      {state.status === "error" && !state.fieldErrors && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="board" size="board" type="submit" disabled={pending}>
          {pending ? "Création…" : "Créer le plan et demander les signatures"}
        </Button>
        <Link
          href={`/etablissements/${etablissementId}/plan-prevention`}
          className={buttonVariants({ variant: "boardClair", size: "board" })}
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
