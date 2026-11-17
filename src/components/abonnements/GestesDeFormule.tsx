// Les gestes posés dans les cartes d'offres de la page Formules (2026-11-17,
// décision de la propriétaire : « comme sur la landing ») : s'abonner à une
// formule, ou en changer. Chaque geste dit AVANT le clic ce qu'il fait —
// le montant prélevé aujourd'hui, ou l'effet du changement (ADR-053 §§ 9,
// 10 et 14). Les textes prennent la couleur de la carte (`currentColor`) :
// claire ou d'encre.

import { BoutonEnvoi } from "./BoutonEnvoi";
import { annulerBaisseAction, changerFormuleAction, sAbonnerAction } from "@/lib/abonnements/actions";
import { ChampCompteAttendu } from "@/components/compte/ChampCompteAttendu";
import { euros } from "@/lib/abonnements/affichage";
import { LIBELLES_PLAFONDS, LIBELLE_PERIODICITE, type Periodicite } from "@/lib/abonnements/formules";
import type { Depassement } from "@/lib/abonnements/quotas";
import { formaterDateLongueFr } from "@/lib/dates";

const NOTE = "m-0 text-[0.82rem] leading-[1.45] opacity-75";
/** La note qui compte, dans une carte : un refus, une date. */
export const NOTE_FORTE = "m-0 text-[0.82rem] font-semibold leading-[1.45]";

/**
 * S'abonner à une formule et un rythme : Checkout, premier paiement immédiat,
 * dit avant le clic. Pendant l'essai, le dirigeant se voit déjà sur la
 * formule de l'essai (retour de test du 2026-11-17) : il la garde, ou passe
 * à une autre — et l'essai s'arrête dans les deux cas (ADR-053 § 9).
 */
export function GesteSAbonner({
  cle,
  libelle,
  centimes,
  periodicite,
  compteId,
  carte,
  essai = null,
}: {
  /** La `lookup_key` visée. */
  cle: string;
  libelle: string;
  /** Le prix lu chez Stripe ; `null` : indisponible, le bouton reste fermé. */
  centimes: number | null;
  periodicite: Periodicite;
  /** Le compte que montre la page (`ChampCompteAttendu`). */
  compteId: string | null;
  carte: "claire" | "encre";
  /** L'essai en cours : sa fin, et si cette carte est celle de sa formule. */
  essai?: { fin: Date; sienne: boolean } | null;
}) {
  return (
    <form action={sAbonnerAction} className="flex flex-col gap-3">
      <input type="hidden" name="formule" value={cle} />
      <ChampCompteAttendu compteId={compteId} />
      {essai?.sienne ? (
        <p className={NOTE_FORTE}>Gratuite jusqu&apos;au {formaterDateLongueFr(essai.fin)}.</p>
      ) : null}
      <p className={NOTE}>
        {centimes === null
          ? "Prix indisponible pour le moment."
          : `Prélevé aujourd'hui : ${euros(centimes)} TTC, pour ${LIBELLE_PERIODICITE[periodicite].premiere}.`}
        {essai && centimes !== null ? " L'essai s'arrête, les limites complètes de la formule s'appliquent." : null}
      </p>
      <BoutonEnvoi variant="board" carte={carte} disabled={centimes === null}>
        {essai ? (essai.sienne ? `Garder ${libelle}` : `Passer à ${libelle}`) : <>S&apos;abonner à {libelle}</>}
      </BoutonEnvoi>
    </form>
  );
}

export type OptionDeFormule = {
  cle: string;
  libelle: string;
  sens: "montee" | "baisse";
  /** Ce que fait ce changement, dit avant le clic (le cas du rythme compris). */
  effet: string;
  /** Le prix est lu chez Stripe : sans lui, rien ne part. */
  prixConnu: boolean;
  depassements: Depassement[];
};

/**
 * Changer de formule, pour un abonnement qui paie (ADR-053 § 10) : une
 * montée tout de suite (différence prélevée), une baisse à la fin de la
 * période payée ; ce qui dépasserait passe en lecture seule, et trop
 * d'utilisateurs empêchent la baisse (§ 14).
 */
export function GesteChangement({ option, compteId, carte }: { option: OptionDeFormule; compteId: string | null; carte: "claire" | "encre" }) {
  const tropDeMembres = option.depassements.find((d) => d.quota === "membres");
  const enLecture = option.depassements.filter((d) => d.quota !== "membres");
  const idRefus = `refus-${option.cle}`;
  return (
    <form action={changerFormuleAction} className="flex flex-col gap-3">
      <input type="hidden" name="formule" value={option.cle} />
      <ChampCompteAttendu compteId={compteId} />
      <p className={NOTE}>{option.effet}</p>
      {/* Un bouton fermé dit pourquoi (retour de test du 2026-11-17). */}
      {!option.prixConnu ? <p className={NOTE_FORTE}>Prix indisponible pour le moment.</p> : null}
      {tropDeMembres ? (
        <p id={idRefus} className={NOTE_FORTE}>
          Retirez d&apos;abord {LIBELLES_PLAFONDS.membres(tropDeMembres.utilise - tropDeMembres.plafond)} : vous en avez{" "}
          {tropDeMembres.utilise}, cette formule en permet {tropDeMembres.plafond}.
        </p>
      ) : enLecture.length > 0 ? (
        <p className={NOTE}>
          Passeraient en lecture seule (consultables, plus modifiables) :{" "}
          {enLecture
            .map((d) => LIBELLES_PLAFONDS[d.quota as keyof typeof LIBELLES_PLAFONDS]?.(d.utilise - d.plafond) ?? `${d.utilise - d.plafond}`)
            .join(", ")}
          , {enLecture.length === 1 && enLecture[0].utilise - enLecture[0].plafond === 1 ? "le plus récent" : "les plus récents"}.
        </p>
      ) : null}
      <BoutonEnvoi
        variant="board"
        carte={carte}
        disabled={!option.prixConnu || !!tropDeMembres}
        describedBy={tropDeMembres ? idRefus : undefined}
      >
        {option.sens === "montee" ? `Passer à ${option.libelle}` : "Prévoir ce changement"}
      </BoutonEnvoi>
    </form>
  );
}

/** Une baisse déjà planifiée : vers quoi, quand, et y renoncer. */
export function BaissePrevue({ baisse, compteId }: { baisse: { libelle: string; le: Date }; compteId: string | null }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-[color:var(--board-slate-pale)] px-5 py-4">
      <p className="m-0 text-[14px] leading-[1.5]">
        Passage à {baisse.libelle} prévu le {formaterDateLongueFr(baisse.le)}.
      </p>
      <form action={annulerBaisseAction}>
        <ChampCompteAttendu compteId={compteId} />
        <BoutonEnvoi variant="boardClair">Garder ma formule</BoutonEnvoi>
      </form>
    </div>
  );
}
