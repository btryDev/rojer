"use client";

// LA VUE PAR ÉQUIPEMENT — les mêmes échéances, lues par appareil.
//
// La vue par mois répond à « que dois-je faire en août ? ». Celle-ci
// répond à « qu'est-ce que cette hotte me demande dans l'année, et qui
// doit le faire ? ». Même donnée, deux questions que les dirigeants ne
// posent pas au même moment : l'une quand ils organisent leur semaine,
// l'autre quand ils arbitrent un contrat de maintenance.
//
// L'instrument est celui de la vue annuelle, en réduction : douze cases,
// la couleur dit l'état. La hauteur, elle, disparaît — sur une ligne de
// 20 px elle ne dirait rien de fiable ; le compte passe donc en pilules,
// à droite.
//
// Les échéances qui ne tiennent à aucun appareil — attestations de
// prestataires, corrections du plan d'actions, analyses — ne sont pas
// renvoyées ailleurs : elles forment leur propre groupe, où le porteur
// est la famille et non l'appareil. Les ranger sous un équipement aurait
// été faux ; les taire aurait fait croire que le parc porte toute la
// conformité.
//
// Une case de mois s'ouvre : le détail se déplie SOUS la carte de
// l'appareil, à sa place. Renvoyer vers la vue par mois ferait perdre
// l'appareil qu'on était en train de regarder — or la question posée
// ici, c'est « et celui-là, qu'est-ce qu'il me demande en août ? ».
//
// Deux regroupements, deux niveaux :
//
//   - les appareils sont **groupés par catégorie**. Six extincteurs
//     dispersés dans une liste triée par retard, c'est six fois la même
//     question posée à six endroits : on les traite ensemble ou pas du
//     tout. La catégorie quitte donc la carte (elle titre le groupe) et
//     le nom de l'appareil reste seul à porter la carte ;
//   - une carte a deux états. **Repliée** — le défaut — elle tient son
//     nom, sa prochaine échéance et sa règle : de quoi parcourir un parc
//     de treize appareils d'un écran. **Ouverte**, elle ajoute les mois
//     nommés, les compteurs et le tiroir du mois visé. La règle reste
//     visible dans les deux : c'est elle qu'on est venu lire.

import { useState } from "react";
import { LienProvenance } from "@/components/navigation/LienProvenance";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { StatutVerification } from "@prisma/client";
import { BadgeStatut } from "@/components/calendrier/BadgeStatut";
import { MentionContractuelle } from "@/components/prescriptions/MentionContractuelle";
import { MOIS_FR, MOIS_FR_COURT } from "@/lib/calendrier/labels";
import {
  CHAMP_ETAT,
  compteEtat,
  ENCRE_ETAT,
  libelleEtatCourtCapitale,
  type EtatEcheance,
  type RegistreLigne,
} from "@/lib/calendrier/etats";

/** État d'un mois pour un équipement — le plus urgent qu'il porte. */
export type EtatMois = EtatEcheance | null;

export type GroupeEquipement = {
  /** Libellé de la catégorie — « Extincteurs », « Ventilation (VMC) »… */
  categorie: string;
  /** Code de la catégorie, pour son picto. */
  categorieCode: string;
  /**
   * Ce que compte le groupe, au singulier : « appareil » dans le parc,
   * « famille » pour les échéances qui n'ont pas d'appareil. Un groupe
   * qui annoncerait « 2 appareils » pour deux familles de documents
   * mentirait sur ce qu'il montre.
   */
  uniteLigne: string;
  lignes: LigneEquipement[];
  enRetard: number;
  proche: number;
  lointain: number;
  faite: number;
  aPlanifier: number;
};

/**
 * Un porteur d'échéances. C'est un appareil dans la plupart des cas —
 * mais une attestation de prestataire ou une correction du plan d'actions
 * n'en a pas, et elles doivent bien se ranger quelque part : leur porteur
 * est alors leur famille (« Documents », « Corrections »). Le reste du
 * composant ne fait pas la différence, et c'est voulu.
 */
