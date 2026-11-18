import Link from "next/link";

import { PageDuCompte } from "@/components/compte/PageDuCompte";
import { requireCompte } from "@/lib/auth/compte";
import { ceQuiPart, demandeDuCompte, nomDuCompte } from "@/lib/compte/suppression";
import { formaterDateLongueFr } from "@/lib/dates";
import { AnnulationSuppression, FormulaireSuppression } from "./GestesSuppression";

export const metadata = {
  title: "Supprimer le compte — Rojer",
};

const TEXTE = "m-0 text-[14px] leading-[1.55] text-[color:var(--board-slate-ink)]";
const CARTE = "carte-board flex flex-col gap-4 px-7 py-6 sm:px-8";

/**
 * Supprimer le compte (ADR-058 § 8) : réservé à un propriétaire. Tout ce qui
 * part est dit AVANT le geste ; l'effacement vient sept jours après la
 * demande, et s'annule d'ici là. Pendant ce temps, la page montre la date.
 */
export default async function SuppressionPage() {
  const { compte } = await requireCompte();
  const proprietaire = compte.role === "owner";
  const [demande, nom] = await Promise.all([demandeDuCompte(compte.compteId), nomDuCompte(compte.compteId)]);

  return (
    <PageDuCompte
      titre="Supprimer le compte"
      description="Effacer le compte et toutes ses données, sept jours après votre demande. Vous pouvez annuler d'ici là."
    >
      {demande ? (
        <section className={CARTE} aria-labelledby="titre-prevue">
          <h2 id="titre-prevue" className="board-titre m-0 text-[22px]">
            Suppression prévue le {formaterDateLongueFr(demande.effacementLe)}
          </h2>
          <p className={TEXTE}>
            Demandée {demande.par ? `par ${demande.par} ` : ""}le {formaterDateLongueFr(demande.demandeeLe)}. Ce jour-là, le
            compte «&nbsp;{nom}&nbsp;» et toutes ses données seront effacés définitivement, et son abonnement résilié. D&apos;ici là,
            tout reste consultable et exportable.
          </p>
          {proprietaire ? (
            <AnnulationSuppression compteId={compte.compteId} />
          ) : (
            <p className={TEXTE}>Seul un propriétaire du compte peut annuler la suppression.</p>
          )}
        </section>
      ) : !proprietaire ? (
        <section className={CARTE}>
          <p className={TEXTE}>
            Seul un propriétaire du compte peut le supprimer. Pour ne plus y avoir accès, quittez-le depuis la page{" "}
            <Link href="/compte/membres" className="font-semibold underline">
              Membres
            </Link>
            .
          </p>
        </section>
      ) : (
        <AvantLaDemande compteId={compte.compteId} nom={nom} />
      )}
    </PageDuCompte>
  );
}

async function AvantLaDemande({ compteId, nom }: { compteId: string; nom: string }) {
  const { etablissements, aPaye, abonnementEnCours } = await ceQuiPart(compteId);
  const versions = etablissements.reduce((n, e) => n + e.versions, 0);
  return (
    <>
      <section className={CARTE} aria-labelledby="titre-part">
        <h2 id="titre-part" className="board-titre m-0 text-[22px]">
          Ce qui sera effacé
        </h2>
        <ul className={`${TEXTE} m-0 flex list-disc flex-col gap-1.5 pl-5`}>
          <li>
            Le compte «&nbsp;{nom}&nbsp;», ses {etablissements.length > 1 ? `${etablissements.length} établissements` : "établissements"}, leurs
            documents et les fichiers déposés.
          </li>
          <li>L&apos;accès de chaque membre. Les membres qui n&apos;ont pas d&apos;autre compte Rojer perdent aussi leur identifiant.</li>
          {abonnementEnCours ? (
            <li>Votre abonnement, résilié le jour de la suppression, sans remboursement de la période entamée.</li>
          ) : null}
        </ul>
        <p className={TEXTE}>
          L&apos;effacement a lieu sept jours après votre demande. D&apos;ici là, tout reste consultable, et vous pouvez annuler :
          rien n&apos;aura changé.
        </p>
      </section>

      <section className={CARTE} aria-labelledby="titre-garder">
        <h2 id="titre-garder" className="board-titre m-0 text-[22px]">
          Ce que vous devez garder
        </h2>
        <p className={TEXTE}>
          La conservation du document unique d&apos;évaluation des risques (DUERP), quarante ans dans ses versions successives,
          est à la charge de l&apos;employeur (articles L. 4121-3-1 et R. 4121-4 du Code du travail). Rojer ne la garde pas
          après la suppression : téléchargez les versions validées avant.
        </p>
        {versions > 0 ? (
          <ul className={`${TEXTE} m-0 flex flex-col gap-1.5 pl-0`}>
            {etablissements
              .filter((e) => e.duerpId && e.versions > 0)
              .map((e) => (
                <li key={e.id} className="list-none">
                  <Link href={`/duerp/${e.duerpId}`} className="font-semibold underline">
                    {e.nom}
                  </Link>{" "}
                  — {e.versions > 1 ? `${e.versions} versions validées` : "1 version validée"}
                </li>
              ))}
          </ul>
        ) : (
          <p className={TEXTE}>Ce compte ne porte aucune version validée du DUERP.</p>
        )}
        {aPaye ? (
          <p className={TEXTE}>
            Vos autres documents s&apos;exportent depuis la page « Préparer un contrôle » de chaque établissement.
          </p>
        ) : null}
      </section>

      <section className={CARTE} aria-labelledby="titre-confirmer">
        <h2 id="titre-confirmer" className="board-titre m-0 text-[22px]">
          Confirmer la suppression
        </h2>
        <p className={TEXTE}>
          Les propriétaires et les membres du compte recevront un e-mail avec la date, et le lien pour annuler.
        </p>
        <FormulaireSuppression compteId={compteId} nomCompte={nom} />
      </section>
    </>
  );
}
