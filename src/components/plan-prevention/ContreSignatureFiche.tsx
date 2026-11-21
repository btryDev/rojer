import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { propositionSchema, type PlanComparable } from "@/lib/plan-prevention/proposition";
import { bandeauDeLaProposition, type Changement, type LigneBandeau } from "@/lib/plan-prevention/bandeau-proposition";
import { formaterHeureEnLettresFr, formaterJourMoisChiffresFr } from "@/lib/dates";
import { TraiterPropositionBoutons } from "./ContreSignatureBoutons";
import { CarteActionRequise, RappelSuivi } from "./ActionRequise";

/**
 * Ce que la fiche du plan montre de la contre-signature (ADR-061).
 *
 * [2026-11-19, lot 4, maquette V2 « Bandeau »] La proposition de l'entreprise
 * extérieure : une carte blanche à filet ambre, le plan tel qu'il deviendrait
 * — une ligne par écart, façon calendrier : « ~ » modifié, le numéro pour un
 * risque inchangé, « + » ajouté, « − » à supprimer —, puis les trois gestes.
 * Après « Corriger », la carte « Correction en cours » (filet bleu). Les
 * signatures révoquées ne sont plus listées ici : elles sont dans
 * l'historique, chacune vérifiable.
 */


const TUILE =
  "flex size-11 flex-none items-center justify-center rounded-[12px] font-display text-[20px] font-bold leading-none";
const PASTILLE = "pastille-board flex-none text-[12.5px]";
const AMBRE = "bg-[color:var(--board-amber)] text-[color:var(--board-amber-ink)]";
const VERT = "bg-[color:var(--board-green)] text-[color:var(--board-green-ink)]";
const ROUGE_PALE = "bg-[color:var(--board-signal-wash)] text-[color:var(--board-signal-ink)]";
const ARDOISE = "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-ink)]";

/** Famille, lieu et fréquence d'un risque (2026-11-21), dits sous ses mesures. */
const PRECISIONS = [
  { cle: "famille", libelle: "Famille" },
  { cle: "lieu", libelle: "Lieu" },
  { cle: "frequence", libelle: "Fréquence" },
] as const;

function Valeur({ texte, changement }: { texte: string; changement: Changement }) {
  if (!changement) return <>{texte || "à compléter"}</>;
  return (
    <>
      <s className="text-[color:var(--board-slate-soft)]">{changement.avant || "vide"}</s> <span aria-hidden>→</span>
      <span className="sr-only">devient</span>{" "}
      <strong className="font-semibold text-[color:var(--board-ink)]">{changement.apres || "vide"}</strong>
    </>
  );
}

