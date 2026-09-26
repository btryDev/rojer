import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { LignePlanActions } from "./PlanActionsDocument";
import type { LigneRapport, LigneVerif } from "./RegistreDocument";
import { LABEL_STATUT_ACTION, LABEL_TYPE_ACTION } from "@/lib/actions/labels";
import { LABEL_RESULTAT } from "@/lib/rapports/schema";
import { LABEL_DOMAINE } from "@/lib/calendrier/labels";
import { MARQUAGE_CONTRACTUEL } from "@/lib/prescriptions/sources";
import { LIBELLE_SANS_ECHEANCE } from "@/lib/calendrier/etats";
import {
  BOARD,
  formatDateCourte,
  formatDateLongue,
  stylesCommuns as s,
} from "./styles";
import type { Score } from "@/lib/dashboard/score";
import {
  faitInventaire,
  type CouvertureEtablissement,
} from "@/lib/perimetre/couverture";
import { blocsPerimetre, chapeauPerimetre } from "./mentions-perimetre";
import {
  referencesRegistreDossier,
  type RegimeDuRegistre,
} from "./mentions-registre";
import {
  phraseIndetermines,
  type BlocEtatsPermanents,
  type LigneEtatPermanentPdf,
} from "./mentions-etats-permanents";

export type DossierData = {
  entreprise: string;
  siret: string | null;
  etablissement: string;
  adresse: string;
  effectifSurSite: number;
  codeNaf: string | null;
  regimesTexte: string; // ex: "Établissement de travail, ERP type N cat. 5"
  /** Les deux régimes qui décident des articles du registre cités en
   *  mentions légales (`mentions-registre.ts`). Requis : `regimesTexte` est
   *  une phrase, et une référence conditionnée à une phrase se casserait au
   *  premier changement de libellé. */
  regime: RegimeDuRegistre;
  genereLe: Date;
  /**
   * Ce que le référentiel ne traite pas pour cet établissement, sur ses six
   * axes. `null` seulement si la couverture n'a pas pu être lue — auquel cas
   * le document reste muet plutôt que de rassurer.
   */
  couverture: CouvertureEtablissement | null;
  /**
   * Ce qu'il faut savoir de l'âge du calendrier, ou `null` s'il est à jour.
   *
   * REQUIS, comme `etatsPermanents` et pour la même raison : optionnel, il
   * serait resté vide. Ce document a imprimé des compteurs d'échéances pendant
   * tout le temps où personne n'avait à se demander d'où elles venaient — et
   * un dossier dont le calendrier n'a jamais été calculé y sortait « 0 en
   * retard », ce qui se lit comme une bonne nouvelle.
   */
  avertissementCalendrier: string | null;

  score: Score;
  /**
   * Ce que l'employeur a déclaré en place, et ce qu'il n'a pas déclaré.
   *
   * **Requis, et pour la même raison que `etatsPermanents` l'est au score.**
   * Un champ optionnel serait resté vide : ce document n'a rien porté de ces
   * trente obligations pendant tout le temps où personne n'avait à y penser.
   * Le compilateur impose désormais que le builder réponde.
   */
  etatsPermanents: BlocEtatsPermanents;
  duerp:
    | {
        duerpId: string;
        numeroDerniereVersion: number | null;
        dateDerniereVersion: Date | null;
        nombreUnites: number;
        nombreRisques: number;
        criticiteMax: number | null;
      }
    | null;
  compteurs: {
    verifsEnRetard: number;
    verifsPlanifiees: number;
    verifsRealisees12m: number;
    actionsOuvertes: number;
    actionsEnRetard: number;
  };
  rapportsRecents: LigneRapport[]; // 10 plus récents
  verifsEnRetard: LigneVerif[]; // toutes
  actionsEnCours: LignePlanActions[]; // toutes
};