export type LigneEquipement = {
  id: string;
  libelle: string;
  categorie: string;
  categorieCode: string;
  /** Fiche du porteur, quand il en a une. */
  hrefFiche: string | null;
  /** Douze cases, de janvier à décembre de l'année affichée. */
  mois: EtatMois[];
  enRetard: number;
  proche: number;
  lointain: number;
  faite: number;
  aPlanifier: number;
  /**
   * Occurrences datées hors de l'année affichée. Les compteurs de la
   * carte comptent ce que sa règle montre — ce qui déborde se dit à part
   * plutôt que de gonfler un chiffre que rien ne vient justifier.
   */
  horsAnnee: number;
  /** La prochaine échéance non réalisée, si elle existe. */
  prochaine: { libelle: string; etat: EtatMois } | null;
  /** Les occurrences de l'année, pour le dépli d'un mois. */
  occurrences: OccurrenceEquipement[];
};

/**
 * Une occurrence, mise à plat côté serveur : ce composant s'exécute dans
 * le navigateur, il ne peut recevoir ni date ni composant — seulement des
 * chaînes déjà formatées dans le bon fuseau.
 */
export type OccurrenceEquipement = {
  id: string;
  href: string;
  /** Mois civil, de 1 à 12. */
  mois: number;
  jour: string;
  moisCourt: string;
  titre: string;
  meta: string;
  /**
   * L'occurrence naît-elle d'un acte contractuel (ADR-032) ? Un booléen et
   * non un ajout à `meta`, qui est tronqué : un marquage qui s'efface quand
   * le libellé est long manque là où il compte.
   */
  contractuelle?: boolean;
  etat: RegistreLigne;
  /** Statut de vérification — absent hors du parc, où il n'existe pas. */
  statut?: StatutVerification;
};