function Ligne({ l }: { l: LigneBandeau }) {
  const base = "flex flex-wrap items-center gap-4 border-b border-[color:var(--board-slate-pale)] py-4 last:border-b-0";
  const corps = "min-w-0 flex-[1_1_300px]";
  const sous = "m-0 mt-0.5 text-[13px] text-[color:var(--board-slate-soft)]";
  switch (l.type) {
    case "fiche":
      return (
        <li className={base}>
          <span className={`${TUILE} ${AMBRE}`} aria-hidden>~</span>
          <div className={corps}>
            <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.12em] text-[color:var(--board-slate-soft)]">
              Fiche de l&apos;entreprise extérieure · {l.libelle}
            </p>
            <p className="m-0 mt-1 text-[15.5px]">
              <Valeur texte={l.apres} changement={{ avant: l.avant, apres: l.apres }} />
            </p>
          </div>
          <span className={`${PASTILLE} ${AMBRE}`}>Modifié</span>
        </li>
      );
    case "inchange":
      return (
        <li className={base}>
          <span className={`${TUILE} bg-[color:var(--board-ink)] text-[17px] text-white`} aria-hidden>
            {l.numero}
          </span>
          <div className={corps}>
            <p className="m-0 text-[15.5px] font-medium">{l.risque}</p>
            <p className={sous}>
              Votre mesure : {l.eu || "à compléter"} · Sa mesure : {l.ee || "à compléter"}
            </p>
          </div>
          <span className={`${PASTILLE} ${ARDOISE}`}>Inchangé</span>
        </li>
      );
    case "modifie":
      return (
        <li className={base}>
          <span className={`${TUILE} ${AMBRE} text-[17px]`} aria-hidden>
            {l.numero}
          </span>
          <div className={corps}>
            <p className="m-0 text-[15.5px] font-medium">
              <Valeur texte={l.risque} changement={l.changements.risque} />
            </p>
            <p className={sous}>
              Votre mesure : <Valeur texte={l.eu} changement={l.changements.eu} /> · Sa mesure :{" "}
              <Valeur texte={l.ee} changement={l.changements.ee} />
            </p>
            {/* Lieu et fréquence (2026-11-21) : dits seulement s'ils portent
                quelque chose ou s'ils changent. */}
            {PRECISIONS.map(({ cle, libelle }) =>
              l[cle] || l.changements[cle] ? (
                <p key={cle} className={sous}>
                  {libelle} : <Valeur texte={l[cle]} changement={l.changements[cle]} />
                </p>
              ) : null,
            )}
          </div>
          <span className={`${PASTILLE} ${AMBRE}`}>Modifié</span>
        </li>
      );
    case "ajoute":
      return (
        <li className={base}>
          <span className={`${TUILE} ${VERT} text-[22px]`} aria-hidden>+</span>
          <div className={corps}>
            <p className="m-0 text-[15.5px] font-semibold">{l.risque}</p>
            <p className={sous}>
              Votre mesure : {l.eu || "à compléter"} · Sa mesure : {l.ee || "à compléter"}
            </p>
            {PRECISIONS.map(({ cle, libelle }) =>
              l[cle] ? (
                <p key={cle} className={sous}>
                  {libelle} : {l[cle]}
                </p>
              ) : null,
            )}
          </div>
          <span className={`${PASTILLE} ${VERT}`}>Ajouté</span>
        </li>
      );
    case "supprime":
      return (
        <li className={base}>
          <span className={`${TUILE} bg-[color:var(--board-signal)] text-[22px] text-[color:var(--board-ink)]`} aria-hidden>
            −
          </span>
          <div className={corps}>
            <p className="m-0 text-[15.5px] text-[color:var(--board-signal-ink)]">
              <s>{l.risque}</s>
            </p>
            <p className="m-0 mt-0.5 text-[13px] text-[color:var(--board-signal-ink)]">Supprimé si vous acceptez</p>
          </div>
          <span className={`${PASTILLE} ${ROUGE_PALE}`}>À supprimer</span>
        </li>
      );
  }
}

/** La proposition relue contre le plan d'aujourd'hui ; `null` si elle ne se lit plus. */
function lireBandeau(plan: PlanComparable, contenu: Prisma.JsonValue) {
  const lue = propositionSchema.safeParse(contenu);
  return lue.success ? bandeauDeLaProposition(plan, lue.data) : null;
}

const nombreDeModifications = (b: { modifies: number; ajoutes: number; supprimes: number }) =>
  b.modifies + b.ajoutes + b.supprimes;
const modifications = (n: number) => `${n} modification${n > 1 ? "s" : ""}`;
const recue = (d: Date) => `${formaterJourMoisChiffresFr(d)} à ${formaterHeureEnLettresFr(d)}`;

/**
 * Le rappel de l'onglet « Plan de prévention » (2026-11-21, maquette V3) :
 * une proposition attend, la décision se prend dans l'onglet « Suivi ».
 */
export function RappelProposition({
  proposition,
  plan,
  suiviHref,
}: {
  proposition: { contenu: Prisma.JsonValue; createdAt: Date };
  plan: PlanComparable;
  suiviHref: string;
}) {
  const b = lireBandeau(plan, proposition.contenu);
  const n = b ? nombreDeModifications(b) : 0;
  return (
    <RappelSuivi href={suiviHref} action="Voir et décider →">
      <strong className="font-semibold">
        {plan.entrepriseExterieureRaison} a proposé {n > 0 ? modifications(n) : "des modifications"}
      </strong>{" "}
      le {recue(proposition.createdAt)}. Aucune signature ne se recueille avant votre décision.
    </RappelSuivi>
  );
}

/**
 * Le rappel de la correction en cours, sur l'onglet « Plan de prévention »
 * (2026-11-21, relecture : revenu de « Modifier », rien ne la signalait).
 */
