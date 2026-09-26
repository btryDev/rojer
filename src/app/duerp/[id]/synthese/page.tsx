import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { CarteMiseAJour } from "@/components/duerps/CarteMiseAJour";
import { CreerVersionForm } from "@/components/duerps/CreerVersionForm";
import { WizardSteps } from "@/components/duerps/WizardSteps";
import {
  activitesDuSecteur,
  lireReponsesActivites,
} from "@/lib/activites/reponses";
import { CHAMP_ETAT, ENCRE_ETAT } from "@/lib/calendrier/etats";
import { evaluerCouverture } from "@/lib/duerps/couverture";
import { construireEtapes } from "@/lib/duerps/etapes";
import { getDuerp } from "@/lib/duerps/queries";
import { construireSynthese } from "@/lib/duerps/synthese";
import { LABEL_TYPE_MESURE } from "@/lib/mesures/labels";
import {
  formaterDateCourteFr,
  formaterDateFr,
  formaterDateLongueFr,
  joursCivilsEntre,
} from "@/lib/dates";
import { evaluerEtatDuerp } from "@/lib/dashboard/duerp";
import { listerVersions } from "@/lib/versions/queries";
import type { TypeMesure } from "@/lib/referentiels/types";
import { L4121_2_8 } from "@/lib/verbatim/l4121-2-ordre";

function formatDate(d: Date | null) {
  if (!d) return "—";
  return formaterDateCourteFr(d);
}

