"use client";

import { useActionState, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit";
import { MarqueCategorie } from "@/components/equipements/MarqueCategorie";
import {
  CATEGORIES_AERATION,
  CATEGORIES_EQUIPEMENT,
  CATEGORIES_TRI_ETAT,
  VALEURS_TRI_ETAT,
  valeurTriEtat,
  type ChampTriEtat,
} from "@/lib/equipements/schema";
import {
  DESCRIPTION_CATEGORIE,
  LABEL_CATEGORIE_EQUIPEMENT,
} from "@/lib/equipements/labels";
import {
  FAMILLES_ESP,
  LABEL_FAMILLE_ESP,
  verdictSuiviEnService,
  type FamilleEsp,
} from "@/lib/equipements/esp";
import type { CategorieEquipement } from "@/lib/referentiels/types-communs";
import type { EquipementActionState } from "@/lib/equipements/actions";

/** La case à cocher du board : encre pleine cochée, filet d'ardoise. */
const CASE_A_COCHER =
  "mt-0.5 size-4 flex-none rounded border-[color:var(--board-slate)] accent-[color:var(--board-ink)]";

/** Le message de validation, à l'encre du signal. */
function Erreur({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]">
      {message}
    </p>
  );
}

/** La phrase d'aide d'un champ : en clair sous le champ, jamais en infobulle
 *  — une infobulle n'existe pas au doigt. */
function Aide({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p
      id={id}
      className="m-0 mt-1.5 max-w-[66ch] text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]"
    >
      {children}
    </p>
  );
}

type Valeurs = {
  libelle?: string;
  categorie?: CategorieEquipement;
  batimentId?: string;
  localisation?: string | null;
  dateMiseEnService?: Date | null;
  datePeremption?: Date | null;
  nombre?: number | null;
  familleEsp?: string | null;
  pressionMaxAdmissibleBar?: number | null;
  volumeLitres?: number | null;
  aGroupeElectrogene?: boolean;
  estLocalPollutionSpecifique?: boolean;
  aSystemeDeRecyclage?: boolean;
  nbVehiculesParkingCouvert?: number | null;
  notes?: string | null;
} & Partial<Record<ChampTriEtat, boolean | null>>;

/**
 * Libellés des sept questions à trois états.
 *
 * Elles bornent des obligations réelles : y répondre « non » retire une
 * échéance du calendrier. Deux exigences de rédaction, donc — être
 * compréhensible sans connaître le règlement (on décrit l'objet physique, pas
 * l'article), et dire ce que la réponse déclenche, pour que le dirigeant
 * comprenne l'enjeu de la question plutôt que de cliquer au hasard.
 *
 * « Je ne sais pas encore » est une réponse légitime et le défaut : tant
 * qu'elle est retenue, l'obligation reste affichée. On ne fait jamais
 * disparaître une vérification faute de réponse.
 */
const QUESTIONS_TRI_ETAT: Record<
  ChampTriEtat,
  { question: string; aide: string }