/**
 * L'encre du niveau, **par table plutôt que par chaîne de ternaires**.
 *
 * Elle était écrite `satisfaisante ? vert : a_surveiller ? ambre : signal`,
 * donc avec un défaut par épuisement. Le niveau `indetermine`, ajouté au score
 * le 2026-09-01, y tombait dans l'encre de « Rattrapage nécessaire » : la page
 * de garde du dossier remis à un inspecteur imprimait « 100/100 » en rouge à
 * côté de « Reste à renseigner », sans que rien n'échoue. Le même défaut avait
 * été corrigé le jour même sur la pastille du tableau de bord, et il était
 * resté ici — c'est le mode de propagation de cette famille : la correction
 * suit le fichier qu'on avait ouvert.
 *
 * La table est indexée par `Score["niveau"]` : un niveau neuf ne compile plus
 * tant qu'il n'a pas sa ligne.
 *
 * L'ardoise pour l'indétermination, et c'est un choix : le vert dirait « tout
 * va bien », le signal dirait « il y a un problème », et le produit ne sait ni
 * l'un ni l'autre.
 */
const ENCRE_PAR_NIVEAU: Record<Score["niveau"], string> = {
  satisfaisante: BOARD.vertEncre,
  a_surveiller: BOARD.ambreEncre,
  rattrapage: BOARD.signalEncre,
  indetermine: BOARD.ardoiseEncre,
};

function ScoreLigne({ score }: { score: Score }) {
  const couleur = ENCRE_PAR_NIVEAU[score.niveau];
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginTop: 6,
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontFamily: "Helvetica-Bold",
          color: couleur,
        }}
      >
        {score.valeur}/100
      </Text>
      <Text style={{ fontSize: 11, color: couleur }}>{score.libelle}</Text>
    </View>
  );
}

/**
 * Les deux sections d'états permanents s'impriment avec le même tableau.
 *
 * Un second tableau écrit à côté aurait donné deux mises en page pour un même
 * objet — et c'est la moitié « mise en page » de la règle que ce module suit
 * déjà pour la moitié « règle » : partage la règle, partage la forme, ne
 * partage pas la décision.
 */
function TableauEtats({ lignes }: { lignes: LigneEtatPermanentPdf[] }) {
  return (
    <View>
      <View style={s.thead}>
        <Text style={[s.th, { width: "40%" }]}>Obligation</Text>
        <Text style={[s.th, { width: "18%" }]}>Domaine</Text>
        <Text style={[s.th, { width: "20%" }]}>Écrit attendu</Text>
        <Text style={[s.th, { width: "22%" }]}>Déclaration de l&apos;employeur</Text>
      </View>
      {lignes.map((l, i) => (
        <View key={i} style={s.row} wrap={false}>
          <Text style={[s.td, { width: "40%", paddingRight: 4 }]}>
            {l.libelle}
          </Text>
          <Text style={[s.td, { width: "18%" }]}>{l.domaine}</Text>
          <Text style={[s.td, { width: "20%", paddingRight: 4 }]}>
            {l.ecritAttendu ?? "—"}
          </Text>
          <Text style={[s.td, { width: "22%" }]}>{l.declaration}</Text>
        </View>
      ))}
    </View>
  );
}

/** L'encadré de la page de garde, lu avant le score. */
function EncadreALire({
  titre,
  texte,
  marge = 40,
}: {
  titre: string;
  texte: string;
  /** L'écart au bloc précédent : 40 sous l'identité, moins entre deux
   *  encadrés, qui se lisent d'un même mouvement. */
  marge?: number;
}) {
  return (
    <View
      style={{
        marginTop: marge,
        padding: 12,
        borderWidth: 1,
        borderColor: BOARD.ardoiseMoyenne,
        maxWidth: 420,
      }}
    >
      <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 4 }}>
        {titre}
      </Text>
      <Text style={{ fontSize: 9, color: BOARD.ardoiseMoyenne }}>{texte}</Text>
    </View>
  );
}

