import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { propositionSchema, type PlanComparable } from "@/lib/plan-prevention/proposition";
import { bandeauDeLaProposition, type Changement, type LigneBandeau } from "@/lib/plan-prevention/bandeau-proposition";
import { formaterHeureFr } from "@/lib/dates";
import { TraiterPropositionBoutons } from "./ContreSignatureBoutons";

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

const FMT_JOUR = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit" });

const TUILE =
  "flex size-11 flex-none items-center justify-center rounded-[12px] font-display text-[20px] font-bold leading-none";
const PASTILLE = "pastille-board flex-none text-[12.5px]";
const AMBRE = "bg-[color:var(--board-amber)] text-[color:var(--board-amber-ink)]";
const VERT = "bg-[color:var(--board-green)] text-[color:var(--board-green-ink)]";
const ROUGE_PALE = "bg-[color:var(--board-signal-wash)] text-[color:var(--board-signal-ink)]";
const ARDOISE = "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-ink)]";

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
            {(l.lieu || l.changements.lieu) && (
              <p className={sous}>
                Lieu : <Valeur texte={l.lieu} changement={l.changements.lieu} />
              </p>
            )}
            {(l.frequence || l.changements.frequence) && (
              <p className={sous}>
                Fréquence : <Valeur texte={l.frequence} changement={l.changements.frequence} />
              </p>
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
  const lue = propositionSchema.safeParse(proposition.contenu);
  const b = lue.success ? bandeauDeLaProposition(plan, lue.data) : null;
  const raison = plan.entrepriseExterieureRaison;
  const recue = `${FMT_JOUR.format(proposition.createdAt)} à ${formaterHeureFr(proposition.createdAt).replace(":", " h ")}`;
  return (
    <section
      aria-labelledby="proposition-titre"
      className="carte-board flex flex-col gap-5 px-6 py-7 shadow-[inset_0_4px_0_#f2d36b] md:px-[34px] md:py-[30px]"
    >
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div className="max-w-[720px]">
          <p className="board-eyebrow m-0 text-[11px] tracking-[0.16em] text-[color:var(--board-amber-ink)]">
            Proposition de modification · reçue le {recue}
          </p>
          <h2 id="proposition-titre" className="board-titre m-0 mt-2 text-[28px] leading-[1.02] md:text-[34px]">
            {raison} propose de modifier le plan
          </h2>
          <p className="m-0 mt-2 text-[15px] text-[color:var(--board-slate-ink)]">
            {auteur ? `${auteur}, depuis son lien. ` : ""}Aucune signature ne se recueille avant votre décision.
          </p>
        </div>
        {b && (
          <div className="flex flex-wrap gap-2">
            {b.modifies > 0 && <span className={`${PASTILLE} ${ARDOISE} font-semibold`}>{b.modifies} modifié{b.modifies > 1 ? "s" : ""}</span>}
            {b.ajoutes > 0 && <span className={`${PASTILLE} ${ARDOISE} font-semibold`}>{b.ajoutes} ajouté{b.ajoutes > 1 ? "s" : ""}</span>}
            {b.supprimes > 0 && (
              <span className={`${PASTILLE} bg-[color:var(--board-slate-pale)] font-semibold text-[color:var(--board-signal-ink)]`}>
                {b.supprimes} à supprimer
              </span>
            )}
          </div>
        )}
      </div>

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
    </section>
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
      className="carte-board flex flex-wrap items-center justify-between gap-[18px] px-6 py-6 shadow-[inset_0_4px_0_#7fb0d0] md:px-[34px]"
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
          <Link href={modifierHref} className="text-[color:var(--board-blue-ink)] underline-offset-2 hover:underline">
            retouchez ce que vous voulez
          </Link>
          , puis signez.
        </p>
      </div>
      <Link
        href={signerHref}
        scroll={false}
        className="inline-flex min-h-11 items-center rounded-full bg-[color:var(--board-ink)] px-6 font-display text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        Terminer la correction et signer
      </Link>
    </section>
  );
}