export default async function SynthesePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const duerp = await getDuerp(id);
  if (!duerp) notFound();

  const unitesVisibles = duerp.unites.filter((u) => !u.estTransverse);
  const unitesOk = unitesVisibles.length > 0;
  const risquesOk =
    unitesOk && unitesVisibles.every((u) => u.risques.length > 0);
  const etapes = construireEtapes(id, "synthese", {
    secteurOk: Boolean(duerp.referentielSecteurId),
    unitesOk,
    risquesOk,
    transversesOk: duerp.transversesRepondues,
    activitesPosees: activitesDuSecteur(duerp.referentielSecteurId).length > 0,
  });

  const synthese = construireSynthese(duerp.unites);
  const versions = await listerVersions(id);

  // Périmètre du référentiel (ADR-020) : ce qui va être gravé se relit ici,
  // juste avant de figer une version — c'est le dernier écran où une réponse
  // peut encore être corrigée avant de partir dans un document conservé
  // quarante ans. Descriptif, sans verdict : ce n'est pas une alerte, et ça
  // ne rejoint donc pas « Points à vérifier ».
  // Le tri « déclarée / écartée / sans réponse » vient de `evaluerCouverture`,
  // seule autorité sur la question — l'écran ne le refait pas dans son coin.
  // Les unités hors référentiel qu'il rend aussi ne sont pas reprises ici :
  // elles se disent déjà à l'étape « Risques », et les additionner aux
  // activités mesurerait ce qui ne se mesure pas.
  const couverture = evaluerCouverture({
    secteurId: duerp.referentielSecteurId ?? "",
    reponses: lireReponsesActivites(duerp.reponsesActivitesNonCouvertes),
    unites: duerp.unites,
  });
  const perimetreDeclare = couverture.activitesDeclarees;
  const perimetreSansReponse = couverture.activitesSansReponse;
  // `listeInstruite` dit exactement ce que l'écran a besoin de savoir pour
  // décider d'ouvrir la section : le secteur porte-t-il des questions ? La
  // recalculer ici ferait un second juge sur la même question.
  const perimetreQuestionne = couverture.listeInstruite;

  // Rappel de mise à jour annuelle — art. R. 4121-2, 1° : obligatoire pour
  // les entreprises de 11 salariés et plus. On signale aussi le cas où aucune
  // version n'a jamais été validée (DUERP en cours de constitution).
  //
  // Ce bandeau ne sert que le 1° de l'article, et c'est normal : il porte un
  // RETARD, et le 1° est le seul des trois cas qui se date. Les 2° et 3°
  // s'énoncent plus bas, en registre neutre, sur la carte « Quand ce document
  // doit être mis à jour » — un rendez-vous manqué et une règle qui n'a pas
  // de rendez-vous ne se disent pas au même endroit ni de la même couleur.
  const derniereVersion = versions[0];
  // Page serveur : un rendu par requête, l'horloge peut être lue — une
  // seule fois, pour que l'ancienneté affichée et le verdict d'échéance
  // reposent sur le même instant.
  const aujourdhui = new Date();
  // Ancienneté en **jours civils** : la division de l'écart en
  // millisecondes par 86 400 000 perdait un jour à chaque passage à
  // l'heure d'hiver traversé.
  const joursDepuisDerniereVersion = derniereVersion
    ? joursCivilsEntre(derniereVersion.createdAt, aujourdhui)
    : null;
  // La règle de mise à jour annuelle (seuil d'effectif de l'art. R. 4121-2,
  // distinction « jamais validé » / « échéance dépassée », arithmétique en
  // années calendaires) vit dans `evaluerEtatDuerp` et NULLE PART AILLEURS.
  // Cette page la réécrivait en local avec un seuil d'effectif en dur : le
  // tableau de bord et le dossier DUERP se contredisaient sur le même
  // établissement, chacun appliquant sa propre variante.
  const etatDuerp = evaluerEtatDuerp(
    {
      ouvert: true,
      dateDerniereVersion: derniereVersion?.createdAt ?? null,
      effectif: duerp.entreprise.effectif,
    },
    aujourdhui,
  );
  const { majEchue, jamaisValide } = etatDuerp;
  // Deux situations, deux états — et pas le même. L'échéance annuelle
  // dépassée est un retard : le champ rose le dit. Un dossier dont aucune
  // version n'a jamais été figée n'a, lui, aucune échéance dépassée : c'est
  // l'absence de rendez-vous, donc l'ardoise (charte, interdits 3 et 4).
  // La table d'états est celle du calendrier, jamais une locale.
  const etatMaj = majEchue ? "enRetard" : "aPlanifier";

  return (
    <div className="flex flex-col gap-[22px]">
      <WizardSteps etapes={etapes} />

      {(majEchue || jamaisValide) && (
        <section
          role="alert"
          className="carte-board px-7 py-6 sm:px-8"
          style={{ background: CHAMP_ETAT[etatMaj] }}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p
              className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em]"
              style={{ color: ENCRE_ETAT[etatMaj] }}
            >
              {jamaisValide
                ? "Aucune version validée · art. R. 4121-1"
                : "Mise à jour requise · art. R. 4121-2"}
            </p>
            {/* L'effectif ne se montre que là où il décide de quelque
                chose — c'est-à-dire sur l'échéance annuelle du 1°. Sur un
                dossier jamais validé, l'obligation de transcrire ne connaît
                aucun seuil : afficher l'effectif à côté laissait entendre
                qu'il en existait un. */}
            {!jamaisValide && (
              <p
                className="board-eyebrow m-0 text-[10px] tracking-[0.16em] tabular-nums"
                style={{ color: ENCRE_ETAT[etatMaj] }}
              >
                Effectif {duerp.entreprise.effectif} salarié
                {duerp.entreprise.effectif > 1 ? "s" : ""}
              </p>
            )}
          </div>
          <p
            className="m-0 mt-2.5 max-w-[68ch] text-[13.5px] leading-[1.6]"
            style={{ color: ENCRE_ETAT[etatMaj] }}
          >
            {jamaisValide ? (
              <>
                Aucune version n&apos;a encore été validée pour ce DUERP.
                L&apos;art. R. 4121-1 impose de transcrire les résultats de
                l&apos;évaluation dans un document unique, sans condition
                d&apos;effectif — validez une première version dès que
                l&apos;évaluation est complète.
              </>
            ) : (
              <>
                La dernière version date de{" "}
                <span className="font-semibold tabular-nums">
                  {joursDepuisDerniereVersion} jours
                </span>
                . L&apos;art. R. 4121-2, 1°, prévoit une mise à jour « au moins
                chaque année dans les entreprises d&apos;au moins onze salariés ». Créez une
                nouvelle version pour figer l&apos;état à jour.
              </>
            )}
          </p>
        </section>
      )}

      {/* Couverture du dossier */}
      <section className="carte-board px-7 py-6 sm:px-8">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          Dossier DUERP
        </p>
        <h2 className="board-titre m-0 mt-2 text-[clamp(29px,3vw,39px)]">
          Synthèse générale
        </h2>
        <p className="m-0 mt-3 max-w-[62ch] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Vue d&apos;ensemble de votre évaluation et plan d&apos;actions
          priorisé. Chaque validation fige un exemplaire consultable et
          téléchargeable.
        </p>

        <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-[color:var(--board-slate-line)] pt-6 sm:grid-cols-4">
          <Stat libelle="Unités" valeur={synthese.nbUnites} />
          <Stat libelle="Risques" valeur={synthese.nbRisques} />
          <Stat
            libelle="Mesures en place"
            valeur={synthese.nbMesuresExistantes}
          />
          <Stat
            libelle="Actions prévues"
            valeur={synthese.nbMesuresPrevues}
          />
        </div>
      </section>

      {(synthese.nbRisquesNonCotes > 0 ||
        synthese.nbAlertesSousCotation > 0 ||
        synthese.nbAlertesHierarchie > 0) && (
        <section className="carte-board px-7 py-6 sm:px-8">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
            Points à vérifier
          </p>
          <ul className="m-0 mt-3 list-none p-0">
            {synthese.nbRisquesNonCotes > 0 && (
              <AlerteItem
                intitule={`${synthese.nbRisquesNonCotes} risque${
                  synthese.nbRisquesNonCotes > 1 ? "s" : ""
                } non coté${synthese.nbRisquesNonCotes > 1 ? "s" : ""}`}
                detail="Terminez la cotation avant de figer une version."
                ton="neutre"
              />
            )}
            {synthese.nbAlertesSousCotation > 0 && (
              <AlerteItem
                intitule={`${synthese.nbAlertesSousCotation} risque${
                  synthese.nbAlertesSousCotation > 1 ? "s" : ""
                } avec une gravité ou une probabilité en dessous du repère par défaut`}
                detail="Repère indicatif (sans valeur réglementaire) — à vérifier ou justifier si votre situation le permet."
                ton="alerte"
              />
            )}
            {synthese.nbAlertesHierarchie > 0 && (
              <AlerteItem
                intitule={`${synthese.nbAlertesHierarchie} risque${
                  synthese.nbAlertesHierarchie > 1 ? "s" : ""
                } traité${synthese.nbAlertesHierarchie > 1 ? "s" : ""} uniquement par EPI / formation`}
                detail={`Art. L. 4121-2, 8° : « ${L4121_2_8} ».`}
                ton="alerte"
              />
            )}
          </ul>
        </section>
      )}

      <section className="carte-board px-7 py-6 sm:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div className="min-w-0">
            <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
              Inventaire priorisé
            </p>
            <h3 className="board-titre m-0 mt-1.5 text-[22px]">
              Risques classés par criticité
            </h3>
          </div>
          <p className="m-0 text-[12.5px] text-[color:var(--board-slate-mid)]">
            Tri : criticité décroissante · gravité en départage
          </p>
        </div>

        {synthese.lignes.length === 0 ? (
          <p className="m-0 mt-5 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
            Aucun risque n&apos;a encore été ajouté.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-[13.5px]">
              <caption className="sr-only">
                Risques retenus, criticité décroissante, gravité en départage.
              </caption>
              <thead>
                <tr className="border-b border-[color:var(--board-slate-line)] text-left">
                  <th scope="col" className={TH}>
                    Criticité
                  </th>
                  <th scope="col" className={TH}>
                    Risque
                  </th>
                  <th scope="col" className={TH}>
                    Unité
                  </th>
                  <th scope="col" className={TH}>
                    G × P / M
                  </th>
                  <th scope="col" className={TH}>
                    Mesures
                  </th>
                  <th scope="col" className={TH}>
                    <span className="sr-only">Ouvrir</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {synthese.lignes.map((l) => (
                  <tr
                    key={l.risqueId}
                    className="border-b border-[color:var(--board-slate-line)] align-top last:border-b-0"
                  >
                    {/* La criticité ne prend aucune couleur, et c'est
                        délibéré. Elle était rendue par un dégradé de quatre
                        bandes (minium / seal / jaune / émeraude) : la charte
                        board n'a pas de barème de cotation, et ses cinq
                        couples champ/encre sont tous pris par les états
                        d'échéance (`CHAMP_ETAT`). Un risque coté 14 peint en
                        `--board-signal` se lirait « en retard » à quelques
                        centimètres du plan d'actions, qui porte de vraies
                        échéances. La couleur dit l'état, pas la grandeur
                        (interdit 2) ; ici le nombre sur 16 et le tri
                        décroissant portent l'information, plus précisément
                        que quatre bandes. */}
                    <td className={TD}>
                      <span className="pastille-board bg-[color:var(--board-slate-pale)] font-mono text-[12px] tabular-nums text-[color:var(--board-slate-ink)]">
                        {l.cotationSaisie ? `${l.criticite}/16` : "n.c."}
                      </span>
                    </td>
                    <td className={TD}>
                      <span className="font-medium text-[color:var(--board-ink)]">
                        {l.libelle}
                      </span>
                      {(l.alerteSousCotation || l.alerteHierarchieBasse) && (
                        <span className="mt-0.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-[color:var(--board-signal-ink)]">
                          {l.alerteSousCotation && "⚑ Sous-cotation"}
                          {l.alerteSousCotation && l.alerteHierarchieBasse && " · "}
                          {l.alerteHierarchieBasse && "⚑ EPI seuls"}
                        </span>
                      )}
                    </td>
                    <td className={TD}>
                      {l.uniteNom}
                      {l.estTransverse && (
                        <span className="ml-1 text-[color:var(--board-slate-soft)]">
                          (transv.)
                        </span>
                      )}
                    </td>
                    <td className={`${TD} font-mono tabular-nums`}>
                      {l.gravite} × {l.probabilite} / {l.maitrise}
                    </td>
                    <td className={`${TD} tabular-nums`}>
                      {l.nombreMesures}
                      {l.nombreMesuresPrevues > 0 && (
                        <span className="text-[12.5px]">
                          {" "}
                          ({l.nombreMesuresPrevues} prév.)
                        </span>
                      )}
                    </td>
                    <td className={TD}>
                      <Link
                        href={`/duerp/${id}/risques/${l.uniteId}/${l.risqueId}`}
                        className="font-medium text-[color:var(--board-blue-ink)] hover:underline"
                      >
                        ouvrir →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="carte-board px-7 py-6 sm:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div className="min-w-0">
            <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
              Plan d&apos;actions
            </p>
            <h3 className="board-titre m-0 mt-1.5 text-[22px]">
              Mesures à mettre en œuvre
            </h3>
          </div>
          <p className="m-0 text-[12.5px] text-[color:var(--board-slate-mid)]">
            Tri : échéance croissante · criticité en départage
          </p>
        </div>
        {synthese.actionsPrevues.length === 0 ? (
          <p className="m-0 mt-5 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
            Aucune action planifiée pour le moment. Ajoutez des mesures
            « prévues » sur vos risques.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[42rem] border-collapse text-[13.5px]">
              <caption className="sr-only">
                Mesures prévues, échéance croissante, criticité en départage.
              </caption>
              <thead>
                <tr className="border-b border-[color:var(--board-slate-line)] text-left">
                  <th scope="col" className={TH}>
                    Échéance
                  </th>
                  <th scope="col" className={TH}>
                    Action
                  </th>
                  <th scope="col" className={TH}>
                    Type
                  </th>
                  <th scope="col" className={TH}>
                    Risque · Unité
                  </th>
                  <th scope="col" className={TH}>
                    Responsable
                  </th>
                </tr>
              </thead>
              <tbody>
                {synthese.actionsPrevues.map((a) => (
                  <tr
                    key={a.mesureId}
                    className="border-b border-[color:var(--board-slate-line)] align-top last:border-b-0"
                  >
                    <td className={`${TD} font-mono tabular-nums`}>
                      {formatDate(a.echeance)}
                    </td>
                    <td className={`${TD} text-[color:var(--board-ink)]`}>
                      {a.libelleMesure}
                    </td>
                    <td className={TD}>
                      {LABEL_TYPE_MESURE[a.type as TypeMesure] ?? a.type}
                    </td>
                    <td className={TD}>
                      {a.libelleRisque}
                      {/* L'unité se range sous le risque : une colonne de
                          plus se paierait en largeur sur tous les écrans
                          étroits (charte § 5, tableau dense). */}
                      <span className="mt-0.5 block text-[11px] text-[color:var(--board-slate-soft)]">
                        {a.uniteNom}
                      </span>
                    </td>
                    <td className={TD}>{a.responsable ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {perimetreQuestionne && (
        <section className="carte-board px-7 py-6 sm:px-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="min-w-0">
              <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
                Périmètre du référentiel
              </p>
              <h3 className="board-titre m-0 mt-1.5 text-[22px]">
                Ce que le document ne traite pas
              </h3>
            </div>
            <Link
              href={`/duerp/${id}/activites`}
              className="text-[12.5px] font-medium text-[color:var(--board-blue-ink)] hover:underline"
            >
              revoir les réponses →
            </Link>
          </div>
          <div className="mt-4">
            {perimetreDeclare.length === 0 ? (
              // Deux dossiers sans activité déclarée ne disent pas la même
              // chose : celui qui a répondu « non » partout a tranché, celui
              // qui n'a rien répondu n'a rien tranché. Une seule phrase pour
              // les deux se lisait comme un feu vert juste avant de valider —
              // c'est le défaut déjà corrigé côté document
              // (`mentionSansReponseIsolee`), qui n'avait pas été transposé à
              // l'écran.
              couverture.etat === "aucun_manque_identifie" ? (
                <p className="m-0 max-w-[66ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                  Vous avez répondu «&nbsp;non&nbsp;» à{" "}
                  {couverture.activitesEcartees.length > 1
                    ? `chacune des ${couverture.activitesEcartees.length} questions`
                    : "la question"}{" "}
                  de périmètre. Aucune activité hors référentiel n&apos;a été
                  déclarée.
                </p>
              ) : (
                <p className="m-0 max-w-[66ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                  Aucune activité hors référentiel n&apos;a été déclarée, et{" "}
                  {perimetreSansReponse.length > 1
                    ? `${perimetreSansReponse.length} questions de périmètre n'ont pas été tranchées`
                    : "une question de périmètre n'a pas été tranchée"}
                  . Une question sans réponse n&apos;est pas un
                  «&nbsp;non&nbsp;».
                </p>
              )
            ) : (
              <>
                <p className="m-0 max-w-[66ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                  Vous avez déclaré exercer {perimetreDeclare.length} activité
                  {perimetreDeclare.length > 1 ? "s" : ""}{" "}
                  que le référentiel
                  sectoriel ne couvre pas. Le DUERP généré les nomme et précise
                  ce qu&apos;il ne traite pas à leur sujet.
                </p>
                <ul className="m-0 mt-4 list-none p-0">
                  {perimetreDeclare.map((a) => (
                    <li
                      key={a.id}
                      className="border-t border-[color:var(--board-slate-line)] py-3"
                    >
                      <p className="m-0 text-[14px] font-medium leading-[1.45] text-[color:var(--board-ink)]">
                        {a.libelle}
                      </p>
                      <p className="m-0 mt-1 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                        {a.cequiManque}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {perimetreSansReponse.length > 0 && perimetreDeclare.length > 0 && (
              <p className="m-0 mt-4 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                {perimetreSansReponse.length} question
                {perimetreSansReponse.length > 1 ? "s" : ""} sur le périmètre
                {perimetreSansReponse.length > 1 ? " restent" : " reste"}{" "}
                sans
                réponse. Une version validée maintenant l&apos;indiquera comme
                telle&nbsp;: elle n&apos;affirmera ni que ces activités sont
                exercées, ni qu&apos;elles ne le sont pas.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Les trois cas de mise à jour de l'art. R. 4121-2 — l'argument de la
          carte est dans le composant. Sa PLACE se décide ici, et elle se
          justifie : elle répond à « quand dois-je refaire ce document ? », et
          le geste qui y répond est juste en dessous — le formulaire de
          nouvelle version, dont les motifs sont ces trois mêmes cas
          (`lib/versions/motifs.ts`). L'énoncé et le geste se lisent d'un seul
          regard, au lieu que l'un ouvre la page et l'autre la ferme. */}
      <CarteMiseAJour effectif={duerp.entreprise.effectif} />

      <section className="carte-board px-7 py-6 sm:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
              Versions figées
            </p>
            <h3 className="board-titre m-0 mt-1.5 text-[22px]">
              Historique du dossier
            </h3>
          </div>
          <a
            href={`/duerp/${id}/pdf/preview`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "boardClair", size: "boardSm" })}
          >
            Aperçu PDF brouillon ↗
          </a>
        </div>
        <p className="m-0 mt-3 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          L&apos;aperçu télécharge un PDF estampillé{" "}
          <span className="font-semibold">« Document non validé »</span> sur
          chaque page, sans créer de version. Pour un PDF officiel consultable
          et archivé, validez une version ci-dessous.
        </p>
        {versions.length === 0 ? (
          <p className="m-0 mt-4 max-w-[66ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
            Aucune version validée pour l&apos;instant. L&apos;aperçu
            ci-dessus vous permet toutefois de vérifier le rendu avant de
            figer une version.
          </p>
        ) : (
          <ul className="m-0 mt-4 list-none p-0">
            {versions.map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--board-slate-line)] py-3.5"
              >
                <div className="flex min-w-0 items-baseline gap-4">
                  <span className="font-mono text-[18px] tabular-nums text-[color:var(--board-slate-soft)]">
                    v{v.numero}
                  </span>
                  <div className="min-w-0">
                    <p className="m-0 text-[14px] leading-[1.45] text-[color:var(--board-ink)]">
                      {formaterDateLongueFr(v.createdAt)}
                    </p>
                    {v.motif && (
                      <p className="m-0 mt-0.5 text-[12.5px] text-[color:var(--board-slate-mid)]">
                        « {v.motif} »
                      </p>
                    )}
                  </div>
                </div>
                <a
                  href={`/duerp/${id}/versions/${v.numero}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({
                    variant: "boardClair",
                    size: "boardSm",
                  })}
                >
                  Télécharger le PDF
                </a>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6">
          <CreerVersionForm
            duerpId={id}
            aucunRisqueNonCote={synthese.nbRisquesNonCotes === 0}
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--board-slate-line)] pt-6">
        <Link
          href={`/duerp/${id}/transverses`}
          className={buttonVariants({ variant: "boardClair", size: "board" })}
        >
          ← Étape précédente
        </Link>
        <p className="m-0 text-[12.5px] text-[color:var(--board-slate-mid)]">
          Fait à {formaterDateFr(aujourdhui)}
        </p>
      </div>
    </div>
  );
}

// Le patron de tableau dense de la charte (§ 5), relevé sur
// `registre/FicheJournal`. Deux tableaux le portent ici, et il tenait à
// une dizaine d'utilitaires : les nommer une fois évite qu'ils divergent
// d'un tableau à l'autre sur le même écran.
const TH =
  "board-eyebrow py-2 pr-4 text-[9.5px] font-semibold tracking-[0.12em] text-[color:var(--board-slate-soft)] last:pr-0";
const TD =
  "py-2.5 pr-4 leading-[1.55] text-[color:var(--board-slate-ink)] last:pr-0";

function Stat({ libelle, valeur }: { libelle: string; valeur: number }) {
  return (
    <div>
      <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
        {libelle}
      </p>
      <p className="m-0 mt-1.5 font-mono text-[30px] tabular-nums leading-none tracking-[-0.02em] text-[color:var(--board-ink)]">
        {valeur}
      </p>
    </div>
  );
}

/**
 * Une ligne de « Points à vérifier ».
 *
 * Le ton « alerte » porte l'encre de signal — un écart relevé, pas un
 * verdict. Il ne prend pas le champ rose : rien ici n'a d'échéance
 * dépassée (charte, interdit 3), et le champ est réservé aux états du
 * calendrier. Le glyphe ne porte jamais seul : le mot le suit
 * (interdit 10).
 */
function AlerteItem({
  intitule,
  detail,
  ton,
}: {
  intitule: string;
  detail: string;
  ton: "alerte" | "neutre";
}) {
  const encre =
    ton === "alerte"
      ? "text-[color:var(--board-signal-ink)]"
      : "text-[color:var(--board-slate-soft)]";
  return (
    <li className="flex items-start gap-3.5 border-t border-[color:var(--board-slate-line)] py-3">
      <span aria-hidden className={`mt-0.5 font-mono text-[12.5px] ${encre}`}>
        {ton === "alerte" ? "⚑" : "·"}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`m-0 text-[14px] font-medium leading-[1.45] ${
            ton === "alerte"
              ? "text-[color:var(--board-signal-ink)]"
              : "text-[color:var(--board-ink)]"
          }`}
        >
          {intitule}
        </p>
        <p className="m-0 mt-1 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          {detail}
        </p>
      </div>
    </li>
  );
}
