"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChampBoard, LegalBadge, SectionChamps, Textes } from "@/components/ui-kit";
import { ChampBatiment } from "@/components/batiments/ChampBatiment";
import { ArticleEnClair } from "@/components/plan-prevention/ArticleEnClair";
import {
  creerPlanPrevention,
  modifierPlanPrevention,
  type PlanActionState,
} from "@/lib/plan-prevention/actions";
import { diagnostiquerPlan } from "@/lib/plan-prevention/schema";
import {
  RUBRIQUES_R4512_8,
  TEXTE_R4512_8,
  URL_R4512_8,
} from "@/lib/plan-prevention/contenu-r4512-8";
import {
  AIDE_DUREE_HEURES,
  CHAPITRE_R4512,
  CONSTAT_R4512_1,
  CONSTAT_R4512_9,
  CONSTAT_R4512_11,
  EN_CLAIR_R4463_8,
  EN_CLAIR_R4512_1,
  EN_CLAIR_R4512_2,
  EN_CLAIR_R4512_9,
  EN_CLAIR_R4512_11,
  EXTRAIT_R4512_12,
  R4463_8,
  R4512_1,
  R4512_2,
  R4512_9,
  R4512_11,
  SENS_R4512_6,
  SENS_R4512_7,
  URL_R4463_8,
  URL_R4512_1,
  URL_R4512_2,
  URL_R4512_6,
  URL_R4512_7,
  URL_R4512_9,
  URL_R4512_11,
  URL_R4512_12,
  citeR4512_12,
} from "@/lib/plan-prevention/annonces-plan";

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
 * la TROISIÈME, la première restant sous ses yeux. ~~Sur un formulaire dont le
 * produit n'offre aucun chemin d'édition, ce qui est perdu là ne se rattrape
 * jamais.~~ [2026-10-12 : le plan se modifie désormais, tant qu'aucune
 * signature ne le scelle — ce formulaire sert aux deux.]
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

// Les lignes présentes au premier rendu ont une clé fixe (`initiale`) : le
// serveur et le navigateur doivent produire les mêmes `id`, et un compteur de
// module ne vaut pas la même chose des deux côtés (erreur d'hydratation). Le
// compteur ne sert qu'aux lignes ajoutées ensuite, côté navigateur seulement.
let compteurRang = 0;
const nouvelleCle = () => `rang-${(compteurRang += 1)}`;
const initiale = (famille: string, i: number) => `${famille}-initiale-${i}`;

/** Les quatre rubriques de `R. 4512-8` qui sont un bloc de texte — le 1° est
 *  une liste appariée, il a son propre répéteur. L'ordre et le libellé
 *  viennent de `contenu-r4512-8.ts` : les nommer ici en aurait fait une
 *  deuxième liste, à côté de celle que la fiche et le ZIP servent déjà. */
