"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChampBoard, LegalBadge, Textes } from "@/components/ui-kit";
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
  rubriquesRenseignees,
  type ContenuPlan,
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
import { FAMILLES_RISQUE, libelleFamille } from "@/lib/plan-prevention/familles-risque";
import { basculerFamille, ligneVide, type LigneState } from "./lignes-risque";
import { LIBELLES_COMPLEMENTS } from "@/lib/plan-prevention/complements";

type PrestataireLite = {
  id: string;
  raisonSociale: string;
  contactNom: string;
  contactEmail: string;
  contactTelephone: string | null;
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
// Les lignes de risque et les familles de RiskBoard : `lignes-risque.ts`.

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
// [2026-11-19, maquette V2 « Formulaire »] Le choix retenu en encre pleine,
// les autres en contour blanc — toujours ni rouge, ni couleur d'état.
const PILULE =
  "inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[13px] transition-colors";
const PILULE_REPOS =
  "border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] text-[color:var(--board-ink)] hover:bg-[color:var(--board-slate-pale)]";
const PILULE_RETENUE =
  "border-[color:var(--board-ink)] bg-[color:var(--board-ink)] text-white";

/** Le textarea du board : mêmes jetons que `.champ-board`, hauteur libre. */
const TEXTAREA = "champ-board resize-y";

/** Les trois rubriques reprises de RiskBoard (2026-11-21), hors du minimum
 *  de R. 4512-8 ; les libellés viennent de `complements.ts`, que la fiche, le
 *  PDF et le dossier de contrôle lisent aussi. */
const COMPLEMENTS_TEXTE = [
  { name: "qualificationsRequises",
    placeholder: "Ex : habilitation électrique B1V, formation au travail en hauteur, aptitude médicale à jour." },
  { name: "moyensFournis",
    placeholder: "Ex : vestiaire du personnel, prise 16 A au local technique, accès au monte-charge." },
  { name: "autresObservations",
    placeholder: "Ex : livraisons de la cuisine entre 9 h et 10 h, accès par la cour." },
] as const;

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
  entrepriseExterieureAdresse: string | null;
  efChefTelephone: string | null;
  euChefNom: string;
  euChefFonction: string | null;
  euChefTelephone: string | null;
  /** « AAAA-MM-JJTHH:MM » */
  dateDebut: string;
  dateFin: string;
  dureeHeuresEstimee: number | null;
  lieux: string;
  batimentId: string | null;
  naturesTravaux: string;
  travauxDangereux: boolean;
  horaires: string | null;
  /** « AAAA-MM-JJ » */
  inspectionDate: string | null;
  inspectionParticipants: string | null;
  cseAssocie: boolean | null;
  lignes: Omit<LigneState, "cle">[];
  phases: Omit<PhaseState, "cle">[];
  adaptationMateriels: string | null;
  instructionsTravailleurs: string | null;
  organisationSecours: string | null;
  participationCroisee: string | null;
  qualificationsRequises: string | null;
  moyensFournis: string | null;
  autresObservations: string | null;
};

