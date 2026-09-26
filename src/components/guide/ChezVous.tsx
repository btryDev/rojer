import Link from "next/link";
import { LegalBadge } from "@/components/ui-kit/LegalBadge";
import {
  LABEL_DOMAINE,
  LABEL_PERIODICITE,
  LABEL_REALISATEUR,
} from "@/lib/calendrier/labels";
import { LABEL_CATEGORIE_EQUIPEMENT } from "@/lib/equipements/labels";
import {
  SEUIL_MAJ_ANNUELLE_DUERP,
  type ChezVous as ChezVousData,
} from "@/lib/guide/chez-vous";
import {
  EXTRAIT_R4121_2,
  MAJ_DUERP_AMENAGEMENT_IMPORTANT,
  MAJ_DUERP_INFORMATION_NOUVELLE,
  enMinuscule,
} from "@/lib/referentiels/conformite/texte-r4121-2";

/**
 * « Chez vous, concrètement » — la seule section personnalisée de la page
 * Comprendre. Tout le reste du guide énonce des règles générales ; ici,
 * chaque règle est résolue contre les déclarations réelles de
 * l'établissement (effectif, régimes, équipements), via le moteur de
 * matching — déterministe et sourcé.
 *
 * Garde-fou : on liste ce qui découle des déclarations, on ne dit jamais
 * « vous êtes conforme ». Les absences sont dites (équipement déclaré qui
 * ne déclenche rien), jamais masquées.
 */