const RUBRIQUES_TEXTE = [
  { numero: 2, name: "adaptationMateriels", rows: 3,
    placeholder:
      "Ex : nacelle élévatrice vérifiée le 12-03-2026, contrôle quotidien avant usage ; groupe électrogène EE raccordé sur le tableau de chantier, entretien à la charge de l'EE." },
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

/**
 * Un plan rouvert par l'écran « Modifier » (2026-10-12) : les valeurs telles
 * que le formulaire les affiche — dates déjà mises en saisie par le serveur,
 * en heure de Paris.
 */
export type PlanEdite = {
  id: string;
  prestataireId: string | null;
  entrepriseExterieureRaison: string;
  entrepriseExterieureSiret: string | null;
  efChefNom: string;
  efChefEmail: string;
  efEffectifIntervenant: number;
  euChefNom: string;
  euChefFonction: string | null;
  /** « AAAA-MM-JJTHH:MM » */
  dateDebut: string;
  dateFin: string;
  dureeHeuresEstimee: number | null;
  lieux: string;
  batimentId: string | null;
  naturesTravaux: string;
  travauxDangereux: boolean;
  /** « AAAA-MM-JJ » */
  inspectionDate: string | null;
  inspectionParticipants: string | null;
  lignes: Omit<LigneState, "cle">[];
  phases: Omit<PhaseState, "cle">[];
  adaptationMateriels: string | null;
  instructionsTravailleurs: string | null;
  organisationSecours: string | null;
  participationCroisee: string | null;
};

export function FormulairePlanPrevention({
  etablissementId,
  prestataires,
  batiments = [],
  plan,
  scelle = null,
  avisLiens = null,
}: {
  etablissementId: string;
  prestataires: PrestataireLite[];
  /** Rendu seulement à partir de deux (ADR-019). */
  batiments?: { id: string; nom: string }[];
  /** Présent : le formulaire corrige ce plan au lieu d'en créer un. */
  plan?: PlanEdite;
  /** Le motif qui scelle le contenu (`motifContenuScelle`) : ce qu'une
   *  signature couvre est rendu non modifiable, seule la zone reste ouverte. */
  scelle?: string | null;
  /** Des liens de signature attendent une réponse (`avisLiensEnVol`) : changer
   *  le contenu les annule, et l'écran le dit avant l'envoi. */
  avisLiens?: string | null;
}) {
  const router = useRouter();
  const boundAction = plan
    ? modifierPlanPrevention.bind(null, plan.id)
    : creerPlanPrevention.bind(null, etablissementId);
  const [state, formAction, pending] = useActionState<
    PlanActionState,
    FormData
  >(boundAction, { status: "idle" });

  const [prestataireChoisi, setPrestataireChoisi] =
    useState<PrestataireLite | null>(null);
  // Distinct du prestataire choisi : un plan rouvert garde son rattachement à
  // l'annuaire sans que la fiche de l'annuaire réécrive ce qu'il porte.
  const [prestataireId, setPrestataireId] = useState(plan?.prestataireId ?? "");

  const [dureeHeures, setDureeHeures] = useState<number | null>(
    plan?.dureeHeuresEstimee ?? null,
  );
  const [travauxDangereux, setTravauxDangereux] = useState(
    plan?.travauxDangereux ?? false,
  );
  const diagnostic = useMemo(
    () => diagnostiquerPlan({ dureeHeuresEstimee: dureeHeures, travauxDangereux }),
    [dureeHeures, travauxDangereux],
  );

  const [lignes, setLignes] = useState<LigneState[]>(() =>
    plan && plan.lignes.length > 0
      ? plan.lignes.map((l, i) => ({ cle: initiale("ligne", i), ...l }))
      : [
          {
            cle: initiale("ligne", 0),
            risque: "",
            mesureEntrepriseUtilisatrice: "",
            mesureEntrepriseExterieure: "",
          },
        ],
  );

  const [phases, setPhases] = useState<PhaseState[]>(() =>
    plan && plan.phases.length > 0
      ? plan.phases.map((f, i) => ({ cle: initiale("phase", i), ...f }))
      : [{ cle: initiale("phase", 0), phase: "", moyensPrevention: "" }],
  );

  // Un champ texte d'un plan rouvert : la valeur choisie dans l'annuaire
  // l'emporte, sinon celle que le plan porte.
  const valeur = (v: string | number | null | undefined) =>
    v == null ? "" : String(v);

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
      {/* UN PLAN SIGNÉ NE SE RÉÉCRIT PAS EN SILENCE (2026-10-12). Ce que
          l'empreinte couvre est désactivé — donc ni modifiable ni envoyé —,
          et l'écran dit pourquoi ; la zone, hors empreinte, reste ouverte. */}
      {scelle && (
        <section className="rounded-[22px] bg-[color:var(--board-slate-pale)] px-6 py-5">
          <p className="m-0 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.6] text-[color:var(--board-ink)]">
            {scelle}
          </p>
          <div className="mt-4">
            <ChampBatiment
              charte="board"
              batiments={batiments}
              defaultValue={plan?.batimentId}
              erreur={err("batimentId")}
            />
          </div>
        </section>
      )}
      {!scelle && avisLiens && (
        <p className="m-0 max-w-[var(--board-mesure)] rounded-[22px] bg-[color:var(--board-slate-pale)] px-6 py-5 text-[13.5px] leading-[1.6] text-[color:var(--board-ink)]">
          {avisLiens}
        </p>
      )}
      <fieldset
        disabled={Boolean(scelle)}
        className="m-0 flex min-w-0 flex-col gap-9 border-0 p-0"
      >
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
          {/* Trois états : sans durée ni travaux dangereux, Rojer ne sait
              pas, et le titre le dit au lieu de conclure « non imposé ». */}
          {diagnostic.ecrit === "obligatoire"
            ? "Plan écrit obligatoire"
            : diagnostic.ecrit === "indetermine"
              ? "Plan dû, durée non renseignée"
              : "Plan dû, écrit non imposé"}
        </h2>
        <p className="m-0 mt-2 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
          {diagnostic.recommandation}
        </p>
        {diagnostic.raisons.length > 0 && (
          <ul className="m-0 mt-3 flex list-none flex-col gap-1 p-0 text-[12.5px] leading-[1.5] text-[color:var(--board-signal-ink)]">
            {diagnostic.raisons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
        {/* UN SEUL LIVRE (2026-10-28). Les articles que la phrase résume :
            l'écrit (R. 4512-7), l'inspection (R. 4512-2), l'accord
            (R. 4512-6), et R. 4512-12 dans les deux états où il se dit. Deux
            livres « Texte » côte à côte ne se distinguaient pas. */}
        <Textes className="mt-4">
          <LegalBadge reference="Art. R. 4512-7 CT" href={URL_R4512_7}>
            {SENS_R4512_7}
          </LegalBadge>
          <LegalBadge reference="Art. R. 4512-2 CT" href={URL_R4512_2} extrait={R4512_2} />
          <LegalBadge reference="Art. R. 4512-6 CT" href={URL_R4512_6}>
            {SENS_R4512_6}
          </LegalBadge>
          {citeR4512_12(diagnostic.ecrit) && (
            <LegalBadge
              reference="Art. R. 4512-12 CT"
              href={URL_R4512_12}
              extrait={EXTRAIT_R4512_12}
            />
          )}
        </Textes>
      </section>

      {/* Les sections ne sont plus numérotées : la numérotation ne se garde
          que si l'ordre porte une information. */}
      {/* R. 4512-1, dit ici parce que c'est la section qui nomme L'entreprise
          extérieure, au singulier : le modèle n'en connaît qu'une par plan.
          En clair, puis le constat sur le produit ; le texte et l'antécédent
          de « le présent chapitre » sous le livre (2026-10-28).
          `annonces-plan.ts` les écrit une fois. */}
      <SectionChamps
        titre="Entreprise extérieure"
        chapeau={
          <>
            Qui intervient chez vous. {EN_CLAIR_R4512_1} {CONSTAT_R4512_1}
          </>
        }
      >
        <LegalBadge reference="Art. R. 4512-1 CT" href={URL_R4512_1} extrait={R4512_1}>
          {CHAPITRE_R4512}
        </LegalBadge>
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
                    onClick={() => {
                      setPrestataireChoisi(actif ? null : p);
                      setPrestataireId(actif ? "" : p.id);
                    }}
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
          value={prestataireId}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ChampBoard
            id="entrepriseExterieureRaison"
            name="entrepriseExterieureRaison"
            label="Raison sociale"
            requis
            maxLength={200}
            defaultValue={prestataireChoisi?.raisonSociale ?? valeur(plan?.entrepriseExterieureRaison)}
            key={prestataireChoisi?.id ?? "libre"}
            erreur={err("entrepriseExterieureRaison")}
          />
          <ChampBoard
            id="entrepriseExterieureSiret"
            name="entrepriseExterieureSiret"
            label="SIRET"
            inputMode="numeric"
            maxLength={17}
            defaultValue={prestataireChoisi?.siret ?? valeur(plan?.entrepriseExterieureSiret)}
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
            defaultValue={prestataireChoisi?.contactNom ?? valeur(plan?.efChefNom)}
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
            defaultValue={prestataireChoisi?.contactEmail ?? valeur(plan?.efChefEmail)}
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
          defaultValue={plan?.efEffectifIntervenant ?? 1}
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
            defaultValue={valeur(plan?.euChefNom)}
            maxLength={200}
            erreur={err("euChefNom")}
          />
          <ChampBoard
            id="euChefFonction"
            name="euChefFonction"
            label="Fonction"
            defaultValue={valeur(plan?.euChefFonction)}
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
            defaultValue={valeur(plan?.dateDebut)}
            requis
            erreur={err("dateDebut")}
          />
          <ChampBoard
            id="dateFin"
            name="dateFin"
            type="datetime-local"
            label="Fin"
            defaultValue={valeur(plan?.dateFin)}
            requis
            erreur={err("dateFin")}
          />
        </div>

        <ChampBoard
          id="dureeHeuresEstimee"
          name="dureeHeuresEstimee"
          label="Durée totale estimée (heures)"
          defaultValue={valeur(plan?.dureeHeuresEstimee)}
          type="text"
          inputMode="numeric"
          maxLength={5}
          // La largeur bornée est celle du champ, pas du bloc : bornée sur le
          // bloc, l'aide s'étirait sur cinq lignes étroites.
          champClassName="max-w-[220px]"
          // Le total compte les sous-traitants, et les heures revues en cours
          // de chantier se notent sur la fiche (`seuil400EnCours`).
          aide={AIDE_DUREE_HEURES}
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
              {/* « (art. R. 4512-7, 2°) » retiré le 2026-10-28 : l'article
                  s'ouvre sous le livre du diagnostic. */}
              Les travaux figurent sur la liste des travaux dangereux de
              l&apos;arrêté du 19 mars 1993 ou, pour les travaux agricoles,
              de l&apos;arrêté du ministre chargé de l&apos;agriculture
            </span>
            {/* Les exemples sont des points de la liste, entre guillemets
                (C40, suite). Ils étaient paraphrasés, et plusieurs en
                faisaient plus que l'arrêté : « travaux sur toiture »,
                « soudage en hauteur », « travaux à chaud », « levage lourd »
                n'y figurent pas sous ces mots. */}
            <span className="mt-1 block text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]">
              Parmi les vingt et un points de la liste : « Travaux de
              démolition », « Travaux exposant au contact avec des pièces
              nues sous tension supérieure à la T. B. T. », « Travaux dans ou
              sur des cuves et accumulateurs de matière ou en atmosphère
              confinée », « Travaux de soudage oxyacétylénique exigeant le
              recours à un permis de feu »…
            </span>
          </span>
        </label>

        {!scelle && (
          <ChampBatiment
            charte="board"
            batiments={batiments}
            defaultValue={plan?.batimentId}
            erreur={err("batimentId")}
            aide="La zone principale de l'opération ; détaillez les lieux ci-dessous si elle en traverse plusieurs."
          />
        )}

        <ChampBoard
          id="lieux"
          name="lieux"
          label="Lieux d'intervention"
          defaultValue={valeur(plan?.lieux)}
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
            defaultValue={valeur(plan?.naturesTravaux)}
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

      {/* Le moment de R. 4512-2 — « avant l'exécution », pas celui de
          R. 4512-6 (C40). L'article sous le livre, pris à `annonces-plan.ts`. */}
      <SectionChamps
        titre="Inspection commune préalable"
        chapeau={EN_CLAIR_R4512_2}
      >
        <LegalBadge reference="Art. R. 4512-2 CT" href={URL_R4512_2} extrait={R4512_2} />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[220px_1fr]">
          <ChampBoard
            id="inspectionDate"
            name="inspectionDate"
            type="date"
            label="Date de l'inspection"
            defaultValue={valeur(plan?.inspectionDate)}
            erreur={err("inspectionDate")}
          />
          <div>
            <label className="label-board" htmlFor="inspectionParticipants">
              Participants à l&apos;inspection
            </label>
            <textarea
              id="inspectionParticipants"
              name="inspectionParticipants"
              defaultValue={valeur(plan?.inspectionParticipants)}
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
        // R. 4463-8 : « le cas échéant » laisse l'appréciation aux
        // employeurs, et la phrase en clair le garde. L'article entier sous
        // le livre (2026-10-28).
        chapeau={
          <>
            Pour chaque risque identifié lors de l&apos;inspection, indiquez la
            mesure prise par chaque partie. {EN_CLAIR_R4463_8}
          </>
        }
      >
        <LegalBadge reference="Art. R. 4463-8 CT" href={URL_R4463_8} extrait={R4463_8} />
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
        // 2026-10-28 : la citation du chapeau et celle de chaque rubrique
        // passent sous le livre de l'article, en tête de section ; le titre
        // de chaque rubrique dit déjà ce qu'on y écrit.
        chapeau="Les rubriques que le plan contient au moins. Ce que vous laissez vide est signalé comme manquant sur la fiche du plan et dans le dossier de contrôle — rien ne vous empêche d'enregistrer."
      >
        <LegalBadge reference="Art. R. 4512-8 CT" href={URL_R4512_8}>
          {TEXTE_R4512_8}
        </LegalBadge>
        <div>
          <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            1° — {RUBRIQUES_R4512_8[0].titre}
          </p>
          <p className="m-0 mt-1.5 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            Les phases dangereuses de l&apos;opération elle-même, et les moyens
            de prévention de chacune. À distinguer des risques
            d&apos;interférence ci-dessus, qui naissent de la co-activité.
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
              <textarea
                id={r.name}
                name={r.name}
                defaultValue={valeur(plan?.[r.name])}
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

        {/* DEUX PIÈCES QUE D'AUTRES ARTICLES FONT FIGURER DANS LE PLAN, et
            pour lesquelles ce formulaire n'a pas de champ. Les taire laissait
            croire que les cinq rubriques ci-dessus sont tout le plan. Le
            constat est sur le produit ; ce qu'est une « entreprise
            concernée » ou un « dossier technique », le texte le dit, pas nous. */}
        {/* En clair et le constat ; l'article sous son livre (2026-10-28).
            Écrits un par un, pas en boucle : la garde des extraits
            (`extraits-affiches.test.ts`) lit la `reference` littérale. */}
        <ArticleEnClair
          className="border-t border-[color:var(--board-slate-line)] pt-5"
          titre="Liste des postes en suivi individuel renforcé"
          texte={EN_CLAIR_R4512_9}
          constat={CONSTAT_R4512_9}
        >
          <LegalBadge className="mt-2" reference="Art. R. 4512-9 CT" href={URL_R4512_9} extrait={R4512_9} />
        </ArticleEnClair>
        <ArticleEnClair
          className="border-t border-[color:var(--board-slate-line)] pt-5"
          titre="Dossiers techniques amiante"
          texte={EN_CLAIR_R4512_11}
          constat={CONSTAT_R4512_11}
        >
          <LegalBadge className="mt-2" reference="Art. R. 4512-11 CT" href={URL_R4512_11} extrait={R4512_11} />
        </ArticleEnClair>
      </SectionChamps>

      </fieldset>

      {state.status === "error" && !state.fieldErrors && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="board" size="board" type="submit" disabled={pending}>
          {plan
            ? pending
              ? "Enregistrement…"
              : "Enregistrer les modifications"
            : pending
              ? "Création…"
              : "Créer le plan et demander les signatures"}
        </Button>
        <Link
          href={`/etablissements/${etablissementId}/plan-prevention${plan ? `/${plan.id}` : ""}`}
          className={buttonVariants({ variant: "boardClair", size: "board" })}
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