export function FormulairePlanPrevention({
  etablissementId,
  prestataires,
  batiments = [],
  plan,
  scelle = null,
  avisLiens = null,
  retourHref,
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
  /**
   * Où ramènent « Annuler » et l'enregistrement d'un plan rouvert — l'onglet
   * « Suivi » quand une correction court (2026-11-21). Absent : la fiche du
   * plan, ou la liste à la création.
   */
  retourHref?: string;
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
      : [ligneVide(initiale("ligne", 0))],
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
        retourHref ?? `/etablissements/${etablissementId}/plan-prevention/${state.planId}`,
      );
    }
  }, [state, etablissementId, router, retourHref]);

  const err = (champ: string) =>
    state.status === "error" ? state.fieldErrors?.[champ]?.[0] : undefined;

  function ajouterLigne() {
    setLignes((l) => [...l, ligneVide(nouvelleCle())]);
  }

  // Cocher, décocher une famille de RiskBoard : la règle est dans `lignes-risque.ts`.
  const cocherFamille = (code: string) => setLignes((l) => basculerFamille(l, code, nouvelleCle));

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


  // LE SOMMAIRE (2026-11-19, maquette V2 « Formulaire ») : une coche par
  // partie remplie, « n / 5 » pour le contenu minimal. Lu sur le formulaire
  // à chaque saisie — les champs restent non contrôlés, la lecture ne change
  // rien à ce qui part au serveur.
  const formulaire = useRef<HTMLFormElement | null>(null);
  const [saisie, setSaisie] = useState<Record<string, string>>({});
  const relire = useCallback(() => {
    const f = formulaire.current;
    if (!f) return;
    const lu: Record<string, string> = {};
    for (const [k, v] of new FormData(f).entries()) if (typeof v === "string") lu[k] = v.trim();
    setSaisie(lu);
  }, []);
  useEffect(() => {
    relire();
  }, [relire]);
  // Avant la première lecture (rendu serveur), les valeurs du plan rouvert.
  const v = (nom: string, defaut: string | number | null | undefined) =>
    nom in saisie ? saisie[nom] : String(defaut ?? "").trim();
  const contenu: ContenuPlan = {
    phasesDangereuses: phases.map((f) => ({ phase: f.phase, moyensPrevention: f.moyensPrevention })),
    adaptationMateriels: v("adaptationMateriels", plan?.adaptationMateriels),
    instructionsTravailleurs: v("instructionsTravailleurs", plan?.instructionsTravailleurs),
    organisationSecours: v("organisationSecours", plan?.organisationSecours),
    participationCroisee: v("participationCroisee", plan?.participationCroisee),
  };
  const remplies = rubriquesRenseignees(contenu);
  const rubriquesRemplies = remplies.length;
  const parties: { ancre: string; titre: string; remplie: boolean; compte?: string }[] = [
    {
      ancre: "pp-ee",
      titre: "Entreprise extérieure",
      remplie: Boolean(
        v("entrepriseExterieureRaison", plan?.entrepriseExterieureRaison) &&
          v("efChefNom", plan?.efChefNom) &&
          v("efChefEmail", plan?.efChefEmail),
      ),
    },
    {
      ancre: "pp-travaux",
      titre: "Travaux",
      remplie: Boolean(
        v("naturesTravaux", plan?.naturesTravaux) &&
          v("lieux", plan?.lieux) &&
          v("dateDebut", plan?.dateDebut) &&
          v("dateFin", plan?.dateFin),
      ),
    },
    { ancre: "pp-inspection", titre: "Inspection commune", remplie: Boolean(v("inspectionDate", plan?.inspectionDate)) },
    { ancre: "pp-risques", titre: "Risques et mesures", remplie: lignes.some((l) => l.risque.trim()) },
    {
      ancre: "pp-contenu",
      titre: "Contenu minimal",
      remplie: rubriquesRemplies === RUBRIQUES_R4512_8.length,
      compte: `${rubriquesRemplies} / ${RUBRIQUES_R4512_8.length}`,
    },
    {
      ancre: "pp-complements",
      titre: "Compléments",
      remplie: COMPLEMENTS_TEXTE.some((c) => v(c.name, plan?.[c.name])),
    },
  ];
  // Les rubriques ouvertes au premier affichage : celles qui portent déjà quelque chose.
  const [rubriquesOuvertes] = useState(() => new Set(remplies.map((r) => r.numero)));

  return (
    <form
      ref={formulaire}
      action={formAction}
      onInput={relire}
      onChange={relire}
      className="mx-auto flex w-full max-w-[1180px] flex-col gap-6"
    >
      <div className="flex flex-wrap items-start gap-6">
        <aside className="flex min-w-0 flex-[1_1_260px] flex-col gap-4 md:sticky md:top-6 md:max-w-[300px]">
          <nav aria-label="Parties du plan" className="carte-board flex flex-col px-5 py-[18px]">
            {parties.map((p, i) => (
              <a
                key={p.ancre}
                href={`#${p.ancre}`}
                className={`flex min-h-11 items-center justify-between gap-3 text-[14.5px] no-underline ${
                  i > 0 ? "border-t border-[color:var(--board-slate-pale)]" : ""
                } ${p.remplie ? "font-medium text-[color:var(--board-ink)]" : "text-[color:var(--board-slate-mid)]"}`}
              >
                {p.titre}
                {p.compte ? (
                  <span className="font-mono text-[11px] text-[color:var(--board-slate-soft)]">
                    {p.compte}
                    <span className="sr-only"> rubriques renseignées</span>
                  </span>
                ) : p.remplie ? (
                  <span className="flex size-[18px] items-center justify-center rounded-full bg-[color:var(--board-green)] text-[color:var(--board-green-ink)]">
                    <Check className="size-2.5" strokeWidth={3.5} aria-hidden />
                    <span className="sr-only">rempli</span>
                  </span>
                ) : (
                  <span className="size-[18px] rounded-full border-2 border-[color:var(--board-slate)]">
                    <span className="sr-only">à remplir</span>
                  </span>
                )}
              </a>
            ))}
          </nav>

          {/* Le diagnostic, en court, sur un fond blanc : « plan écrit
              obligatoire » dit ce que la loi impose, pas où en est le
              dossier — ce n'est pas une échéance (interdit 3). Ce sont les
              raisons, elles, qui portent l'encre de signal. */}
          <section className="carte-board flex flex-col gap-2 px-5 py-[18px]" aria-labelledby="pp-diagnostic">
            <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.14em] text-[color:var(--board-slate-soft)]">
              Faut-il un plan écrit ?
            </p>
            <h2 id="pp-diagnostic" className="board-titre m-0 text-[19px] leading-[1.2]">
              {/* Trois états : sans durée ni travaux dangereux, Rojer ne sait
                  pas, et le titre le dit au lieu de conclure « non imposé ». */}
              {diagnostic.ecrit === "obligatoire"
                ? "Plan écrit obligatoire"
                : diagnostic.ecrit === "indetermine"
                  ? "Plan dû, durée non renseignée"
                  : "Plan dû, écrit non imposé"}
            </h2>
            <p className="m-0 text-[13px] leading-[1.5] text-[color:var(--board-slate-mid)]">
              {diagnostic.recommandation}
            </p>
            {diagnostic.raisons.length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[12.5px] leading-[1.5] text-[color:var(--board-signal-ink)]">
                {diagnostic.raisons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
            {/* UN SEUL LIVRE (2026-10-28) : l'écrit (R. 4512-7), l'inspection
                (R. 4512-2), l'accord (R. 4512-6), et R. 4512-12 dans les deux
                états où il se dit. */}
            <Textes>
              <LegalBadge reference="Art. R. 4512-7 CT" href={URL_R4512_7}>
                {SENS_R4512_7}
              </LegalBadge>
              <LegalBadge reference="Art. R. 4512-2 CT" href={URL_R4512_2} extrait={R4512_2} />
              <LegalBadge reference="Art. R. 4512-6 CT" href={URL_R4512_6}>
                {SENS_R4512_6}
              </LegalBadge>
              {citeR4512_12(diagnostic.ecrit) && (
                <LegalBadge reference="Art. R. 4512-12 CT" href={URL_R4512_12} extrait={EXTRAIT_R4512_12} />
              )}
            </Textes>
          </section>
        </aside>

        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
          {/* UN PLAN SIGNÉ NE SE RÉÉCRIT PAS EN SILENCE (2026-10-12). Ce que
              l'empreinte couvre est désactivé — donc ni modifiable ni envoyé —,
              et l'écran dit pourquoi ; la zone, hors empreinte, reste ouverte. */}
          {scelle && (
            <section className="carte-board px-6 py-6 md:px-8">
              <p className="m-0 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.6] text-[color:var(--board-ink)]">
                {scelle}
              </p>
              <div className="mt-4">
                <ChampBatiment charte="board" batiments={batiments} defaultValue={plan?.batimentId} erreur={err("batimentId")} />
              </div>
            </section>
          )}
          {!scelle && avisLiens && (
            <p className="carte-board m-0 px-6 py-5 text-[13.5px] leading-[1.6] text-[color:var(--board-ink)] md:px-8">
              {avisLiens}
            </p>
          )}

          <fieldset disabled={Boolean(scelle)} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
            {/* R. 4512-1, dit ici parce que c'est la section qui nomme
                L'entreprise extérieure, au singulier. En clair, puis le
                constat ; le texte sous le livre (2026-10-28). */}
            <section id="pp-ee" className={CARTE} aria-labelledby="pp-ee-titre">
              <EnTeteCarte id="pp-ee-titre" titre="Entreprise extérieure" note="Qui intervient chez vous" />
              <p className={CHAPEAU}>
                {EN_CLAIR_R4512_1} {CONSTAT_R4512_1}
              </p>
              <LegalBadge reference="Art. R. 4512-1 CT" href={URL_R4512_1} extrait={R4512_1}>
                {CHAPITRE_R4512}
              </LegalBadge>
              {prestataires.length > 0 && (
                <fieldset className="m-0 flex flex-wrap items-center gap-2 border-0 p-0">
                  <legend className="float-left mr-1 text-[13px] text-[color:var(--board-slate-mid)]">
                    Depuis vos prestataires :
                  </legend>
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
                        className={`${PILULE} ${actif ? PILULE_RETENUE : PILULE_REPOS}`}
                      >
                        {p.raisonSociale}
                      </button>
                    );
                  })}
                </fieldset>
              )}

              <input type="hidden" name="prestataireId" value={prestataireId} />

              <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 md:grid-cols-2">
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
                  label="SIRET (facultatif)"
                  inputMode="numeric"
                  maxLength={17}
                  placeholder="14 chiffres"
                  defaultValue={prestataireChoisi?.siret ?? valeur(plan?.entrepriseExterieureSiret)}
                  key={`siret-${prestataireChoisi?.id ?? "libre"}`}
                  erreur={err("entrepriseExterieureSiret")}
                />
                <ChampBoard
                  id="efChefNom"
                  name="efChefNom"
                  label="Chef d'entreprise"
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
                  label="E-mail, pour la signature"
                  requis
                  maxLength={200}
                  defaultValue={prestataireChoisi?.contactEmail ?? valeur(plan?.efChefEmail)}
                  key={`emailef-${prestataireChoisi?.id ?? "libre"}`}
                  erreur={err("efChefEmail")}
                />
                {/* `type="text" inputMode="numeric"` plutôt que `type="number"` :
                    la molette d'un champ nombre modifie une valeur déjà saisie
                    au premier défilement de page (charte § 5). Zod coerce la
                    chaîne et tient les bornes côté serveur. */}
                <ChampBoard
                  id="efEffectifIntervenant"
                  name="efEffectifIntervenant"
                  label="Intervenants"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  defaultValue={plan?.efEffectifIntervenant ?? 1}
                  erreur={err("efEffectifIntervenant")}
                />
                <ChampBoard
                  id="efChefTelephone"
                  name="efChefTelephone"
                  type="tel"
                  label="Téléphone (facultatif)"
                  maxLength={30}
                  defaultValue={prestataireChoisi?.contactTelephone ?? valeur(plan?.efChefTelephone)}
                  key={`telef-${prestataireChoisi?.id ?? "libre"}`}
                  erreur={err("efChefTelephone")}
                />
              </div>
              <ChampBoard
                id="entrepriseExterieureAdresse"
                name="entrepriseExterieureAdresse"
                label="Adresse (facultatif)"
                maxLength={500}
                placeholder="Ex : 12 rue des Artisans, 69007 Lyon"
                defaultValue={valeur(plan?.entrepriseExterieureAdresse)}
                erreur={err("entrepriseExterieureAdresse")}
              />

              {/* L'entreprise utilisatrice — vous : qui signe côté site. */}
              <div className="border-t border-[color:var(--board-slate-pale)] pt-4">
                <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.14em] text-[color:var(--board-slate-soft)]">
                  De votre côté, l&apos;entreprise utilisatrice
                </p>
                <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3.5 md:grid-cols-2">
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
                  <ChampBoard
                    id="euChefTelephone"
                    name="euChefTelephone"
                    type="tel"
                    label="Téléphone (facultatif)"
                    maxLength={30}
                    defaultValue={valeur(plan?.euChefTelephone)}
                    erreur={err("euChefTelephone")}
                  />
                </div>
              </div>
            </section>

            <section id="pp-travaux" className={CARTE} aria-labelledby="pp-travaux-titre">
              <EnTeteCarte id="pp-travaux-titre" titre="Travaux" />
              <div>
                <label className="label-board" htmlFor="naturesTravaux">
                  Ce qui sera fait *
                </label>
                <textarea
                  id="naturesTravaux"
                  name="naturesTravaux"
                  required
                  defaultValue={valeur(plan?.naturesTravaux)}
                  rows={2}
                  maxLength={4000}
                  className={`${TEXTAREA} min-h-[64px]`}
                  aria-invalid={Boolean(err("naturesTravaux"))}
                  aria-describedby={err("naturesTravaux") ? "naturesTravaux-erreur" : undefined}
                  placeholder="Ex : dégraissage de la hotte ; remplacement de la membrane d'étanchéité de la toiture terrasse, avec pose ponctuelle de chalumeau."
                />
                {err("naturesTravaux") && (
                  <p id="naturesTravaux-erreur" className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]">
                    {err("naturesTravaux")}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 md:grid-cols-2">
                <ChampBoard
                  id="lieux"
                  name="lieux"
                  label="Où"
                  defaultValue={valeur(plan?.lieux)}
                  requis
                  maxLength={1000}
                  placeholder="Ex : cuisine, toiture, local technique"
                  erreur={err("lieux")}
                />
                <ChampBoard
                  id="dureeHeuresEstimee"
                  name="dureeHeuresEstimee"
                  label="Durée totale estimée, en heures"
                  defaultValue={valeur(plan?.dureeHeuresEstimee)}
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  // Le total compte les sous-traitants, et les heures revues en
                  // cours de chantier se notent sur la fiche (`seuil400EnCours`).
                  aide={AIDE_DUREE_HEURES}
                  erreur={err("dureeHeuresEstimee")}
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value, 10);
                    setDureeHeures(Number.isNaN(n) ? null : n);
                  }}
                />
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
                <ChampBoard
                  id="horaires"
                  name="horaires"
                  label="Horaires de travail (facultatif)"
                  maxLength={200}
                  placeholder="Ex : 8 h – 17 h, hors week-end"
                  defaultValue={valeur(plan?.horaires)}
                  erreur={err("horaires")}
                />
              </div>
              {!scelle && (
                <ChampBatiment
                  charte="board"
                  batiments={batiments}
                  defaultValue={plan?.batimentId}
                  erreur={err("batimentId")}
                  aide="La zone principale de l'opération ; détaillez les lieux ci-dessus si elle en traverse plusieurs."
                />
              )}

              <label className="flex cursor-pointer items-start gap-3 rounded-[18px] bg-[color:var(--board-canvas)] px-4 py-3.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--board-blue-strong)]">
                <input
                  type="checkbox"
                  name="travauxDangereux"
                  checked={travauxDangereux}
                  onChange={(e) => setTravauxDangereux(e.target.checked)}
                  className="mt-0.5 size-[18px] flex-none accent-[color:var(--board-ink)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold leading-[1.4] text-[color:var(--board-ink)]">
                    Travaux dangereux
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-[1.5] text-[color:var(--board-slate-ink)]">
                    Les travaux figurent sur la liste des travaux dangereux de l&apos;arrêté du 19 mars 1993 ou,
                    pour les travaux agricoles, de l&apos;arrêté du ministre chargé de l&apos;agriculture
                  </span>
                  {/* Les exemples sont des points de la liste, entre
                      guillemets (C40, suite) — jamais paraphrasés. */}
                  <span className="mt-1 block text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                    Parmi les vingt et un points de la liste : « Travaux de démolition », « Travaux exposant au
                    contact avec des pièces nues sous tension supérieure à la T. B. T. », « Travaux dans ou sur des
                    cuves et accumulateurs de matière ou en atmosphère confinée », « Travaux de soudage
                    oxyacétylénique exigeant le recours à un permis de feu »…
                  </span>
                </span>
              </label>
            </section>

            {/* Le moment de R. 4512-2 — « avant l'exécution », pas celui de
                R. 4512-6 (C40). L'article sous le livre. */}
            <section id="pp-inspection" className={CARTE} aria-labelledby="pp-inspection-titre">
              <EnTeteCarte id="pp-inspection-titre" titre="Inspection commune" note="Avant le début des travaux" />
              <p className={CHAPEAU}>{EN_CLAIR_R4512_2}</p>
              <LegalBadge reference="Art. R. 4512-2 CT" href={URL_R4512_2} extrait={R4512_2} />
              <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <ChampBoard
                  id="inspectionDate"
                  name="inspectionDate"
                  type="date"
                  label="Date"
                  defaultValue={valeur(plan?.inspectionDate)}
                  erreur={err("inspectionDate")}
                />
                <div>
                  <label className="label-board" htmlFor="inspectionParticipants">
                    Participants
                  </label>
                  <textarea
                    id="inspectionParticipants"
                    name="inspectionParticipants"
                    defaultValue={valeur(plan?.inspectionParticipants)}
                    rows={1}
                    maxLength={2000}
                    className={`${TEXTAREA} min-h-[48px]`}
                    placeholder="Ex : vous, le chef d'équipe de l'entreprise extérieure"
                  />
                </div>
                {/* Trois réponses : « non renseigné » reste distinct de
                    « non » (repris de RiskBoard, 2026-11-21). */}
                <div>
                  <label className="label-board" htmlFor="cseAssocie">
                    {LIBELLES_COMPLEMENTS.cseAssocie}
                  </label>
                  <select
                    id="cseAssocie"
                    name="cseAssocie"
                    defaultValue={plan?.cseAssocie == null ? "" : plan.cseAssocie ? "oui" : "non"}
                    className="champ-board"
                  >
                    <option value="">Non renseigné</option>
                    <option value="oui">Oui</option>
                    <option value="non">Non</option>
                  </select>
                </div>
              </div>
            </section>

            {/* R. 4463-8 : « le cas échéant » laisse l'appréciation aux
                employeurs, et la phrase en clair le garde. */}
            <section id="pp-risques" className={CARTE} aria-labelledby="pp-risques-titre">
              <EnTeteCarte
                id="pp-risques-titre"
                titre="Risques et mesures"
                note="Ce que la présence des deux entreprises fait courir"
              />
              <p className={CHAPEAU}>
                Pour chaque risque identifié lors de l&apos;inspection, indiquez la mesure prise par chaque partie.{" "}
                {EN_CLAIR_R4463_8}
              </p>
              <LegalBadge reference="Art. R. 4463-8 CT" href={URL_R4463_8} extrait={R4463_8} />
              {/* LES FAMILLES DE RISQUE DE RISKBOARD (2026-11-21) : cocher en
                  ajoute la ligne, risque prérempli ; décocher la retire. Les
                  lignes libres restent possibles, plus bas. */}
              <fieldset className="m-0 flex flex-wrap items-center gap-2 border-0 p-0">
                <legend className="mb-2 text-[13px] text-[color:var(--board-slate-mid)]">
                  Cochez les familles de risque présentes :
                </legend>
                {FAMILLES_RISQUE.map((f) => {
                  const cochee = lignes.some((l) => l.famille === f.code);
                  return (
                    <button
                      key={f.code}
                      type="button"
                      aria-pressed={cochee}
                      onClick={() => cocherFamille(f.code)}
                      className={`${PILULE} ${cochee ? PILULE_RETENUE : PILULE_REPOS}`}
                    >
                      {cochee && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                      {f.libelle}
                    </button>
                  );
                })}
              </fieldset>
              <div
                aria-hidden
                className="hidden gap-2.5 px-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--board-slate-soft)] md:grid md:grid-cols-[34px_minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_72px]"
              >
                <span />
                <span>Risque</span>
                <span>Votre mesure</span>
                <span>Sa mesure</span>
                <span />
              </div>
              {lignes.map((l, i) => (
                <div
                  key={l.cle}
                  className="grid grid-cols-1 gap-2.5 border-t border-[color:var(--board-slate-pale)] pt-3.5 first-of-type:border-t-0 md:grid-cols-[34px_minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_72px] md:items-start md:border-t-0 md:pt-0"
                >
                  <span
                    aria-hidden
                    className="flex size-[34px] items-center justify-center rounded-[10px] bg-[color:var(--board-ink)] font-display font-bold text-white md:mt-1.5"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <input type="hidden" name={`lignes[${i}].famille`} value={l.famille} />
                    {l.famille && (
                      <p className="m-0 mb-1 font-mono text-[10.5px] tracking-[0.08em] text-[color:var(--board-slate-soft)]">
                        {libelleFamille(l.famille)}
                      </p>
                    )}
                    <label className="label-board md:sr-only" htmlFor={`risque-${l.cle}`}>
                      Risque {i + 1} *
                    </label>
                    <input
                      id={`risque-${l.cle}`}
                      name={`lignes[${i}].risque`}
                      required
                      value={l.risque}
                      onChange={(e) => majLigne(l.cle, "risque", e.target.value)}
                      maxLength={500}
                      className="champ-board"
                      placeholder="Ex : graisses chaudes pendant le service"
                    />
                  </div>
                  <div>
                    <label className="label-board md:sr-only" htmlFor={`mesureEU-${l.cle}`}>
                      Votre mesure, risque {i + 1}
                    </label>
                    <textarea
                      id={`mesureEU-${l.cle}`}
                      name={`lignes[${i}].mesureEntrepriseUtilisatrice`}
                      value={l.mesureEntrepriseUtilisatrice}
                      onChange={(e) => majLigne(l.cle, "mesureEntrepriseUtilisatrice", e.target.value)}
                      rows={1}
                      maxLength={500}
                      className={`${TEXTAREA} min-h-[48px]`}
                      placeholder="Ex : intervention hors service"
                    />
                  </div>
                  <div>
                    <label className="label-board md:sr-only" htmlFor={`mesureEE-${l.cle}`}>
                      Sa mesure, risque {i + 1}
                    </label>
                    <textarea
                      id={`mesureEE-${l.cle}`}
                      name={`lignes[${i}].mesureEntrepriseExterieure`}
                      value={l.mesureEntrepriseExterieure}
                      onChange={(e) => majLigne(l.cle, "mesureEntrepriseExterieure", e.target.value)}
                      rows={1}
                      maxLength={500}
                      className={`${TEXTAREA} min-h-[48px]`}
                      placeholder="Ex : gants, lunettes"
                    />
                  </div>
                  <div className="flex md:justify-end">
                    {lignes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => retirerLigne(l.cle)}
                        className="min-h-11 text-[12.5px] font-semibold text-[color:var(--board-slate-mid)] transition-colors hover:text-[color:var(--board-signal-ink)]"
                      >
                        Retirer
                        <span className="sr-only"> le risque {i + 1}</span>
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:col-span-3 md:col-start-2">
                    <ChampBoard
                      id={`lieu-${l.cle}`}
                      name={`lignes[${i}].lieu`}
                      label={`Lieu du risque ${i + 1}`}
                      value={l.lieu}
                      onChange={(e) => majLigne(l.cle, "lieu", e.target.value)}
                      maxLength={200}
                      placeholder="Ex : toiture"
                    />
                    <ChampBoard
                      id={`frequence-${l.cle}`}
                      name={`lignes[${i}].frequence`}
                      label={`Fréquence du risque ${i + 1}`}
                      value={l.frequence}
                      onChange={(e) => majLigne(l.cle, "frequence", e.target.value)}
                      maxLength={200}
                      placeholder="Ex : chaque matin, pendant 1 h"
                    />
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={ajouterLigne}
                  className="inline-flex min-h-11 items-center rounded-full border border-dashed border-[color:var(--board-slate)] bg-[color:var(--board-card)] px-[18px] text-[14px] text-[color:var(--board-ink)] hover:bg-[color:var(--board-slate-pale)]"
                >
                  + Ajouter un risque
                </button>
                {err("lignes") && (
                  <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">{err("lignes")}</p>
                )}
              </div>
            </section>

            {/* LES CINQ RUBRIQUES DE R. 4512-8, repliables. Aucune n'est
                requise à la saisie : ce qui est vide se lit vide, sur la fiche
                comme dans le dossier de contrôle. */}
            <section id="pp-contenu" className={`${CARTE} gap-1.5`} aria-labelledby="pp-contenu-titre">
              <EnTeteCarte id="pp-contenu-titre" titre="Contenu minimal" note="Vous pouvez y revenir après l'inspection" />
              <p className={CHAPEAU}>
                Les rubriques que le plan contient au moins. Ce que vous laissez vide est signalé comme manquant sur la
                fiche du plan et dans le dossier de contrôle — rien ne vous empêche d&apos;enregistrer.
              </p>
              <LegalBadge reference="Art. R. 4512-8 CT" href={URL_R4512_8}>
                {TEXTE_R4512_8}
              </LegalBadge>

              <details
                open={rubriquesOuvertes.has(1)}
                className="group border-t border-[color:var(--board-slate-pale)] py-3.5"
              >
                <Rubrique numero={1} titre={RUBRIQUES_R4512_8[0].titre} remplie={RUBRIQUES_R4512_8[0].renseignee(contenu)} />
                <div className="mt-3 flex flex-col gap-4">
                  <p className="m-0 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                    Les phases dangereuses de l&apos;opération elle-même, et les moyens de prévention de chacune. À
                    distinguer des risques d&apos;interférence ci-dessus, qui naissent de la co-activité.
                  </p>
                  {phases.map((f, i) => (
                    <div
                      key={f.cle}
                      className="flex flex-col gap-3 border-t border-[color:var(--board-slate-pale)] pt-3 first-of-type:border-t-0"
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
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                            onChange={(e) => majPhase(f.cle, "moyensPrevention", e.target.value)}
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
                    <button type="button" onClick={ajouterPhase} className={buttonVariants({ variant: "boardClair", size: "boardSm" })}>
                      Ajouter une phase
                    </button>
                    {/* `extrairePhases` remonte au schéma tout rang dont un
                        champ porte quelque chose : son erreur s'affiche ici. */}
                    {err("phases") && (
                      <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">{err("phases")}</p>
                    )}
                  </div>
                </div>
              </details>

              {RUBRIQUES_TEXTE.map((r) => {
                const rubrique = RUBRIQUES_R4512_8.find((x) => x.numero === r.numero)!;
                return (
                  <details
                    key={r.name}
                    open={rubriquesOuvertes.has(r.numero) || Boolean(err(r.name))}
                    className="group border-t border-[color:var(--board-slate-pale)] py-3.5"
                  >
                    <Rubrique numero={r.numero} titre={rubrique.titre} remplie={rubrique.renseignee(contenu)} />
                    <ZoneTexte
                      className="mt-3"
                      name={r.name}
                      label={`${r.numero}° — ${rubrique.titre}`}
                      labelMasque
                      defaultValue={valeur(plan?.[r.name])}
                      rows={r.rows}
                      hauteur="min-h-[88px]"
                      placeholder={r.placeholder}
                      erreur={err(r.name)}
                    />
                  </details>
                );
              })}

              {/* DEUX PIÈCES QUE D'AUTRES ARTICLES FONT FIGURER DANS LE PLAN, et
                  pour lesquelles ce formulaire n'a pas de champ. En clair et le
                  constat ; l'article sous son livre. Écrits un par un : la garde
                  des extraits lit la `reference` littérale. */}
              <ArticleEnClair
                className="border-t border-[color:var(--board-slate-pale)] pt-4"
                titre="Liste des postes en suivi individuel renforcé"
                texte={EN_CLAIR_R4512_9}
                constat={CONSTAT_R4512_9}
              >
                <LegalBadge className="mt-2" reference="Art. R. 4512-9 CT" href={URL_R4512_9} extrait={R4512_9} />
              </ArticleEnClair>
              <ArticleEnClair
                className="border-t border-[color:var(--board-slate-pale)] pt-4"
                titre="Dossiers techniques amiante"
                texte={EN_CLAIR_R4512_11}
                constat={CONSTAT_R4512_11}
              >
                <LegalBadge className="mt-2" reference="Art. R. 4512-11 CT" href={URL_R4512_11} extrait={R4512_11} />
              </ArticleEnClair>
            </section>

            {/* Repris de RiskBoard (2026-11-21) : facultatifs, hors du
                minimum de R. 4512-8 — rien n'est signalé s'ils restent vides. */}
            <section id="pp-complements" className={CARTE} aria-labelledby="pp-complements-titre">
              <EnTeteCarte id="pp-complements-titre" titre="Compléments" note="Facultatif" />
              {COMPLEMENTS_TEXTE.map((c) => (
                <ZoneTexte
                  key={c.name}
                  name={c.name}
                  label={LIBELLES_COMPLEMENTS[c.name]}
                  defaultValue={valeur(plan?.[c.name])}
                  rows={2}
                  hauteur="min-h-[72px]"
                  placeholder={c.placeholder}
                  erreur={err(c.name)}
                />
              ))}
            </section>
          </fieldset>
        </div>
      </div>

      {/* LA BARRE DU BAS, collée en bas de l'écran le temps du formulaire,
          au-dessus de la navigation du téléphone. */}
      <div className="sticky bottom-[var(--reserve-nav-bas)] z-10 -mx-[var(--board-gutter)] border-t border-[color:var(--board-slate-line)] bg-white/95 px-[var(--board-gutter)] py-3.5 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            {state.status === "error" && !state.fieldErrors ? (
              <p role="alert" className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
                {state.message}
              </p>
            ) : state.status === "error" ? (
              <p role="alert" className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
                Des champs sont à revoir : ils sont signalés plus haut.
              </p>
            ) : (
              <p className="m-0 text-[13px] text-[color:var(--board-slate-soft)]">
                Rien ne part à l&apos;entreprise extérieure tant que vous ne demandez pas sa signature.
              </p>
            )}
          </div>
          <div className="flex gap-2.5">
            <Link
              href={retourHref ?? `/etablissements/${etablissementId}/plan-prevention${plan ? `/${plan.id}` : ""}`}
              className="inline-flex min-h-11 items-center px-4 text-[14px] text-[color:var(--board-slate-mid)] hover:text-[color:var(--board-ink)]"
            >
              Annuler
            </Link>
            <Button
              variant="board"
              size="board"
              type="submit"
              disabled={pending}
              className="min-h-12 rounded-full px-7 font-display text-[16px] font-semibold normal-case tracking-normal"
            >
              {plan
                ? pending
                  ? "Enregistrement…"
                  : "Enregistrer les modifications"
                : pending
                  ? "Création…"
                  : "Créer le plan"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

const CARTE = "carte-board flex scroll-mt-6 flex-col gap-4 px-6 py-6 md:px-8 md:py-7";
const CHAPEAU = "m-0 max-w-[var(--board-mesure)] text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)]";

function EnTeteCarte({ id, titre, note }: { id: string; titre: string; note?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <h2 id={id} className="board-titre m-0 text-[24px] md:text-[26px]">
        {titre}
      </h2>
      {note && <span className="text-[13px] text-[color:var(--board-slate-soft)]">{note}</span>}
    </div>
  );
}

/** Un bloc de texte du plan (rubrique de R. 4512-8 ou complément), avec son erreur. */
function ZoneTexte({
  name,
  label,
  labelMasque = false,
  defaultValue,
  rows,
  hauteur,
  placeholder,
  erreur,
  className,
}: {
  name: string;
  label: string;
  /** Le titre est déjà dit au-dessus (rubrique repliable) : libellé pour lecteur d'écran seul. */
  labelMasque?: boolean;
  defaultValue: string;
  rows: number;
  hauteur: string;
  placeholder: string;
  erreur?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={labelMasque ? "sr-only" : "label-board"} htmlFor={name}>
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        maxLength={4000}
        className={`${TEXTAREA} ${hauteur}`}
        placeholder={placeholder}
        aria-invalid={Boolean(erreur)}
        aria-describedby={erreur ? `${name}-erreur` : undefined}
      />
      {erreur && (
        <p id={`${name}-erreur`} className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {erreur}
        </p>
      )}
    </div>
  );
}

function Rubrique({ numero, titre, remplie }: { numero: number; titre: string; remplie: boolean }) {
  return (
    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-medium text-[color:var(--board-ink)] [&::-webkit-details-marker]:hidden">
      <span>
        {numero}° — {titre}
      </span>
      <span className="flex flex-none items-center gap-2.5">
        <span
          className={`pastille-board text-[12px] ${
            remplie
              ? "bg-[color:var(--board-green)] text-[color:var(--board-green-ink)]"
              : "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)]"
          }`}
        >
          {remplie ? "Renseignée" : "Non renseignée"}
        </span>
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
      </span>
    </summary>
  );
}