> = {
  estVmcGaz: {
    question: "Cette VMC est-elle raccordée à des appareils à gaz ?",
    aide: "On parle de « VMC-Gaz » : la ventilation évacue aussi les produits de combustion de chaudières ou de chauffe-eau au gaz. Si oui, entretien et vérification annuels par un professionnel sous contrat écrit (arrêté du 25 avril 1985).",
  },
  aExtinctionAutomatique: {
    question:
      "Un système d'extinction automatique est-il installé sur les appareils de cuisson ?",
    aide: "Dispositif fixé au-dessus des friteuses ou des plaques, qui projette un agent extincteur en cas de départ de feu. Si oui, vérification annuelle des cartouches, capteurs et circuits de déclenchement.",
  },
  sertAuLevageDePersonnes: {
    question: "Cet appareil sert-il à lever des personnes ?",
    aide: "Nacelle, plate-forme élévatrice, ou tout appareil utilisé même occasionnellement pour élever quelqu'un. Si oui, la vérification générale passe de annuelle à semestrielle. Un transpalette ou un monte-charge de marchandises : répondez « non ».",
  },
  estMuParForceHumaine: {
    question:
      "Cet appareil est-il mû par la force humaine employée directement ?",
    aide: "Un treuil à manivelle, un palan à chaîne actionné à la main, une nacelle poussée et montée à la force du bras — par opposition à un appareil motorisé, électrique, hydraulique ou thermique. Si oui ET qu'il sert à élever un poste de travail, la vérification a lieu tous les trois mois et non tous les six.",
  },
  estChariotOuGerbeur: {
    question:
      "Cet appareil est-il un chariot élévateur, un gerbeur ou un hayon élévateur ?",
    aide: "Un engin qui soulève une charge en hauteur, au-delà de ce qu'il faut pour la décoller du sol. Si oui, la vérification générale a lieu tous les six mois et non tous les ans. Un transpalette qui ne fait que décoller la palette pour la rouler : répondez « non », il n'est pas concerné par ces vérifications.",
  },
  aAccessoiresDeLevage: {
    question: "Utilisez-vous des accessoires de levage avec cet appareil ?",
    aide: "Élingues, chaînes, câbles, crochets, anneaux, manilles, palonniers. Si oui, ces accessoires font l'objet d'une vérification annuelle distincte de celle de l'appareil.",
  },
  estSoumisSuiviEnService: {
    question:
      "Cet équipement est-il suivi en service au titre de l'arrêté du 20 novembre 2017 ?",
    aide: "Les récipients sous pression ne sont concernés qu'au-delà de seuils de pression et de volume. Votre notice, votre plaque signalétique ou votre installateur l'indiquent. En cas de doute, laissez « Je ne sais pas encore » : les échéances restent affichées.",
  },
  estChargeSousSeuilControle: {
    question:
      "La charge en fluide frigorigène est-elle inférieure au seuil de contrôle ?",
    aide: "Le contrôle d'étanchéité ne s'impose qu'au-delà de 5 tonnes équivalent CO2 — quelques kilogrammes seulement selon le fluide —, ou de 1 kg pour les fluides insaturés (R-1234yf, R-454C…). Beaucoup de petits meubles froids récents fonctionnent au R-290 (propane), qui n'entre pas dans le champ. Le fluide et la charge figurent sur la plaque signalétique ; votre frigoriste fait la conversion. Répondez « oui » seulement si vous en êtes sûr : le contrôle disparaît alors du calendrier. En cas de doute, laissez « Je ne sais pas encore ».",
  },
  estHermetiquementScelleSousSeuil: {
    question:
      "Cet appareil est-il hermétiquement scellé et étiqueté comme tel ?",
    aide: "Un appareil hermétiquement scellé a son circuit frigorifique fermé en usine, sans raccord démontable, et porte cette mention sur sa plaque. Le règlement le dispense de contrôle d'étanchéité s'il contient en outre moins de 10 tonnes équivalent CO2 de fluide (ou moins de 2 kg pour un fluide insaturé, type R-1234yf ou R-454C). Répondez « oui » seulement si les deux sont vrais : scellé et étiqueté, et sous ce seuil. Sinon, laissez « Je ne sais pas encore » : les contrôles restent affichés.",
  },
  estChargeSuperieure50TCo2: {
    question:
      "La charge en fluide frigorigène dépasse-t-elle 50 tonnes équivalent CO2 ?",
    aide: "Le chiffre ne se lit pas sur la porte : il figure sur le dernier rapport de contrôle d'étanchéité ou sur la fiche d'intervention de votre frigoriste, qui le calcule à partir du fluide et de la charge en kilogrammes. Pour un fluide insaturé (R-1234ze, R-454C…), le règlement raisonne en kilogrammes et le palier est de 10 kg. Si oui, le contrôle passe de douze à six mois. En cas de doute, laissez « Je ne sais pas encore » : le contrôle annuel reste affiché.",
  },
  estChargeSuperieure500TCo2: {
    question:
      "La charge en fluide frigorigène dépasse-t-elle 500 tonnes équivalent CO2 ?",
    aide: "Même source que la question précédente, palier supérieur — 100 kg pour un fluide insaturé. Il correspond à plusieurs centaines de kilogrammes de fluide, soit une centrale de production de froid, pas un groupe de chambre froide. Si oui, le contrôle passe à trois mois. En cas de doute, laissez « Je ne sais pas encore ».",
  },
  aDetectionDeFuites: {
    question:
      "Un système fixe de détection des fuites est-il installé sur cette installation ?",
    aide: "Un détecteur permanent, relié à une alarme, qui signale une fuite de fluide frigorigène sans intervention humaine — à ne pas confondre avec le contrôle d'étanchéité lui-même, ni avec une sonde de température. S'il y en a un, le règlement double l'intervalle entre deux contrôles. En cas de doute, laissez « Je ne sais pas encore » : c'est l'intervalle le plus court qui reste affiché.",
  },
};

