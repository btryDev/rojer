import Link from "next/link";

import { CarteAbonnement, OffreFermee, TEXTE_AIDE } from "@/components/abonnements/CarteAbonnement";
import { JaugeDePlafond } from "@/components/abonnements/JaugeDePlafond";
import { MenuAbonnement } from "@/components/compte/MenuInterne";
import { PageDuCompte } from "@/components/compte/PageDuCompte";
import { buttonVariants } from "@/components/ui/button";
import type { Db } from "@/lib/auth/compte";
import { PAGE_ESSAI } from "@/lib/abonnements/essai";
import { CLES_FORMULES, FORMULE_D_ESSAI, FORMULES } from "@/lib/abonnements/formules";
import { etatDeLAbonnement, type EtatDeLAbonnement } from "@/lib/abonnements/page-abonnement";
import { PAR_AN, plafondDe, utilisationDuCompte, type CleQuota, type Utilisation } from "@/lib/abonnements/quotas";
import { PAGE_FORMULES } from "@/lib/abonnements/sous-pages";
import { octetsUtilises } from "@/lib/abonnements/stockage";
import { formaterDateLongueFr } from "@/lib/dates";

export const metadata = {
  title: "Utilisation — Rojer",
};

/** Les groupes de la page, dans l'ordre : le compte, ce qu'il tient (stockage compris), ce qu'il fait dans l'année. */
const GROUPES: { titre: string; cles: readonly CleQuota[]; avecStockage?: true; annuel?: true }[] = [
  { titre: "Le compte", cles: ["etablissements", "membres"] },
  {
    titre: "Le dossier",
    cles: ["equipements", "unitesTravail", "zones", "prescriptions", "prestataires", "liensAccesActifs"],
    avecStockage: true,
  },
  { titre: "Dans l'année", cles: PAR_AN, annuel: true },
];

const NOTES: Partial<Record<CleQuota, string>> = {
  membres: "Invitations en attente comprises.",
  unitesTravail: "Hors « Risques transverses ».",
};

/**
 * Ce que le compte utilise de chaque plafond de sa formule (2026-11-17,
 * sous-page de l'abonnement), lu par les compteurs qui appliquent les
 * plafonds (`utilisationDuCompte`, `octetsUtilises`) — aucune lecture chez
 * Stripe. Un plafond atteint n'efface rien : la création suivante est
 * refusée, et ce qui dépasse après une baisse reste consultable (ADR-053
 * § 14).
 */
export default async function UtilisationPage() {
  const etat = await etatDeLAbonnement();

  return (
    <PageDuCompte
      titre="Utilisation"
      description="Ce que votre compte utilise, comparé à ce que votre formule permet."
      menu={<MenuAbonnement />}
    >
      {etat.vue.cas === "fermee" ? (
        <OffreFermee />
      ) : !etat.c ? (
        <CarteAbonnement>
          <p className={TEXTE_AIDE}>Rien à compter pour l&apos;instant : votre compte n&apos;a encore rien créé.</p>
        </CarteAbonnement>
      ) : (
        <Plafonds etat={etat} db={etat.c.db} compteId={etat.c.compte.compteId} />
      )}
    </PageDuCompte>
  );
}

async function Plafonds({ etat, db, compteId }: { etat: EtatDeLAbonnement; db: Db; compteId: string }) {
  const [{ regime, lignes, annee: anneeDesPlafonds }, octets] = await Promise.all([
    utilisationDuCompte(db, compteId, { ligne: etat.ligne, maintenant: etat.ctx.maintenant }),
    octetsUtilises(db, compteId),
  ]);
  const parCle = new Map<CleQuota, Utilisation>(lignes.map((l) => [l.cle, l]));
  const stockage: Utilisation = { cle: "stockageGo", utilise: octets / 1e9, plafond: plafondDe(regime, "stockageGo") };
  const annee =
    anneeDesPlafonds.type === "repart"
      ? `Repart le ${formaterDateLongueFr(anneeDesPlafonds.le)}.`
      : anneeDesPlafonds.type === "depuis-essai"
        ? "Comptés depuis le début de l'essai, sans renouvellement avant l'abonnement."
        : "Comptés sur les douze derniers mois.";
  // L'essai n'est pas encore démarré (`vue.cas === "essai"`) : le premier
  // geste est de le démarrer, pas de s'abonner (relecture du 2026-11-17).
  const essaiADemarrer = etat.vue.cas === "essai";
  const intro = regime.essai
    ? regime.essai === "en_cours"
      ? `Les limites de l'essai priment sur celles de la formule ${FORMULES[FORMULE_D_ESSAI].libelle}.`
      : essaiADemarrer
        ? "Ce sont les limites de l'essai gratuit, que vous n'avez pas encore démarré."
        : "Sans abonnement payé, les limites de l'essai restent appliquées."
    : `Formule ${FORMULES[regime.formule].libelle}. Un plafond atteint n'efface rien : la création suivante est refusée.`;
  // Ce qu'on propose au propriétaire, sous les jauges : démarrer l'essai, en
  // sortir, ou une formule au-dessus s'il en existe une.
  const suite = essaiADemarrer
    ? { texte: "Démarrez votre essai gratuit pour commencer à saisir.", geste: "Démarrer mon essai gratuit", href: PAGE_ESSAI }
    : regime.essai === "en_cours"
      ? {
          texte: `Ce sont les limites de l'essai. Abonnez-vous dès maintenant pour tout débloquer : les limites complètes de la formule ${FORMULES[FORMULE_D_ESSAI].libelle}, et la validation et l'export des documents officiels. Votre essai s'arrête alors.`,
          geste: "Voir les offres",
          href: PAGE_FORMULES,
        }
      : regime.essai === "paiement_attendu"
        ? { texte: "Abonnez-vous pour passer aux limites complètes de votre formule.", geste: "M'abonner", href: PAGE_FORMULES }
        : CLES_FORMULES.indexOf(regime.formule) < CLES_FORMULES.length - 1
          ? { texte: "Besoin de plus de sites, de personnes ou de documents ?", geste: "Voir les offres", href: PAGE_FORMULES }
          : null;

  return (
    <CarteAbonnement titre="Ce que vous utilisez">
      <p className={TEXTE_AIDE}>{intro}</p>
      {GROUPES.map((g) => (
        <div key={g.titre} className="mt-3 flex flex-col gap-4">
          <div>
            <h3 className="m-0 text-[15px] font-semibold">{g.titre}</h3>
            {g.annuel ? <p className="m-0 mt-0.5 text-[12.5px] text-[color:var(--board-slate-soft)]">{annee}</p> : null}
          </div>
          {g.cles.map((cle) => {
            const u = parCle.get(cle);
            return u ? <JaugeDePlafond key={cle} utilisation={u} note={NOTES[cle]} /> : null;
          })}
          {g.avecStockage ? <JaugeDePlafond utilisation={stockage} unite="Go" /> : null}
        </div>
      ))}
      {etat.vue.cas !== "membre" && suite ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-[22px] bg-[color:var(--board-slate-pale)] px-5 py-4">
          <p className="m-0 text-[14px] leading-[1.5] text-[color:var(--board-slate-ink)]">{suite.texte}</p>
          <Link href={suite.href} className={buttonVariants({ variant: "boardClair", size: "board" })}>
            {suite.geste}
          </Link>
        </div>
      ) : null}
    </CarteAbonnement>
  );
}