export function ChezVous({
  data,
  etablissementId,
  raisonDisplay,
  regimes,
}: {
  data: ChezVousData;
  etablissementId: string;
  raisonDisplay: string;
  /** Libellés courts des régimes déclarés, ex. ["Travail", "ERP · N5"]. */
  regimes: string[];
}) {
  const base = `/etablissements/${etablissementId}`;

  return (
    <section>
      <header className="mb-8">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">§ Chez vous, concrètement</p>
        <h2 className="board-titre text-[clamp(22px,2.2vw,27px)] mt-3 max-w-[22ch]">
          Vos obligations,
          <br />
          <span className="text-[color:var(--board-blue-ink)]">résolues sur vos déclarations.</span>
        </h2>
        <p className="text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)] mt-5">
          Ce que vous lisez ici est calculé depuis votre dossier —{" "}
          <strong>{raisonDisplay}</strong>, {data.duerp.effectifSurSite} travailleur
          {data.duerp.effectifSurSite > 1 ? "s" : ""} sur site
          {regimes.length > 0 ? <> · {regimes.join(" · ")}</> : null}. Chaque
          règle cite sa source ; modifiez vos déclarations et cette section
          se recalcule.
        </p>
      </header>

      {/* DUERP : seuil résolu */}
      <div className="carte-board px-7 py-6 sm:px-8 px-6 py-5 sm:px-8">
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[color:var(--board-slate-mid)]">
          DUERP — rythme de mise à jour
        </p>
        <p className="mt-2 max-w-3xl text-[0.95rem] leading-relaxed">
          Le document unique est obligatoire dès le premier salarié. Votre
          entreprise déclare{" "}
          <strong>
            {data.duerp.effectif} salarié{data.duerp.effectif > 1 ? "s" : ""}
          </strong>{" "}
          :{" "}
          {data.duerp.misAJourAnnuel ? (
            <>
              le 1° de l&apos;art. R. 4121-2, qui vise les entreprises
              d&apos;au moins {SEUIL_MAJ_ANNUELLE_DUERP} salariés,
              s&apos;applique — la mise à jour est réalisée{" "}
              <strong>au moins chaque année</strong>. Elle l&apos;est aussi{" "}
              {enMinuscule(MAJ_DUERP_AMENAGEMENT_IMPORTANT)} ; et{" "}
              {enMinuscule(MAJ_DUERP_INFORMATION_NOUVELLE)}.
            </>
          ) : (
            <>
              le 1° de l&apos;art. R. 4121-2, qui vise les entreprises
              d&apos;au moins {SEUIL_MAJ_ANNUELLE_DUERP} salariés, ne
              s&apos;applique pas. La mise à jour est réalisée{" "}
              <strong>{enMinuscule(MAJ_DUERP_AMENAGEMENT_IMPORTANT)}</strong>{" "}
              ; et {enMinuscule(MAJ_DUERP_INFORMATION_NOUVELLE)}.
            </>
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <LegalBadge charte="board"
            reference="Art. R. 4121-2 CT"
            href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045386446"
            extrait={EXTRAIT_R4121_2}
          />
        </div>
      </div>

      {/* Vérifications : résumé par domaine.

          ⚠ CE BLOC A AFFIRMÉ LE CONTRAIRE DE CE QUE FAIT LE PRODUIT.
          « Aucun équipement déclaré » et la liste des domaines étaient deux
          BRANCHES d'une alternative : déclarer zéro équipement effaçait la
          liste et affichait « la plateforme ne peut donc calculer aucune
          vérification périodique ».

          C'était vrai tant que toute obligation naissait d'un équipement. Ce
          n'est plus le cas : un établissement sans le moindre appareil reçoit
          les obligations portées par l'établissement et par les salariés —
          formation à la sécurité, information sur l'accès au DUERP, premiers
          secours, suivi médical. Le paragraphe écrit pour ne pas faire croire
          à une absence d'obligations en produisait une lui-même, sur la page
          qui explique.

          Les deux ne s'excluent donc plus : l'absence d'équipement est une
          REMARQUE, la liste des domaines se montre dans tous les cas où elle
          n'est pas vide. */}
      {data.aucunEquipement ? (
        <div className="carte-board px-7 py-6 sm:px-8 mt-4 px-6 py-5 sm:px-8">
          <p className="max-w-3xl text-[0.95rem] leading-relaxed">
            <strong>Aucun équipement déclaré pour l&apos;instant</strong>{" "}
            —
            les vérifications qui naissent d&apos;un appareil ne peuvent donc
            pas être calculées.{" "}
            {data.domaines.length > 0 ? (
              <>
                Ce qui suit ne dépend d&apos;aucun équipement : ce sont les
                obligations qui vous incombent comme employeur, dès le premier
                salarié.
              </>
            ) : (
              <>
                Ce silence ne signifie pas qu&apos;aucune obligation ne vous
                concerne : il signifie que rien n&apos;est déclaré.
              </>
            )}
          </p>
          <Link
            href={`${base}/equipements`}
            className="mt-3 inline-block text-[0.88rem] font-medium text-[color:var(--board-blue-ink)] hover:underline"
          >
            Déclarer mes équipements →
          </Link>
        </div>
      ) : null}
      {data.domaines.length > 0 ? (
        <>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {data.domaines.map((d) => (
              <li key={d.domaine} className="carte-board px-7 py-6 sm:px-8 px-6 py-5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[1.02rem] font-semibold tracking-[-0.01em]">
                    {LABEL_DOMAINE[d.domaine]}
                  </p>
                  <p className="shrink-0 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-[color:var(--board-slate-mid)]">
                    {d.nbObligations} obligation
                    {d.nbObligations > 1 ? "s" : ""}
                  </p>
                </div>
                <p className="mt-2 text-[0.84rem] leading-relaxed text-[color:var(--board-slate-mid)]">
                  Rythmes :{" "}
                  {d.periodicites
                    .map((p) => LABEL_PERIODICITE[p])
                    .join(" · ")}
                  {d.realisateurs.length > 0 && (
                    <>
                      <br />
                      Qui :{" "}
                      {d.realisateurs
                        .map((r) => LABEL_REALISATEUR[r])
                        .join(" · ")}
                    </>
                  )}
                </p>
                <p className="mt-3 border-t border-dashed border-[color:var(--board-slate-line)] pt-3 text-[0.8rem] leading-relaxed text-[color:var(--board-slate-mid)]">
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em]">
                    Pourquoi chez vous —{" "}
                  </span>
                  {d.raisons.join(" · ")}
                  {d.equipements.length > 0 && (
                    <> · déclenché par : {d.equipements.join(", ")}</>
                  )}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[0.82rem] text-[color:var(--board-slate-mid)]">
            Le détail daté de chaque vérification vit dans votre{" "}
            <Link
              href={`${base}/calendrier`}
              className="font-medium text-[color:var(--board-blue-ink)] hover:underline"
            >
              calendrier
            </Link>
            .
          </p>
        </>
      ) : null}

      {/* Trous honnêtes */}
      {data.categoriesSansObligation.length > 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-[color:var(--board-slate)] px-6 py-4 sm:px-8">
          <p className="max-w-3xl text-[0.84rem] leading-relaxed text-[color:var(--board-slate-mid)]">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em]">
              À noter —{" "}
            </span>
            {data.categoriesSansObligation.length > 1
              ? "certaines catégories déclarées ne génèrent"
              : "une catégorie déclarée ne génère"}{" "}
            aucune vérification automatique dans votre situation :{" "}
            {data.categoriesSansObligation
              .map((c) => LABEL_CATEGORIE_EQUIPEMENT[c])
              .join(", ")}
            . Cela ne signifie pas qu&apos;aucune règle ne s&apos;y applique
            — seulement que le référentiel de la plateforme n&apos;en couvre
            pas encore les vérifications. En cas de doute, rapprochez-vous
            d&apos;un professionnel de la prévention.
          </p>
        </div>
      )}

      <p className="mt-6 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[color:var(--board-slate-mid)]">
        Calcul déterministe depuis vos déclarations · ne vaut pas
        attestation de conformité
      </p>
    </section>
  );
}