export function RappelCorrection({ raisonEE, suiviHref }: { raisonEE: string; suiviHref: string }) {
  return (
    <RappelSuivi href={suiviHref} action="Terminer la correction et signer →">
      <strong className="font-semibold">Correction en cours</strong> : la proposition de {raisonEE} est reprise dans le
      plan. Signez pour la terminer.
    </RappelSuivi>
  );
}

export function PropositionEnAttente({
  proposition,
  plan,
  auteur,
}: {
  proposition: { id: string; contenu: Prisma.JsonValue; createdAt: Date };
  plan: PlanComparable;
  /** Qui a proposé : le nom du lien, à défaut son adresse. */
  auteur: string | null;
}) {
  const b = lireBandeau(plan, proposition.contenu);
  const raison = plan.entrepriseExterieureRaison;
  const n = b ? nombreDeModifications(b) : 0;
  // [2026-11-21, maquette V3] « Action requise », et le nombre de
  // modifications dans le titre.
  return (
    <CarteActionRequise
      id="proposition-titre"
      surtitre={`Action requise · reçue le ${recue(proposition.createdAt)}`}
      titre={n > 0 ? `${raison} propose ${modifications(n)}` : `${raison} propose de modifier le plan`}
      droite={
        b && (
          <div className="flex flex-wrap gap-2">
            {b.modifies > 0 && <span className={`${PASTILLE} ${ARDOISE} font-semibold`}>{b.modifies} modifié{b.modifies > 1 ? "s" : ""}</span>}
            {b.ajoutes > 0 && <span className={`${PASTILLE} ${ARDOISE} font-semibold`}>{b.ajoutes} ajouté{b.ajoutes > 1 ? "s" : ""}</span>}
            {b.supprimes > 0 && (
              <span className={`${PASTILLE} bg-[color:var(--board-slate-pale)] font-semibold text-[color:var(--board-signal-ink)]`}>
                {b.supprimes} à supprimer
              </span>
            )}
          </div>
        )
      }
      phrase={`${auteur ? `${auteur}, depuis son lien. ` : ""}Aucune signature ne se recueille avant votre décision.`}
    >
      {!b ? (
        <p className="m-0 text-[13.5px] text-[color:var(--board-signal-ink)]">
          Cette proposition ne se lit plus : refusez-la et corrigez le plan à la main.
        </p>
      ) : (
        <ul className="m-0 list-none border-t border-[color:var(--board-slate-pale)] p-0">
          {b.lignes.map((l) => (
            <Ligne key={l.cle} l={l} />
          ))}
        </ul>
      )}

      <TraiterPropositionBoutons propositionId={proposition.id} raisonEE={raison} />
    </CarteActionRequise>
  );
}

/**
 * Après « Corriger » (2026-11-19) : la proposition est appliquée, le
 * dirigeant retouche le plan, puis signe. « Terminer la correction et
 * signer » ouvre la fenêtre de signature (`?openSign=1`) ; la correction se
 * termine quand il signe (`poserSignatureCompteAvecCode`).
 */
export function CorrectionEnCours({
  raisonEE,
  modifierHref,
  signerHref,
}: {
  raisonEE: string;
  modifierHref: string;
  signerHref: string;
}) {
  return (
    <section
      aria-labelledby="correction-titre"
      className="flex flex-wrap items-center justify-between gap-[18px] px-6 py-7 shadow-[inset_0_4px_0_var(--board-blue-mid)] md:px-10"
    >
      <div>
        <p className="board-eyebrow m-0 text-[11px] tracking-[0.16em] text-[color:var(--board-slate-ink)]">
          Après « Corriger »
        </p>
        <h2 id="correction-titre" className="board-titre m-0 mt-1.5 text-[26px]">
          Correction en cours
        </h2>
        <p className="m-0 mt-1 text-[14.5px] text-[color:var(--board-slate-ink)]">
          La proposition de {raisonEE} est reprise dans le plan :{" "}
          <Link data-ecriture href={modifierHref} className="text-[color:var(--board-blue-ink)] underline-offset-2 hover:underline">
            retouchez ce que vous voulez
          </Link>
          , puis signez.
        </p>
      </div>
      <Link
        data-ecriture
        href={signerHref}
        scroll={false}
        className="inline-flex min-h-11 items-center rounded-full bg-[color:var(--board-ink)] px-6 font-display text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        Terminer la correction et signer
      </Link>
    </section>
  );
}