export function VueParEquipement({
  annee,
  moisCourant,
  groupes,
  sansEcheance,
  horsReferentiel,
}: {
  annee: number;
  /** Mois civil courant, de 1 à 12 — celui qu'une carte ouvre en premier. */
  moisCourant: number;
  groupes: GroupeEquipement[];
  /** Équipements déclarés qui n'ont aucune échéance cette année. */
  sansEcheance: number;
  /**
   * Parmi eux, ceux pour lesquels le référentiel n'en produira aucune —
   * jamais, pas seulement cette année. Sous-ensemble de `sansEcheance`.
   */
  horsReferentiel: number;
}) {
  if (groupes.length === 0) {
    return (
      <section className="rounded-[30px] bg-[color:var(--board-slate-pale)] px-6 py-7">
        <p className="m-0 text-[15px] font-semibold tracking-[-0.015em] text-[color:var(--board-ink)]">
          Aucun équipement ne porte d&apos;échéance
        </p>
        <p className="m-0 mt-2 max-w-[560px] text-[13.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
          {horsReferentiel > 0
            ? // Un parc déclaré et une lecture vide : renvoyer à « déclarez
              // vos appareils » ferait chercher une saisie manquante là où
              // c'est le référentiel qui est muet.
              `${horsReferentiel} de vos appareils ${
                horsReferentiel > 1 ? "sont" : "est"
              } hors référentiel : aucune échéance n'y est calculée. Cela ne veut pas dire qu'aucune vérification ne leur est due.`
            : "Les vérifications périodiques se rattachent aux appareils que vous déclarez. Cette lecture se remplira en même temps que votre parc."}
        </p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {groupes.map((g, i) => (
        <GroupeCategorie
          key={g.categorieCode}
          groupe={g}
          annee={annee}
          moisCourant={moisCourant}
          // Un seul groupe ouvert à l'arrivée : celui qui coûte le plus,
          // puisque l'ordre met le retard devant. Les autres annoncent
          // leur solde depuis leur titre — c'est ce qu'on vient lire en
          // premier, et ça n'oblige pas à dérouler pour le savoir.
          ouvertParDefaut={i === 0}
        />
      ))}

      {/* Ce que la lecture par appareil laisse forcément dehors. Le taire
          ferait croire que le parc porte toute la conformité. */}
      {sansEcheance > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
            {sansEcheance} équipement{sansEcheance > 1 ? "s" : ""} déclaré
            {sansEcheance > 1 ? "s" : ""} sans aucune échéance en {annee}.
          </p>

          {/* « Rien en 2026 » se répare tout seul l'année suivante ; « rien
              jamais » non. Compter les deux ensemble sans le dire laissait
              le silence du référentiel se faire passer pour un creux de
              calendrier. La phrase décrit l'outil, elle ne qualifie pas la
              situation : l'absence d'échéance calculée n'est pas l'absence
              d'obligation. */}
          {horsReferentiel > 0 ? (
            <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
              Dont {horsReferentiel}{" "}
              hors référentiel : aucune échéance
              n&apos;est calculée pour{" "}
              {horsReferentiel > 1 ? "ces équipements" : "cet équipement"},
              quelle que soit l&apos;année. Cela ne veut pas dire
              qu&apos;aucune vérification ne{" "}
              {horsReferentiel > 1 ? "leur" : "lui"} est due.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function GroupeCategorie({
  groupe: g,
  annee,
  moisCourant,
  ouvertParDefaut,
}: {
  groupe: GroupeEquipement;
  annee: number;
  moisCourant: number;
  ouvertParDefaut: boolean;
}) {
  const [ouvert, setOuvert] = useState(ouvertParDefaut);

  return (
    <section>
      {/* Le titre du groupe reste dehors, sur le blanc de la page : il
          annonce le panneau, il n'en fait pas partie. Le filet sous lui
          tient lieu de barre de section, et toute la ligne déplie — le
          solde reste lisible replié, c'est à ce niveau qu'on décide
          d'appeler un prestataire. */}
      <h3 className="m-0">
        <button
          type="button"
          onClick={() => setOuvert((o) => !o)}
          aria-expanded={ouvert}
          className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 border-b border-[color:rgba(13,18,36,.12)] pb-3 text-left"
        >
          {/* La place d'un picto de catégorie est ici, à gauche du
              titre — `categorieCode` la tient prête. */}
          <span className="board-titre text-[21px]">{g.categorie}</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[color:var(--board-slate-soft)]">
            {g.lignes.length} {g.uniteLigne}
            {g.lignes.length > 1 ? "s" : ""}
          </span>
          <span className="ml-auto flex flex-wrap items-center gap-2">
            <Compte n={g.enRetard} cle="enRetard" />
            <Compte n={g.proche} cle="proche" />
            <Compte n={g.lointain} cle="lointain" />
            <Compte n={g.faite} cle="faite" />
            <Compte n={g.aPlanifier} cle="aPlanifier" />
          </span>
          {/* La même pastille que les cartes-mois : collé aux pilules, le
              chevron se lisait comme une de plus. Détaché et cerclé, il
              redevient une commande. */}
          <span
            aria-hidden
            className="ml-1 flex size-8 flex-none items-center justify-center rounded-full border border-[color:rgba(10,10,10,.16)] text-[color:var(--board-ink)]"
          >
            <ChevronDown
              className={
                "size-4 transition-transform " + (ouvert ? "rotate-180" : "")
              }
            />
          </span>
        </button>
      </h3>

      {/* Le sol commun : ce qui fait le groupe, c'est le fond partagé par
          ses cartes. Un filet seul ne dirait que « ça commence ici »,
          jamais jusqu'où ça va — sur deux colonnes, la deuxième rangée se
          retrouvait orpheline de son titre. Gris neutre du board plutôt
          qu'ardoise : l'ardoise est bleutée, et le bleu est déjà pris par
          les bandeaux de carte et le creux des tiroirs. */}
      {ouvert ? (
        <div className="mt-4 rounded-[30px] bg-[color:var(--board-canvas)] px-5 py-8 ring-1 ring-[color:rgba(13,18,36,.06)]">
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
            {g.lignes.map((l) => (
              <CarteEquipement
                key={l.id}
                ligne={l}
                annee={annee}
                moisCourant={moisCourant}
                // Le groupe ouvert d'emblée l'est pour être lu : ses
                // cartes arrivent dépliées, sinon dérouler la catégorie
                // ne montre que des en-têtes de plus.
                ouverteParDefaut={ouvertParDefaut}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CarteEquipement({
  ligne: l,
  annee,
  moisCourant,
  ouverteParDefaut = false,
}: {
  ligne: LigneEquipement;
  annee: number;
  moisCourant: number;
  /** Vrai dans le groupe ouvert à l'arrivée. */
  ouverteParDefaut?: boolean;
}) {
  // Ailleurs, la carte arrive repliée : sur un parc de treize appareils,
  // treize cartes ouvertes font une page qu'on ne parcourt plus, on la
  // subit.
  const [ouverte, setOuverte] = useState(ouverteParDefaut);

  // Mois déplié, de 1 à 12. Un seul à la fois : la carte doit rester une
  // ligne de lecture, pas un second calendrier.
  //
  // Le mois courant est le mois visé par défaut — la question qu'on se
  // pose devant un appareil, c'est d'abord « et ce mois-ci ? » — mais
  // seulement s'il porte quelque chose : un mois vide ouvrirait un tiroir
  // sur rien, et la case surlignée annoncerait un contenu absent.
  const moisParDefaut = l.occurrences.some((o) => o.mois === moisCourant)
    ? moisCourant
    : null;
  const [moisOuvert, setMoisOuvert] = useState<number | null>(moisParDefaut);
  const details = l.occurrences.filter((o) => o.mois === moisOuvert);

  // Viser une case déplie la carte : le geste dit « montre-moi ce mois »,
  // il serait absurde qu'il faille l'ouvrir d'abord.
  const viserMois = (mois: number) => {
    setMoisOuvert((courant) => (courant === mois && ouverte ? null : mois));
    setOuverte(true);
  };

  return (
    // La carte se lit en deux zones : l'identité de l'appareil sur un
    // champ ardoise, la mesure sur le blanc. Le nom y prend sa propre
    // ligne — partagée avec la règle il perdait à chaque fois, alors
    // qu'il est ce qu'on cherche quand on parcourt douze cartes.
    <article
      // Cible du renvoi « Voir cet équipement au calendrier », posé depuis
      // sa fiche : sans ancre, le lien ouvrait la vue par équipement au
      // sommet, et il fallait retrouver l'appareil dans la page.
      id={`eq-${l.id}`}
      className="@container scroll-mt-8 overflow-hidden rounded-[30px] bg-[color:var(--board-card)] shadow-[0_1px_2px_rgba(13,18,36,.06),0_6px_16px_-6px_rgba(13,18,36,.14)] ring-1 ring-[color:rgba(13,18,36,.06)]"
    >
      {/* En se resserrant, l'en-tête s'empile : le nom, puis l'échéance
          et la porte sur une ligne. C'est la disposition en colonne, sans
          second composant à tenir. */}
      <header className="flex flex-col gap-3 border-b border-[color:var(--board-blue-soft)] bg-[color:var(--board-blue-pale)] px-6 py-4 @md:flex-row @md:items-center @md:gap-5">
        <h4 className="board-titre m-0 min-w-0 flex-1 truncate text-[19px]">
          {l.libelle}
        </h4>

        <div className="flex flex-none items-center justify-between gap-4 @md:justify-end">
          <div className="@md:text-right">
            <p className="m-0 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--board-blue-ink)]">
              Prochaine
            </p>
            <p
              className="m-0 mt-1 text-[14px] font-semibold"
              style={{
                color: l.prochaine?.etat
                  ? ENCRE_ETAT[l.prochaine.etat]
                  : "var(--board-slate-ink)",
              }}
            >
              {l.prochaine ? l.prochaine.libelle : "Rien de prévu"}
            </p>
          </div>
          {l.hrefFiche ? (
            <LienProvenance
              href={l.hrefFiche}
              aria-label={`Ouvrir ${l.libelle}`}
              className="flex size-[34px] flex-none items-center justify-center rounded-full bg-[color:var(--board-card)] text-[color:var(--board-ink)] shadow-[inset_0_0_0_1px_rgba(10,10,10,.14)] transition-colors hover:bg-[color:var(--board-slate-pale)]"
            >
              <ChevronRight className="size-4" />
            </LienProvenance>
          ) : null}
        </div>
      </header>

      <div className="px-7 pb-6 pt-[22px]">
        {/* La réduction de la règle : une case par mois, sur toute la
            largeur de la carte — douze cases coincées dans 600 px se
            lisaient mal. */}
        <div className="grid grid-cols-12 gap-1.5">
          {l.mois.map((etat, i) => {
            const mois = i + 1;
            const nb = l.occurrences.filter((o) => o.mois === mois).length;
            const ouvert = moisOuvert === mois;
            return (
              <button
                key={i}
                type="button"
                disabled={nb === 0}
                aria-expanded={nb > 0 ? ouvert : undefined}
                aria-label={`${MOIS_FR[i]} — ${
                  nb === 0
                    ? "aucune échéance"
                    : `${nb} échéance${nb > 1 ? "s" : ""}`
                }`}
                onClick={() => viserMois(mois)}
                className={
                  "h-[18px] rounded-[5px] transition-shadow " +
                  (nb === 0
                    ? "cursor-default"
                    : "cursor-pointer hover:shadow-[0_0_0_2px_var(--board-card),0_0_0_3px_rgba(10,10,10,.2)]") +
                  (ouvert
                    ? " shadow-[0_0_0_2px_var(--board-card),0_0_0_4px_var(--board-ink)]"
                    : "")
                }
                style={{
                  background: etat
                    ? CHAMP_ETAT[etat]
                    : "var(--board-slate-pale)",
                }}
              />
            );
          })}
        </div>

        {/* Le nom des mois n'a de sens qu'ouverte : repliée, la carte
            montre la forme de l'année, pas son détail. */}
        {ouverte ? (
          <div className="mt-2 grid grid-cols-12 gap-1.5 border-t border-[color:var(--board-slate-line)] pt-2">
            {MOIS_FR_COURT.map((m, i) => (
              <span
                key={m}
                className={
                  "text-center font-mono text-[10px] uppercase tracking-[0.06em] " +
                  (moisOuvert === i + 1
                    ? "font-semibold text-[color:var(--board-ink)]"
                    : l.mois[i]
                      ? "text-[color:var(--board-slate-ink)]"
                      : "text-[color:var(--board-slate)]")
                }
              >
                {m.slice(0, 1)}
              </span>
            ))}
          </div>
        ) : null}

        {/* Ce que porte l'appareil, dans les deux états : repliée, une
            carte qui ne dirait que « dépassée de 103 j » tairait qu'il y
            en a quatre. */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Compte n={l.enRetard} cle="enRetard" />
          <Compte n={l.proche} cle="proche" />
          <Compte n={l.lointain} cle="lointain" />
          <Compte n={l.faite} cle="faite" />
          <Compte n={l.aPlanifier} cle="aPlanifier" />
          {l.horsAnnee > 0 ? (
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[color:var(--board-slate-soft)]">
              +{l.horsAnnee} hors {annee}
            </span>
          ) : null}
        </div>

        {/* Le mois déplié, à sa place : sous l'appareil, pas ailleurs. */}
        {ouverte && moisOuvert && details.length > 0 ? (
          <div className="mt-[22px] rounded-[22px] bg-[color:var(--board-slate-pale)] px-4 py-4">
            <p className="m-0 mb-2 px-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--board-slate-mid)]">
              {MOIS_FR[moisOuvert - 1]} · {details.length} échéance
              {details.length > 1 ? "s" : ""}
            </p>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {details.map((o) => (
                <li key={o.id}>
                  <LienProvenance
                    href={o.href}
                    className="flex items-center gap-3.5 rounded-[16px] bg-[color:var(--board-card)] px-3.5 py-2.5 transition-opacity hover:opacity-85"
                  >
                    <span
                      className="flex size-[42px] flex-none flex-col items-center justify-center rounded-[14px]"
                      style={{
                        background: CHAMP_ETAT[o.etat],
                      }}
                    >
                      <span className="board-titre text-[15px] leading-none tabular-nums">
                        {o.jour}
                      </span>
                      <span className="mt-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.1em] text-[color:var(--board-slate-ink)]">
                        {o.moisCourt}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-[13.5px] font-semibold leading-[1.35] tracking-[-0.01em] text-[color:var(--board-ink)]">
                        {o.titre}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[color:var(--board-slate-mid)]">
                        <span className="min-w-0 truncate">{o.meta}</span>
                        {o.contractuelle && <MentionContractuelle />}
                      </span>
                    </span>
                    {o.statut ? (
                        <BadgeStatut statut={o.statut} />
                      ) : o.etat === "enRetard" ? (
                        <span className="inline-flex items-center whitespace-nowrap rounded-full bg-[color:var(--board-signal)] px-[13px] py-[6px] text-[12px] font-semibold text-[color:var(--board-signal-ink)]">
                          {libelleEtatCourtCapitale("enRetard")}
                        </span>
                      ) : null}
                  </LienProvenance>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* La commande de dépliage est en pied de carte, en toutes lettres :
          un chevron collé au titre laissait croire à une décoration, et
          rien ne disait ce qu'il y avait à voir de plus. */}
      <button
        type="button"
        onClick={() => setOuverte((o) => !o)}
        aria-expanded={ouverte}
        className="flex w-full items-center justify-center gap-2 border-t border-[color:var(--board-slate-line)] px-6 py-3 text-[12.5px] font-semibold text-[color:var(--board-slate-mid)] transition-colors hover:bg-[color:var(--board-slate-pale)] hover:text-[color:var(--board-ink)]"
      >
        {ouverte ? "Replier" : "Voir le détail du mois"}
        <ChevronDown
          aria-hidden
          className={
            "size-4 transition-transform " + (ouverte ? "rotate-180" : "")
          }
        />
      </button>
    </article>
  );
}

/**
 * Un compte et son mot.
 *
 * **`libelle` A DISPARU DE CETTE SIGNATURE, ET C'EST LE CORRECTIF.** Les dix
 * appels de ce fichier — cinq états × deux emplacements — écrivaient leur mot
 * à la main. Quatre coïncidaient encore avec `LIBELLE_ETAT` par habitude ; le
 * cinquième, `lointain`, ne coïncidait plus depuis que « à venir » a été
 * remplacé par « au-delà de 30 jours ». Sur `/calendrier?vue=equipement`, le
 * dirigeant lisait donc « 1 sous 30 j » et « 11 à venir » côte à côte — la
 * paire englobante exacte que le lot venait de supprimer ailleurs, intacte sur
 * l'écran où les deux comptes se lisent ENSEMBLE.
 *
 * Tant que le composant acceptait un mot, un appelant pouvait en écrire un.
 * Il n'en accepte plus : la clé d'état entre, `compteEtat` rend le mot ET son
 * accord. L'accord aussi était réécrit ici (`n > 1 && libelle.endsWith("e")`),
 * une seconde règle qui tombait juste par chance sur les cinq mots du jour.
 */
function Compte({ n, cle }: { n: number; cle: RegistreLigne }) {
  if (n === 0) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-[6px] text-[12px] font-semibold leading-none"
      style={{ background: CHAMP_ETAT[cle], color: ENCRE_ETAT[cle] }}
    >
      <span className="tabular-nums">{n}</span>
      {compteEtat(n, cle).replace(/^\d+\s/, "")}
    </span>
  );
}