type Props = {
  action: (
    prev: EquipementActionState,
    formData: FormData,
  ) => Promise<EquipementActionState>;
  valeursInitiales?: Valeurs;
  /** Les zones de l'établissement. Le champ n'est rendu qu'à partir de
   *  deux : sous une seule zone, l'action rattache à la seule existante
   *  (ADR-029). */
  batiments?: { id: string; nom: string }[];
  libelleSubmit: string;
  labelAnnuler?: { libelle: string; href: string };
};

function toIsoDate(d: Date | null | undefined): string {
  if (!d) return "";
  // yyyy-mm-dd (locale UTC neutralisée)
  return d.toISOString().slice(0, 10);
}

export function EquipementForm({
  action,
  valeursInitiales,
  batiments = [],
  libelleSubmit,
  labelAnnuler,
}: Props) {
  const multiBatiments = batiments.length > 1;
  const [state, formAction, pending] = useActionState<
    EquipementActionState,
    FormData
  >(action, { status: "idle" });

  const [categorie, setCategorie] = useState<CategorieEquipement>(
    valeursInitiales?.categorie ?? "INSTALLATION_ELECTRIQUE",
  );

  const err = (champ: string) =>
    state.status === "error" ? state.fieldErrors?.[champ]?.[0] : undefined;

  const estElec = categorie === "INSTALLATION_ELECTRIQUE";
  const estAeration = CATEGORIES_AERATION.includes(categorie);
  const estVmc = categorie === "VMC";
  const estEsp = categorie === "EQUIPEMENT_SOUS_PRESSION";

  // Questions à trois états applicables à la catégorie sélectionnée.
  const questions = CATEGORIES_TRI_ETAT.filter((r) =>
    r.categories.includes(categorie),
  );
  const afficherCaracteristiques =
    estElec || estAeration || estEsp || questions.length > 0;

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {/* Catégorie + libellé */}
      <section className="flex flex-col gap-5">
        <div>
          <label className="label-board" htmlFor="categorie">
            Catégorie *
          </label>
          <div className="flex items-center gap-3">
            <MarqueCategorie categorie={categorie} taille={44} />
            <select
              id="categorie"
              name="categorie"
              value={categorie}
              onChange={(e) =>
                setCategorie(e.currentTarget.value as CategorieEquipement)
              }
              required
              className="champ-board"
              aria-invalid={Boolean(err("categorie"))}
            >
              {CATEGORIES_EQUIPEMENT.map((c) => (
                <option key={c} value={c}>
                  {LABEL_CATEGORIE_EQUIPEMENT[c]}
                </option>
              ))}
            </select>
          </div>
          {DESCRIPTION_CATEGORIE[categorie] && (
            <Aide>{DESCRIPTION_CATEGORIE[categorie]}</Aide>
          )}
          <Erreur message={err("categorie")} />
        </div>

        <ChampBoard
          id="libelle"
          name="libelle"
          label="Libellé"
          requis
          defaultValue={valeursInitiales?.libelle}
          placeholder="Ex : TGBT principal, Hotte de la cuisine chaude"
          erreur={err("libelle")}
        />

        {multiBatiments && (
          <div>
            <label className="label-board" htmlFor="batimentId">
              Zone *
            </label>
            <select
              id="batimentId"
              name="batimentId"
              defaultValue={valeursInitiales?.batimentId ?? batiments[0]?.id}
              required
              className="champ-board"
              aria-invalid={Boolean(err("batimentId"))}
            >
              {batiments.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nom}
                </option>
              ))}
            </select>
            <Erreur message={err("batimentId")} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ChampBoard
            id="localisation"
            name="localisation"
            label={multiBatiments ? "Précision du lieu" : "Localisation"}
            defaultValue={valeursInitiales?.localisation ?? ""}
            placeholder="Ex : local technique RDC"
            aide="Facultatif. Ex : « sous-sol », « cuisine », « local technique RDC ». Utile au technicien lors de la vérification."
            erreur={err("localisation")}
          />

          <ChampBoard
            id="dateMiseEnService"
            name="dateMiseEnService"
            label="Date de mise en service"
            type="date"
            defaultValue={toIsoDate(valeursInitiales?.dateMiseEnService)}
            aide="Facultatif. Si vous ne la connaissez pas, laissez vide — l'outil se calera sur la première vérification à venir."
            erreur={err("dateMiseEnService")}
          />

          {/* La péremption n'est pas une échéance : c'est une caractéristique
              de l'objet, que le fabricant fixe. L'outil ne la surveille pas —
              il la garde pour que le vérificateur la constate, ce que le 3° de
              l'article 2 de l'arrêté du 19 mars 1993 lui demande de faire. Le
              dire dans l'aide évite qu'un dirigeant croie être averti. */}
          <ChampBoard
            id="datePeremption"
            name="datePeremption"
            label="Date de péremption"
            type="date"
            defaultValue={toIsoDate(valeursInitiales?.datePeremption)}
            aide="Facultatif. La fin de vie indiquée par le fabricant, quand il en fixe une — un harnais antichute a souvent dix ans. Rojer ne vous enverra pas d'échéance à cette date, mais la fiche de l'équipement affichera « Périmé depuis » dès qu'elle sera passée."
            erreur={err("datePeremption")}
          />
        </div>

        <ChampBoard
          className="sm:w-64"
          id="nombre"
          name="nombre"
          label="Nombre d'unités"
          // La molette d'un champ nombre modifie une valeur déjà saisie sans
          // rien signaler ; la borne reste au serveur.
          type="text"
          inputMode="numeric"
          defaultValue={valeursInitiales?.nombre ?? ""}
          aide="Facultatif. Ex : 12 extincteurs, 3 BAES. À renseigner si vous en avez plusieurs du même type."
          erreur={err("nombre")}
        />
      </section>

      {/* Caractéristiques spécifiques — dépliage conditionnel */}
      {afficherCaracteristiques && (
        /* Le filet suffit à détacher la section : une carte à rayon 30 dans
           la carte du formulaire poserait un second rayon 30 au milieu du
           premier. */
        <section className="flex flex-col gap-4 border-t border-[color:var(--board-slate-line)] pt-7">
          <header>
            <h2 className="board-titre m-0 text-[17px]">
              Caractéristiques spécifiques
            </h2>
            <p className="m-0 mt-1.5 max-w-[64ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
              Ces informations conditionnent la génération des vérifications
              réglementaires applicables (étape suivante).
            </p>
          </header>

          <div className="flex flex-col gap-5">
            {estElec && (
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  name="aGroupeElectrogene"
                  defaultChecked={valeursInitiales?.aGroupeElectrogene ?? false}
                  className={CASE_A_COCHER}
                />
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[14px] font-semibold leading-[1.35] text-[color:var(--board-ink)]">
                    Groupe électrogène de sécurité présent
                  </p>
                  <p className="m-0 mt-1 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                    Déclenche la vérification annuelle prévue par l&apos;art. EL
                    20 du règlement ERP.
                  </p>
                </div>
              </label>
            )}

            {estAeration && (
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  name="estLocalPollutionSpecifique"
                  defaultChecked={
                    valeursInitiales?.estLocalPollutionSpecifique ?? false
                  }
                  className={CASE_A_COCHER}
                />
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[14px] font-semibold leading-[1.35] text-[color:var(--board-ink)]">
                    Local à pollution spécifique
                  </p>
                  <p className="m-0 mt-1 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                    Poussières, gaz, vapeurs, aérosols. Contrôle annuel du débit
                    d&apos;air extrait, des pressions et de l&apos;état de
                    l&apos;installation (arrêté du 8 octobre 1987, art. 4 § 2
                    a). Un contrôle semestriel s&apos;y ajoute lorsqu&apos;il
                    existe un système de recyclage (art. 4 § 2 b).
                  </p>
                </div>
              </label>
            )}

            {estAeration && (
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  name="aSystemeDeRecyclage"
                  defaultChecked={valeursInitiales?.aSystemeDeRecyclage ?? false}
                  className={CASE_A_COCHER}
                />
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[14px] font-semibold leading-[1.35] text-[color:var(--board-ink)]">
                    L&apos;installation recycle l&apos;air
                  </p>
                  <p className="m-0 mt-1 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                    Une partie de l&apos;air extrait est réintroduite dans le
                    local. S&apos;ajoute alors au contrôle annuel un contrôle
                    tous les six mois de la concentration en poussières dans les
                    gaines de recyclage et des systèmes de surveillance
                    (arrêté du 8 octobre 1987, art. 4 b).
                  </p>
                </div>
              </label>
            )}

            {estVmc && (
              /* La règle et son article se lisent sous le champ : une
                 infobulle n'existe pas au doigt. */
              <ChampBoard
                className="sm:w-64"
                id="nbVehiculesParkingCouvert"
                name="nbVehiculesParkingCouvert"
                label="Capacité parking couvert (véhicules)"
                type="text"
                inputMode="numeric"
                defaultValue={valeursInitiales?.nbVehiculesParkingCouvert ?? ""}
                aide="Art. PS 32 du règlement ERP — à renseigner uniquement si la VMC ventile un parc de stationnement couvert d'un ERP. Au-dessus de 250 véhicules, contrôle annuel ; sinon biennal."
                erreur={err("nbVehiculesParkingCouvert")}
              />
            )}

            {estEsp && (
              <ChampsEsp
                initiales={{
                  familleEsp: valeursInitiales?.familleEsp as
                    FamilleEsp | undefined,
                  pressionMaxAdmissibleBar:
                    valeursInitiales?.pressionMaxAdmissibleBar as
                      number | undefined,
                  volumeLitres: valeursInitiales?.volumeLitres as
                    number | undefined,
                }}
                err={err}
              />
            )}

            {questions.map(({ champ }) => (
              <QuestionTriEtat
                key={champ}
                champ={champ}
                defaut={valeurTriEtat(valeursInitiales?.[champ])}
                erreur={err(champ)}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <label className="label-board" htmlFor="notes">
          Notes internes
        </label>
        <textarea
          id="notes"
          name="notes"
          defaultValue={valeursInitiales?.notes ?? ""}
          rows={3}
          className="champ-board"
          placeholder="Marque, modèle, références techniques, contact maintenance…"
        />
      </section>

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

      <div className="flex items-center gap-3">
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

/**
 * Question à trois états. Un `<select>` plutôt qu'une case à cocher : une case
 * décochée ne dit pas si l'utilisateur a répondu « non » ou n'a simplement pas
 * répondu, et cette nuance décide ici du maintien d'une obligation
 * réglementaire de criticité élevée.
 */
function QuestionTriEtat({
  champ,
  defaut,
  erreur,
}: {
  champ: ChampTriEtat;
  defaut: string;
  erreur?: string;
}) {
  const { question, aide } = QUESTIONS_TRI_ETAT[champ];
  return (
    <div>
      <label
        className="label-board mb-1 text-[14px] text-[color:var(--board-ink)]"
        htmlFor={champ}
      >
        {question}
      </label>
      <Aide id={`${champ}-aide`}>{aide}</Aide>
      <select
        id={champ}
        name={champ}
        defaultValue={defaut}
        className="champ-board mt-2 sm:w-64"
        aria-describedby={`${champ}-aide`}
        aria-invalid={Boolean(erreur)}
      >
        {VALEURS_TRI_ETAT.map((v) => (
          <option key={v.value} value={v.value}>
            {v.label}
          </option>
        ))}
      </select>
      <Erreur message={erreur} />
    </div>
  );
}

/**
 * Plaque constructeur d'un équipement sous pression, et verdict indicatif
 * d'assujettissement (C. env. R. 557-14-1). Le verdict n'écrit rien : il
 * éclaire la réponse à la question « suivi en service » ci-dessous, qui
 * reste celle du dirigeant.
 */
function ChampsEsp({
  initiales,
  err,
}: {
  initiales: {
    familleEsp?: FamilleEsp;
    pressionMaxAdmissibleBar?: number;
    volumeLitres?: number;
  };
  err: (champ: string) => string | undefined;
}) {
  const [famille, setFamille] = useState<FamilleEsp | undefined>(
    initiales.familleEsp,
  );
  const [ps, setPs] = useState<string>(
    initiales.pressionMaxAdmissibleBar?.toString() ?? "",
  );
  const [vol, setVol] = useState<string>(
    initiales.volumeLitres?.toString() ?? "",
  );
  const verdict = verdictSuiviEnService({
    famille,
    pressionMaxAdmissibleBar: ps === "" ? undefined : Number(ps),
    volumeLitres: vol === "" ? undefined : Number(vol),
  });
  return (
    /* Sous-bloc creux : la plaque constructeur est un aparté technique dans
       la section, pas une carte de plus. */
    <div className="flex flex-col gap-4 rounded-[22px] bg-[color:var(--board-slate-pale)] px-5 py-5">
      <p className="m-0 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
        Plaque constructeur : la famille, la pression maximale admissible (PS)
        et le volume (V) déterminent si l&apos;équipement relève du suivi en
        service (C. env., art. R. 557-14-1). Le verdict ci-dessous est indicatif
        : c&apos;est votre réponse à la question « suivi en service » qui
        compte.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label className="label-board" htmlFor="familleEsp">
            Famille
          </label>
          <select
            id="familleEsp"
            name="familleEsp"
            value={famille ?? ""}
            onChange={(e) =>
              setFamille(
                (e.target.value || undefined) as FamilleEsp | undefined,
              )
            }
            className="champ-board bg-[color:var(--board-card)]"
          >
            <option value="">Je ne sais pas encore</option>
            {FAMILLES_ESP.map((f) => (
              <option key={f} value={f}>
                {LABEL_FAMILLE_ESP[f]}
              </option>
            ))}
          </select>
        </div>
        {/* PS et V portent des décimales et sont pilotés : leur `step` fait
            partie de la saisie, ils restent en `type="number"`. */}
        <ChampBoard
          className="[&_input]:bg-[color:var(--board-card)]"
          id="pressionMaxAdmissibleBar"
          name="pressionMaxAdmissibleBar"
          label="PS (bar)"
          type="number"
          step="0.1"
          min={0}
          value={ps}
          onChange={(e) => setPs(e.target.value)}
          erreur={err("pressionMaxAdmissibleBar")}
        />
        <ChampBoard
          className="[&_input]:bg-[color:var(--board-card)]"
          id="volumeLitres"
          name="volumeLitres"
          label="V (litres)"
          type="number"
          step="0.1"
          min={0}
          value={vol}
          onChange={(e) => setVol(e.target.value)}
          erreur={err("volumeLitres")}
        />
      </div>
      <p className="m-0 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-ink)]">
        <span className="board-eyebrow text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
          Verdict indicatif ·{" "}
        </span>
        {verdict.verdict === "soumis"
          ? "paraît soumis au suivi en service"
          : verdict.verdict === "non_soumis"
            ? "paraît hors du champ du suivi en service"
            : "indéterminé"}
        {" — "}
        <span className="text-[color:var(--board-slate-mid)]">
          {verdict.motif}
        </span>
      </p>
    </div>
  );
}