export function DossierConformiteDocument({ data }: { data: DossierData }) {
  // Muet si la couverture n'a pas pu être lue : un document qui ne sait pas
  // ce qu'il ignore ne doit pas écrire qu'il n'ignore rien.
  const chapeau = data.couverture ? chapeauPerimetre(data.couverture) : null;
  const blocs = data.couverture ? blocsPerimetre(data.couverture) : [];
  const inventaire = data.couverture ? faitInventaire(data.couverture) : null;

  return (
    <Document>
      {/* Page de garde */}
      <Page size="A4" style={s.pageGarde}>
        <View>
          <Text style={{ fontSize: 10, color: BOARD.ardoiseMoyenne }}>
            Dossier de conformité santé-sécurité
          </Text>
          <Text
            style={{
              fontSize: 28,
              fontFamily: "Helvetica-Bold",
              marginTop: 8,
            }}
          >
            {data.etablissement}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: BOARD.ardoiseMoyenne,
              marginTop: 6,
            }}
          >
            {data.entreprise}
            {data.siret ? ` · SIRET ${data.siret}` : ""}
          </Text>
        </View>

        <View style={{ marginTop: 60 }}>
          <Text style={s.metaLigne}>Adresse : {data.adresse}</Text>
          <Text style={s.metaLigne}>
            Effectif sur site : {data.effectifSurSite} salarié
            {data.effectifSurSite > 1 ? "s" : ""}
          </Text>
          {data.codeNaf && (
            <Text style={s.metaLigne}>Code NAF : {data.codeNaf}</Text>
          )}
          <Text style={s.metaLigne}>Régimes : {data.regimesTexte}</Text>
          <Text style={s.metaLigne}>
            Document édité le {formatDateLongue(data.genereLe)}
          </Text>
        </View>

        {/* AVANT LE SCORE, et c'est l'ordre qui compte : le score se calcule
            sur ce que la base porte, donc sur un calendrier dont on ne sait
            rien tant que cette phrase n'est pas lue. L'imprimer après
            laisserait un lecteur conclure sur un chiffre qu'il n'aurait pas
            encore de raison de relativiser. */}
        {data.avertissementCalendrier && (
          <EncadreALire
            titre="À lire avant ce qui suit"
            texte={data.avertissementCalendrier}
          />
        )}

        {/* LE MÊME ENDROIT, POUR LE MÊME MOTIF (`docs/chantiers-ouverts.md`
            § 15). Un dossier sans équipement déclaré sort des listes
            d'échéances vides et un score — un vide qui se lit comme une
            réponse. Le fait vient avant, énoncé comme un fait : ni score, ni
            verdict. Il figure aussi, avec les autres, sous « Ce que ce dossier
            ne couvre pas » ; ici, il est lu avant le chiffre. */}
        {inventaire && (
          <EncadreALire
            titre={inventaire.motif}
            texte={inventaire.consequence}
            marge={data.avertissementCalendrier ? 10 : 40}
          />
        )}

        <View style={{ marginTop: 60 }}>
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold" }}>
            Score de conformité (indicateur interne)
          </Text>
          <ScoreLigne score={data.score} />
          {/* Sans cette ligne, la page de garde imprimait « 100/100 · Reste à
              renseigner » sans que rien n'explique ce qui reste. `score.ts`
              rend `indetermines` à part de la valeur « pour que l'interface le
              dise à tous les niveaux » : ce document est une interface, et il
              ne le disait pas. */}
          {phraseIndetermines(data.score.indetermines) && (
            <Text
              style={{
                fontSize: 9,
                color: BOARD.ardoiseMoyenne,
                marginTop: 8,
                maxWidth: 380,
              }}
            >
              {phraseIndetermines(data.score.indetermines)}
            </Text>
          )}
        </View>

        <View style={{ position: "absolute", bottom: 60, left: 60, right: 60 }}>
          <Text style={{ fontSize: 9, color: BOARD.ardoiseMoyenne }}>
            Ce dossier synthétise l&apos;état des obligations santé-sécurité à
            la date d&apos;édition. Les rapports de vérification, le DUERP
            versionné et le plan d&apos;actions sont consultables
            individuellement. Document interne, ne vaut pas certification
            réglementaire.
          </Text>
        </View>
      </Page>

      {/* Synthèse */}
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Synthèse</Text>

        <View style={{ marginTop: 8 }}>
          <Text style={s.h2}>État du DUERP</Text>
          {data.duerp === null ? (
            <Text style={s.small}>
              Aucun DUERP initié pour cet établissement.
            </Text>
          ) : data.duerp.numeroDerniereVersion === null ? (
            <Text style={s.small}>
              DUERP en cours de rédaction — aucune version encore validée.
            </Text>
          ) : (
            <View>
              <Text>
                Dernière version validée : v
                {data.duerp.numeroDerniereVersion}, le{" "}
                {formatDateCourte(data.duerp.dateDerniereVersion)}
              </Text>
              <Text style={[s.small, { marginTop: 2 }]}>
                {data.duerp.nombreUnites} unité
                {data.duerp.nombreUnites > 1 ? "s" : ""} de travail ·{" "}
                {data.duerp.nombreRisques} risque
                {data.duerp.nombreRisques > 1 ? "s" : ""} identifié
                {data.duerp.nombreRisques > 1 ? "s" : ""}
                {data.duerp.criticiteMax !== null
                  ? ` · criticité max ${data.duerp.criticiteMax}`
                  : ""}
              </Text>
            </View>
          )}
        </View>

        <View>
          <Text style={s.h2}>Vérifications et actions</Text>
          <View style={{ flexDirection: "row", gap: 16 }}>
            <View>
              <Text style={s.small}>Vérifs en retard</Text>
              <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold" }}>
                {data.compteurs.verifsEnRetard}
              </Text>
            </View>
            <View>
              <Text style={s.small}>Planifiées</Text>
              <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold" }}>
                {data.compteurs.verifsPlanifiees}
              </Text>
            </View>
            <View>
              <Text style={s.small}>Réalisées (12 mois)</Text>
              <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold" }}>
                {data.compteurs.verifsRealisees12m}
              </Text>
            </View>
            <View>
              <Text style={s.small}>Actions ouvertes</Text>
              <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold" }}>
                {data.compteurs.actionsOuvertes}
              </Text>
            </View>
            <View>
              <Text style={s.small}>Actions en retard</Text>
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Helvetica-Bold",
                  color:
                    data.compteurs.actionsEnRetard > 0 ? BOARD.signalEncre : undefined,
                }}
              >
                {data.compteurs.actionsEnRetard}
              </Text>
            </View>
          </View>
        </View>

        <Text
          style={s.footer}
          render={({ pageNumber, totalPages }) =>
            `Dossier de conformité — ${data.etablissement} — page ${pageNumber}/${totalPages}`
          }
          fixed
        />
      </Page>

      {/* Ce qui doit être en place — déclarations de l'employeur.

          Placée ici, juste après la synthèse et AVANT les pages de retards :
          ces obligations décrivent l'état permanent de l'établissement, pas ce
          qui est en souffrance. Reléguée en fin de document, la section aurait
          rejoint « le pied de page, là où l'on arrive après avoir tout coché »
          — la leçon du contrôle visuel du 2026-08-31, qui vaut pour un
          inspecteur autant que pour un dirigeant.

          Aucune phrase n'est décidée ici : elles viennent toutes de
          `mentions-etats-permanents.ts`, où elles se testent. */}
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Ce qui doit être en place</Text>

        {data.etatsPermanents.vide ? (
          <Text style={[s.small, { marginTop: 12, maxWidth: 460 }]}>
            {data.etatsPermanents.vide}
          </Text>
        ) : (
          <View>
            <Text style={[s.small, { marginTop: 4, maxWidth: 460 }]}>
              {data.etatsPermanents.chapeau}
            </Text>
            {data.etatsPermanents.compteur && (
              <Text style={{ marginTop: 10, fontFamily: "Helvetica-Bold" }}>
                {data.etatsPermanents.compteur}
              </Text>
            )}

            {data.etatsPermanents.etats.length > 0 && (
              <TableauEtats lignes={data.etatsPermanents.etats} />
            )}

            {/* Le second verbe garde sa propre section, et son explication vit
                à côté de ses lignes. Les deux verbes mêlés sous deux pastilles
                identiques sont le défaut que l'écran a corrigé le
                2026-08-31 ; les remêler à l'impression le referait. */}
            {data.etatsPermanents.faits.length > 0 && (
              <View>
                <Text style={s.h2}>Ce qui revient, sans rythme écrit</Text>
                {data.etatsPermanents.noteFaits && (
                  <Text style={[s.small, { maxWidth: 460 }]}>
                    {data.etatsPermanents.noteFaits}
                  </Text>
                )}
                <TableauEtats lignes={data.etatsPermanents.faits} />
              </View>
            )}
          </View>
        )}

        <Text
          style={s.footer}
          render={({ pageNumber, totalPages }) =>
            `Dossier de conformité — ${data.etablissement} — page ${pageNumber}/${totalPages}`
          }
          fixed
        />
      </Page>

      {/* Vérifs en retard */}
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Vérifications à rattraper</Text>
        <Text style={s.small}>
          Occurrences dépassées ou à planifier à la date d&apos;édition.
        </Text>

        {data.verifsEnRetard.length === 0 ? (
          <Text style={[s.small, { marginTop: 12 }]}>
            Aucune vérification en retard.
          </Text>
        ) : (
          <View>
            <View style={s.thead}>
              <Text style={[s.th, { width: "14%" }]}>Échéance</Text>
              <Text style={[s.th, { width: "46%" }]}>Obligation</Text>
              <Text style={[s.th, { width: "26%" }]}>Équipement</Text>
              <Text style={[s.th, { width: "14%" }]}>Domaine</Text>
            </View>
            {data.verifsEnRetard.map((v) => (
              <View key={v.id} style={s.row} wrap={false}>
                <Text style={[s.td, { width: "14%" }]}>
                  {/* Une date de génération n'est pas une échéance manquée :
                      l'imprimer ici dirait l'âge du dossier à un assureur. */}
                  {v.echeanceConnue ? formatDateCourte(v.datePrevue) : LIBELLE_SANS_ECHEANCE}
                </Text>
                <View style={{ width: "46%", paddingRight: 4 }}>
                  <Text style={s.td}>{v.libelleObligation}</Text>
                  {/* Ce dossier part chez un assureur, un bailleur ou un
                      acquéreur : c'est le document où une échéance
                      contractuelle a le plus de chances de se lire comme une
                      obligation légale, et le seul qu'on ne pourra pas
                      corriger après l'avoir remis (ADR-032). */}
                  {v.contractuelle && (
                    <Text style={[s.small, { color: BOARD.ambreEncre }]}>
                      {MARQUAGE_CONTRACTUEL}
                    </Text>
                  )}
                </View>
                <Text style={[s.td, { width: "26%" }]}>
                  {v.equipementLibelle}
                </Text>
                <Text style={[s.td, { width: "14%" }]}>
                  {v.domaine ? LABEL_DOMAINE[v.domaine] : "—"}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text
          style={s.footer}
          render={({ pageNumber, totalPages }) =>
            `Dossier de conformité — ${data.etablissement} — page ${pageNumber}/${totalPages}`
          }
          fixed
        />
      </Page>

      {/* Actions en cours */}
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Actions correctives en cours</Text>
        {data.actionsEnCours.length === 0 ? (
          <Text style={[s.small, { marginTop: 12 }]}>
            Aucune action en cours.
          </Text>
        ) : (
          <View>
            <View style={s.thead}>
              <Text style={[s.th, { width: "40%" }]}>Action</Text>
              <Text style={[s.th, { width: "18%" }]}>Type</Text>
              <Text style={[s.th, { width: "14%" }]}>Échéance</Text>
              <Text style={[s.th, { width: "14%" }]}>Responsable</Text>
              <Text style={[s.th, { width: "14%" }]}>Statut</Text>
            </View>
            {data.actionsEnCours.map((a) => (
              <View key={a.id} style={s.row} wrap={false}>
                <View style={{ width: "40%", paddingRight: 4 }}>
                  <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9.5 }}>
                    {a.libelle}
                  </Text>
                  <Text style={[s.small, { marginTop: 2 }]}>
                    {a.contexte}
                  </Text>
                </View>
                <Text style={[s.td, { width: "18%" }]}>
                  {LABEL_TYPE_ACTION[a.type]}
                </Text>
                <Text style={[s.td, { width: "14%" }]}>
                  {formatDateCourte(a.echeance)}
                </Text>
                <Text style={[s.td, { width: "14%" }]}>
                  {a.responsable ?? "—"}
                </Text>
                <Text style={[s.td, { width: "14%" }]}>
                  {LABEL_STATUT_ACTION[a.statut]}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text
          style={s.footer}
          render={({ pageNumber, totalPages }) =>
            `Dossier de conformité — ${data.etablissement} — page ${pageNumber}/${totalPages}`
          }
          fixed
        />
      </Page>

      {/* Rapports récents + mentions légales */}
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Rapports de vérification récents</Text>
        {data.rapportsRecents.length === 0 ? (
          <Text style={[s.small, { marginTop: 12 }]}>
            Aucun rapport archivé pour l&apos;instant.
          </Text>
        ) : (
          <View>
            <View style={s.thead}>
              <Text style={[s.th, { width: "14%" }]}>Date</Text>
              <Text style={[s.th, { width: "40%" }]}>Obligation</Text>
              <Text style={[s.th, { width: "22%" }]}>Organisme</Text>
              <Text style={[s.th, { width: "24%" }]}>Résultat</Text>
            </View>
            {data.rapportsRecents.map((r) => (
              <View key={r.id} style={s.row} wrap={false}>
                <Text style={[s.td, { width: "14%" }]}>
                  {formatDateCourte(r.dateRapport)}
                </Text>
                <Text style={[s.td, { width: "40%" }]}>
                  {r.libelleObligation}
                </Text>
                <Text style={[s.td, { width: "22%" }]}>
                  {r.organismeVerif ?? "—"}
                </Text>
                <Text style={[s.td, { width: "24%" }]}>
                  {LABEL_RESULTAT[r.resultat]}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Ce que ce dossier ne couvre pas — avant les mentions légales, et
            avec elles sur la même page : le lecteur tiers qui vérifie ce que
            la pièce engage lit les deux d'un même mouvement. Les phrases
            viennent de `mentions-perimetre.ts`, qui les rend testables ; ce
            document ne décide de rien. */}
        {chapeau ? (
          <>
            <Text style={s.h2}>Ce que ce dossier ne couvre pas</Text>
            <View style={s.mentionsLegalesBloc}>
              <Text>{chapeau}</Text>
              {blocs.map((b, i) => (
                <View key={i} style={{ marginTop: 6 }}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>
                    — {b.titre}
                  </Text>
                  <Text style={{ marginTop: 2 }}>{b.corps}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Text style={s.h2}>Mentions légales</Text>
        <View style={s.mentionsLegalesBloc}>
          <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 4 }}>
            Obligations applicables
          </Text>
          <Text>
            — Évaluation des risques professionnels : articles R. 4121-1 à
            R. 4121-4 du Code du travail. Mise à jour annuelle minimum
            (entreprises ≥ 11 salariés), conservation 40 ans des versions
            (loi du 2 août 2021).
          </Text>
          <Text style={{ marginTop: 3 }}>
            — Principes généraux de prévention : article L. 4121-2 CT.
            Hiérarchie des mesures opposable.
          </Text>
          <Text style={{ marginTop: 3 }}>
            {/* ~~« R. 4226-14 et s. »~~ — corrigé le 2026-09-20. Au corpus,
                R. 4226-14 est la vérification INITIALE et R. 4226-16 la
                PÉRIODIQUE : sous le mot « périodiques », c'était le mauvais
                article. Le README du ZIP écrivait déjà R. 4226-16 — deux
                documents du même dossier se contredisaient. */}
            — Vérifications périodiques : articles R. 4226-16 et s. CT
            (électricité), R. 4222-20 CT (aération), R. 4227-28 et s. CT
            (incendie), arrêté du 25 juin 1980 (règlement ERP).
          </Text>
          <Text style={{ marginTop: 3 }}>
            {/* ~~« R. 143-44 CCH (ERP), R. 146-35 CCH (IGH) » à tous~~ —
                conditionné au régime le 2026-09-26 : un bureau ni ERP ni IGH
                lisait deux articles qui ne le visent pas. Les textes et leur
                verbatim sont dans `mentions-registre.ts`. */}
            — Registre de sécurité : {referencesRegistreDossier(data.regime)}.
          </Text>
          <Text style={{ marginTop: 6 }}>
            Ce dossier ne vaut pas certification de conformité. Il
            centralise les éléments opposables à disposition de
            l&apos;employeur pour faciliter le dialogue avec
            l&apos;inspection, la commission de sécurité, l&apos;assureur
            ou le bailleur.
          </Text>
        </View>

        <Text
          style={s.footer}
          render={({ pageNumber, totalPages }) =>
            `Dossier de conformité — ${data.etablissement} — page ${pageNumber}/${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
