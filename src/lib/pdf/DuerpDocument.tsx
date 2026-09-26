import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { prioriser } from "@/lib/cotation";
import { formaterDateCourteFr, formaterDateLongueFr } from "@/lib/dates";
import { LABEL_STATUT, LABEL_TYPE_MESURE } from "@/lib/mesures/labels";
import { estHorsReferentiel } from "@/lib/risques/helpers";
import { phrasesMethodologie, quandSansReponse } from "./mentions-couverture";
import {
  CHAPEAU_ANNEXE_EXPOSITION,
  TITRE_ANNEXE_EXPOSITION,
} from "./mentions-exposition";
import {
  activitesDeclareesSnapshot,
  activitesSansReponseSnapshot,
} from "@/lib/activites/snapshot";
import type { DuerpSnapshot } from "@/lib/versions/snapshot";
import type { TypeMesure } from "@/lib/referentiels/types";
import {
  MAJ_DUERP_AMENAGEMENT_IMPORTANT,
  MAJ_DUERP_ANNUELLE,
  MAJ_DUERP_INFORMATION_NOUVELLE,
  enMinuscule,
} from "@/lib/referentiels/conformite/texte-r4121-2";

const s = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111",
    lineHeight: 1.4,
  },
  h1: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  h2: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginTop: 20,
    marginBottom: 8,
  },
  h3: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 10,
    marginBottom: 4,
  },
  small: { fontSize: 8, color: "#555" },
  badge: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    color: "#111",
    backgroundColor: "#eee",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    paddingVertical: 4,
  },
  thead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingVertical: 4,
    marginTop: 6,
  },
  th: { fontFamily: "Helvetica-Bold", fontSize: 9 },
  td: { fontSize: 9 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#777",
    textAlign: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#ccc",
    paddingTop: 6,
  },
  pageNumber: { fontSize: 8 },
  watermarkBand: {
    position: "absolute",
    top: 14,
    left: 40,
    right: 40,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: "#fef3c7",
    borderWidth: 0.5,
    borderColor: "#d97706",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  watermarkLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#92400e",
    letterSpacing: 1.2,
  },
  watermarkHint: {
    fontSize: 7,
    color: "#92400e",
  },
});

function badgeColor(criticite: number): string {
  if (criticite >= 12) return "#fca5a5";
  if (criticite >= 6) return "#fdba74";
  if (criticite >= 3) return "#fde68a";
  return "#bbf7d0";
}

// Les dates du snapshot sont sérialisées en ISO : on les reconstruit puis on
// les formate en heure de Paris (`@/lib/dates`). Sans `timeZone` explicite,
// le rendu dépendait du fuseau du serveur — un DUERP imprimé pouvait dater
// une mesure de la veille.
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return formaterDateCourteFr(new Date(iso));
}

function formatDateTime(iso: string): string {
  return formaterDateLongueFr(new Date(iso));
}

export type Props = {
  snapshot: DuerpSnapshot;
  historique: Array<{ numero: number; genereLe: string; motif: string | null }>;
  /** Aperçu non figé : affiche un bandeau « BROUILLON » sur chaque page. */
  brouillon?: boolean;
};

export function DuerpDocument({ snapshot, historique, brouillon = false }: Props) {
  const { entreprise, unites, version, genereLe, motif } = snapshot;

  // Unités qu'aucune unité type du référentiel sectoriel ne couvre : leur
  // inventaire ne doit rien au référentiel, il vient entièrement de
  // l'employeur. La méthodologie annonce le contraire deux pages plus haut —
  // c'est précisément cette phrase-là qu'il faut nuancer, sinon le document
  // laisse croire à une base commune que ces unités n'ont pas eue.
  const horsReferentiel = unites.filter(estHorsReferentiel);

  // Activités que le dirigeant a déclaré exercer et que le référentiel
  // sectoriel ne couvre pas (ADR-020). Même problème que ci-dessus, vu d'un
  // cran plus haut : là il manquait des risques types dans une unité, ici il
  // manque l'unité entière — un supermarché sous référentiel commerce n'a
  // aucune ligne pour sa boucherie, et le document en a pourtant l'air complet.
  //
  // `snapshot.couverture` absent = version validée avant l'introduction du
  // champ : rien n'est dit, ni dans un sens ni dans l'autre.
  const activitesDeclarees = activitesDeclareesSnapshot(snapshot.couverture);
  const activitesSansReponse = activitesSansReponseSnapshot(snapshot.couverture);

  const lignes = unites.flatMap((u) =>
    u.risques.map((r) => ({
      id: r.id,
      libelle: r.libelle,
      uniteNom: u.nom,
      gravite: r.gravite,
      probabilite: r.probabilite,
      maitrise: r.maitrise,
      criticite: r.criticite,
      cotationSaisie: r.cotationSaisie,
      mesures: r.mesures,
    })),
  );
  const risquesPriorises = prioriser(lignes);
  const actionsPrevues = unites
    .flatMap((u) =>
      u.risques.flatMap((r) =>
        r.mesures
          .filter((m) => m.statut === "prevue")
          .map((m) => ({
            libelleMesure: m.libelle,
            type: m.type,
            echeance: m.echeance,
            responsable: m.responsable,
            libelleRisque: r.libelle,
            uniteNom: u.nom,
            criticiteRisque: r.criticite,
          })),
      ),
    )
    .sort((a, b) => {
      const ta = a.echeance ? new Date(a.echeance).getTime() : Infinity;
      const tb = b.echeance ? new Date(b.echeance).getTime() : Infinity;
      if (ta !== tb) return ta - tb;
      return b.criticiteRisque - a.criticiteRisque;
    });

  // Les phrases de méthodologie qui disent ce que le document ne traite pas
  // sont décidées hors du JSX (`mentions-couverture.ts`), où elles se testent.
  const mentions = phrasesMethodologie({
    couverture: snapshot.couverture,
    nbUnitesHorsReferentiel: horsReferentiel.length,
    brouillon,
  });

  // Élément (pas un composant défini au rendu — react-hooks/static-components) :
  // le bandeau est identique sur toutes les pages.
  const bandeau = brouillon ? (
      <View style={s.watermarkBand} fixed>
        <Text style={s.watermarkLabel}>
          DOCUMENT NON VALIDÉ — APERÇU
        </Text>
        <Text style={s.watermarkHint}>
          Aucune valeur légale avant validation d&apos;une version
        </Text>
      </View>
  ) : null;

  return (
    <Document
      title={
        brouillon
          ? `DUERP ${entreprise.raisonSociale} — aperçu`
          : `DUERP ${entreprise.raisonSociale} — v${version}`
      }
      author={entreprise.raisonSociale}
    >
      {/* Page de garde */}
      <Page size="A4" style={s.page}>
        {bandeau}
        <View style={{ marginTop: 120 }}>
          <Text style={s.small}>Document Unique d&apos;Évaluation des Risques Professionnels</Text>
          <Text style={[s.h1, { fontSize: 28, marginTop: 12 }]}>
            {entreprise.raisonSociale}
          </Text>
          <View style={{ marginTop: 24 }}>
            <Text style={s.small}>Code NAF : {entreprise.codeNaf}</Text>
            {entreprise.siret && (
              <Text style={s.small}>SIRET : {entreprise.siret}</Text>
            )}
            <Text style={s.small}>Effectif : {entreprise.effectif}</Text>
            <Text style={s.small}>Adresse : {entreprise.adresse}</Text>
          </View>
          <View style={{ marginTop: 48 }}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>
              Version {version} — {formatDateTime(genereLe)}
            </Text>
            {motif && <Text style={s.small}>Motif : {motif}</Text>}
          </View>
          <View style={{ marginTop: 80 }}>
            <Text style={s.small}>
              Ce document est établi en application des articles R. 4121-1 à
              R. 4121-4 du Code du travail. La mise à jour est réalisée{" "}
              {enMinuscule(MAJ_DUERP_ANNUELLE)} (art. R. 4121-2, 1°). Quel que soit l&apos;effectif, elle est
              aussi réalisée {enMinuscule(MAJ_DUERP_AMENAGEMENT_IMPORTANT)}, et{" "}
              {enMinuscule(MAJ_DUERP_INFORMATION_NOUVELLE)} (2° et 3°).
              Conservation 40 ans à compter de son
              élaboration, ainsi que ses versions antérieures (art. R. 4121-4).
            </Text>
          </View>
        </View>
        <Text style={s.footer} fixed>
          {entreprise.raisonSociale} — DUERP v{version}
        </Text>
      </Page>

      {/* Méthodologie + unités */}
      <Page size="A4" style={s.page}>
        {bandeau}
        <Text style={s.h2}>Méthodologie d&apos;évaluation</Text>
        <Text style={s.h3}>Modalités et découpage</Text>
        <Text>
          L&apos;évaluation est conduite par unité de travail, chaque unité
          regroupant les salariés exposés aux mêmes situations de risque (cf.
          art. R. 4121-1 et INRS ED 840).
          {"\n"}L&apos;inventaire des risques s&apos;appuie sur les référentiels
          sectoriels et transverses INRS pré-chargés (voir ci-dessous), que
          l&apos;employeur complète et ajuste à sa réalité.
          {mentions.map((phrase) => `\n${phrase}`).join("")}
        </Text>

        <Text style={s.h3}>Appréciation</Text>
        <Text>
          Chaque risque est coté sur trois axes — gravité, probabilité,
          maîtrise — via des questions comportementales traduites en notes de
          1 à 4. La criticité est calculée selon la formule{" "}
          <Text style={{ fontFamily: "Helvetica-Bold" }}>
            (gravité × probabilité) ÷ maîtrise
          </Text>
          , arrondie au plus proche entier et bornée entre 1 et 16.
          {"\n"}Comme le rappelle la brochure INRS ED 840, aucune méthode
          d&apos;appréciation n&apos;est imposée par la réglementation : ces
          règles sont à définir par l&apos;entreprise. La méthode déterministe
          retenue ici est une approche simplifiée, communément utilisée pour
          structurer l&apos;évaluation. Elle ne prétend pas se substituer à
          l&apos;appréciation qualitative recommandée par l&apos;INRS pour les
          situations complexes.
        </Text>

        <Text style={s.h3}>Hiérarchie des mesures</Text>
        <Text>
          La priorisation des mesures suit l&apos;ordre imposé par
          l&apos;article L. 4121-2 du Code du travail :
          {"\n"}1. éviter les risques ; 2. évaluer les risques qui ne peuvent
          être évités ; 3. combattre les risques à la source ; 4. adapter le
          travail à l&apos;homme ; 5. tenir compte de l&apos;évolution de la
          technique ; 6. remplacer ce qui est dangereux par ce qui l&apos;est
          moins ; 7. planifier la prévention ; 8. prendre des mesures de
          protection collective en leur donnant la priorité sur les mesures
          individuelles ; 9. donner les instructions appropriées aux
          travailleurs.
        </Text>

        <Text style={s.h2}>Sources et référentiels</Text>
        <Text style={s.small}>
          Les unités de travail et risques pré-suggérés s&apos;appuient sur les
          publications de l&apos;Institut National de Recherche et de Sécurité
          (INRS) et de l&apos;Assurance Maladie — Risques professionnels :
        </Text>
        <View style={{ marginLeft: 12, marginTop: 4 }}>
          <Text style={s.small}>
            • Restauration : INRS ED 880 « La restauration traditionnelle »
            (novembre 2012).
          </Text>
          <Text style={s.small}>
            • Commerce : INRS AC 93 « OiRA commerce non alimentaire » (juin
            2016) et ED 925 « Les commerces alimentaires de proximité ».
          </Text>
          <Text style={s.small}>
            • Bureau / tertiaire : dossier INRS « Travail de bureau », ED 950
            « Conception des lieux et des situations de travail » (août 2025)
            et ED 6497 « Améliorer la qualité de l&apos;air dans les locaux de
            travail du tertiaire » (octobre 2022).
          </Text>
          <Text style={s.small}>
            • Risques transverses : INRS ED 840 « Évaluation des risques
            professionnels — Aide au repérage des risques dans les PME-PMI »
            (8e édition, juin 2025 — taxonomie des 20 fiches de risques).
          </Text>
        </View>

        <Text style={s.h2}>Unités de travail</Text>
        {unites.map((u) => (
          <View key={u.id} style={{ marginBottom: 8 }}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>
              {u.nom}
              {u.estTransverse ? " (transverse)" : ""}
              {estHorsReferentiel(u) ? " (hors référentiel sectoriel)" : ""}
            </Text>
            {u.description && <Text style={s.small}>{u.description}</Text>}
          </View>
        ))}

        {horsReferentiel.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <Text style={s.h3}>Unités évaluées hors référentiel sectoriel</Text>
            <Text style={s.small}>
              Les unités suivantes ne correspondent à aucune unité type du
              référentiel sectoriel retenu ci-dessus. Aucun risque type ne leur
              a donc été proposé : leur inventaire, leur cotation et leurs
              mesures de prévention ont été établis intégralement par
              l&apos;employeur. Cette mention décrit l&apos;origine des données,
              elle ne préjuge ni de la qualité ni de l&apos;exhaustivité de
              l&apos;évaluation.
            </Text>
            {horsReferentiel.map((u) => (
              <Text key={u.id} style={s.small}>
                • {u.nom}
              </Text>
            ))}
          </View>
        )}

        {/* Périmètre du référentiel (ADR-020). Ce bloc voisine délibérément
            celui des unités hors référentiel : les deux nuancent la même
            phrase de méthodologie — « l'inventaire s'appuie sur les
            référentiels INRS pré-chargés » — et les disperser obligerait le
            lecteur à recoudre lui-même l'origine des données. */}
        {activitesDeclarees.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <Text style={s.h3}>
              Activités déclarées hors référentiel sectoriel
            </Text>
            <Text style={s.small}>
              L&apos;employeur a déclaré exercer les activités suivantes, que le
              référentiel sectoriel retenu ci-dessus ne couvre pas. Aucune unité
              type ni aucun risque type ne leur correspond dans ce référentiel :
              ce que le présent document en dit provient donc entièrement de
              l&apos;employeur. Cette mention décrit l&apos;origine des données,
              elle ne préjuge ni de la qualité ni de l&apos;exhaustivité de
              l&apos;évaluation.
            </Text>
            {/* Deux phrases par activité, et l'ordre n'est pas indifférent :
                d'abord ce que le document ne traite pas — c'est ce que le
                lecteur doit retenir — puis d'où vient la limite. Le
                `pourquoi` est absent des versions validées avant son
                introduction : elles se régénèrent alors telles qu'elles
                étaient, sans qu'on aille chercher la phrase dans le
                référentiel d'aujourd'hui. */}
            {activitesDeclarees.map((a) => (
              // `wrap={false}` : une activité tient d'un seul tenant. Sans
              // lui, le saut de page tombait entre le manque et son pourquoi
              // — le lecteur voyait la lacune sur une page et son explication
              // sur la suivante, ce qui est exactement l'ordre dans lequel il
              // ne faut pas les lire.
              <View
                key={a.id}
                wrap={false}
                style={{ marginTop: 4, marginLeft: 12 }}
              >
                <Text style={s.small}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>
                    {a.libelle}
                  </Text>
                  {" — "}
                  {a.cequiManque}
                </Text>
                {a.pourquoi && (
                  <Text style={[s.small, { marginTop: 2 }]}>
                    <Text style={{ fontFamily: "Helvetica-Oblique" }}>
                      Pourquoi ce référentiel ne la couvre pas :
                    </Text>{" "}
                    {a.pourquoi}
                  </Text>
                )}
              </View>
            ))}
            {/* Les questions sans réponse ne se disent qu'ici, à l'intérieur
                du bloc : elles nuancent une liste — « voilà ce qui a été
                déclaré, et voilà ce qui n'a pas été tranché ». Seules, dans un
                document où rien n'a été déclaré, elles n'auraient rien nuancé
                du tout et se seraient lues comme un reproche fait au dossier.
                Le nombre est un décompte de questions, jamais un taux de
                complétude : un pourcentage laisserait croire à une mesure. */}
            {activitesSansReponse.length > 0 && (
              <Text style={[s.small, { marginTop: 6 }]}>
                {activitesSansReponse.length} autre
                {activitesSansReponse.length > 1 ? "s" : ""} question
                {activitesSansReponse.length > 1 ? "s" : ""} sur le périmètre du
                référentiel {activitesSansReponse.length > 1 ? "sont" : "est"}{" "}
                restée{activitesSansReponse.length > 1 ? "s" : ""} sans réponse{" "}
                {quandSansReponse(brouillon)}{" "}
                : le document n&apos;affirme donc
                ni que ces activités sont exercées, ni qu&apos;elles ne le sont
                pas.
              </Text>
            )}
          </View>
        )}
        <Text style={s.footer} fixed>
          {entreprise.raisonSociale} — DUERP v{version}
        </Text>
      </Page>

      {/* Risques par unité */}
      <Page size="A4" style={s.page}>
        {bandeau}
        <Text style={s.h2}>Inventaire des risques</Text>
        {unites
          .filter((u) => u.risques.length > 0)
          .map((u) => (
            <View key={u.id} style={{ marginTop: 10 }} wrap={false}>
              <Text style={s.h3}>
                {u.nom}
                {u.estTransverse ? " (transverse)" : ""}
                {estHorsReferentiel(u) ? " (hors référentiel sectoriel)" : ""}
              </Text>
              <View style={s.thead}>
                <Text style={[s.th, { width: "45%" }]}>Risque</Text>
                <Text style={[s.th, { width: "10%" }]}>G × P / M</Text>
                <Text style={[s.th, { width: "10%" }]}>Criticité</Text>
                <Text style={[s.th, { width: "35%" }]}>Mesures</Text>
              </View>
              {u.risques.map((r) => (
                <View key={r.id} style={s.row}>
                  <View style={{ width: "45%" }}>
                    <Text style={s.td}>{r.libelle}</Text>
                    {(r.nombreSalariesExposes !== null ||
                      r.dateMesuresPhysiques !== null ||
                      r.exposeCMR) && (
                      <Text style={s.small}>
                        {r.nombreSalariesExposes !== null
                          ? `Salariés exposés : ${r.nombreSalariesExposes}`
                          : null}
                        {r.nombreSalariesExposes !== null &&
                        (r.dateMesuresPhysiques || r.exposeCMR)
                          ? " · "
                          : ""}
                        {r.dateMesuresPhysiques
                          ? `Dern. mesure phys. : ${formatDate(r.dateMesuresPhysiques)}`
                          : null}
                        {r.dateMesuresPhysiques && r.exposeCMR ? " · " : ""}
                        {r.exposeCMR ? (
                          <Text style={{ color: "#b30000" }}>
                            CMR (R. 4412-59)
                          </Text>
                        ) : null}
                      </Text>
                    )}
                  </View>
                  <Text style={[s.td, { width: "10%" }]}>
                    {r.gravite} × {r.probabilite} / {r.maitrise}
                  </Text>
                  <View style={{ width: "10%" }}>
                    <Text
                      style={[
                        s.badge,
                        {
                          backgroundColor: badgeColor(r.criticite),
                          alignSelf: "flex-start",
                        },
                      ]}
                    >
                      {r.cotationSaisie ? `${r.criticite}/16` : "n.c."}
                    </Text>
                  </View>
                  <View style={{ width: "35%" }}>
                    {r.mesures.length === 0 ? (
                      <Text style={s.small}>—</Text>
                    ) : (
                      r.mesures.map((m, i) => (
                        <Text key={m.id} style={s.small}>
                          {i + 1}. {m.libelle}{" "}
                          <Text
                            style={{
                              color:
                                m.statut === "existante" ? "#0b7" : "#06c",
                            }}
                          >
                            [{LABEL_STATUT[m.statut]}]
                          </Text>
                          {m.echeance ? ` · ${formatDate(m.echeance)}` : ""}
                        </Text>
                      ))
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))}

        {/* Déclarations d'absence de risque significatif (traçabilité ED 840) */}
        {unites.some(
          (u) => u.risques.length === 0 && u.aucunRisqueJustif,
        ) && (
          <View style={{ marginTop: 20 }} wrap={false}>
            <Text style={s.h3}>
              Unités déclarées sans risque significatif
            </Text>
            <Text style={[s.small, { marginBottom: 6 }]}>
              Conformément aux recommandations INRS (ED 840), une unité de
              travail peut légitimement être déclarée sans risque significatif
              après évaluation, dès lors que cette conclusion est documentée.
            </Text>
            {unites
              .filter((u) => u.risques.length === 0 && u.aucunRisqueJustif)
              .map((u) => (
                <View key={u.id} style={{ marginBottom: 6 }}>
                  <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10 }}>
                    {u.nom}
                  </Text>
                  <Text style={s.small}>
                    Justification : {u.aucunRisqueJustif}
                  </Text>
                </View>
              ))}
          </View>
        )}

        {/* Risques CMR — listing dédié pour alerter l'employeur */}
        {unites.some((u) => u.risques.some((r) => r.exposeCMR)) && (
          <View style={{ marginTop: 20 }} wrap={false}>
            <Text style={s.h3}>
              Risques avec exposition à un agent CMR
            </Text>
            <Text style={[s.small, { marginBottom: 6 }]}>
              Les risques ci-dessous ont été déclarés comme exposant un ou
              plusieurs salariés à un agent Cancérogène, Mutagène ou toxique
              pour la Reproduction (art. R. 4412-59 et suivants). Obligations
              spécifiques : substitution prioritaire, liste des salariés
              exposés, suivi médical renforcé, information et formation.
            </Text>
            {unites.flatMap((u) =>
              u.risques
                .filter((r) => r.exposeCMR)
                .map((r) => (
                  <Text key={r.id} style={s.small}>
                    • [{u.nom}] {r.libelle}
                    {r.nombreSalariesExposes !== null
                      ? ` · ${r.nombreSalariesExposes} salarié${r.nombreSalariesExposes > 1 ? "s" : ""} exposé${r.nombreSalariesExposes > 1 ? "s" : ""}`
                      : ""}
                  </Text>
                )),
            )}
          </View>
        )}

        {/* Unités sans risque ni justification — avertissement de qualité */}
        {unites.some(
          (u) =>
            !u.estTransverse &&
            u.risques.length === 0 &&
            !u.aucunRisqueJustif,
        ) && (
          <View style={{ marginTop: 16 }}>
            <Text style={s.h3}>Unités à compléter</Text>
            <Text style={s.small}>
              Les unités suivantes n&apos;ont ni risque identifié ni
              déclaration d&apos;absence de risque — l&apos;évaluation y est
              incomplète :
            </Text>
            {unites
              .filter(
                (u) =>
                  !u.estTransverse &&
                  u.risques.length === 0 &&
                  !u.aucunRisqueJustif,
              )
              .map((u) => (
                <Text key={u.id} style={s.small}>
                  • {u.nom}
                </Text>
              ))}
          </View>
        )}

        <Text style={s.footer} fixed>
          {entreprise.raisonSociale} — DUERP v{version}
        </Text>
      </Page>

      {/* Plan d'actions priorisé */}
      <Page size="A4" style={s.page}>
        {bandeau}
        <Text style={s.h2}>Plan d&apos;actions priorisé</Text>
        <Text style={[s.small, { marginBottom: 8 }]}>
          Risques triés par criticité décroissante (gravité en second critère).
        </Text>
        <View style={s.thead}>
          <Text style={[s.th, { width: "10%" }]}>Criticité</Text>
          <Text style={[s.th, { width: "40%" }]}>Risque</Text>
          <Text style={[s.th, { width: "20%" }]}>Unité</Text>
          <Text style={[s.th, { width: "30%" }]}>Prochaine action</Text>
        </View>
        {risquesPriorises.map((r) => {
          const prochaine = r.mesures
            .filter((m) => m.statut === "prevue")
            .sort((a, b) => {
              const ta = a.echeance ? new Date(a.echeance).getTime() : Infinity;
              const tb = b.echeance ? new Date(b.echeance).getTime() : Infinity;
              return ta - tb;
            })[0];
          return (
            <View key={r.id} style={s.row}>
              <View style={{ width: "10%" }}>
                <Text
                  style={[
                    s.badge,
                    {
                      backgroundColor: badgeColor(r.criticite),
                      alignSelf: "flex-start",
                    },
                  ]}
                >
                  {r.cotationSaisie ? `${r.criticite}/16` : "n.c."}
                </Text>
              </View>
              <Text style={[s.td, { width: "40%" }]}>{r.libelle}</Text>
              <Text style={[s.td, { width: "20%" }]}>{r.uniteNom}</Text>
              <Text style={[s.td, { width: "30%" }]}>
                {prochaine
                  ? `${prochaine.libelle}${prochaine.echeance ? ` · ${formatDate(prochaine.echeance)}` : ""}`
                  : "—"}
              </Text>
            </View>
          );
        })}

        <Text style={[s.h2, { marginTop: 20 }]}>Actions prévues</Text>
        {actionsPrevues.length === 0 ? (
          <Text style={s.small}>Aucune action planifiée.</Text>
        ) : (
          <>
            <View style={s.thead}>
              <Text style={[s.th, { width: "15%" }]}>Échéance</Text>
              <Text style={[s.th, { width: "35%" }]}>Action</Text>
              <Text style={[s.th, { width: "20%" }]}>Risque / Unité</Text>
              <Text style={[s.th, { width: "15%" }]}>Type</Text>
              <Text style={[s.th, { width: "15%" }]}>Responsable</Text>
            </View>
            {actionsPrevues.map((a, i) => (
              <View key={i} style={s.row}>
                <Text style={[s.td, { width: "15%" }]}>
                  {formatDate(a.echeance)}
                </Text>
                <Text style={[s.td, { width: "35%" }]}>{a.libelleMesure}</Text>
                <Text style={[s.td, { width: "20%" }]}>
                  {a.libelleRisque} · {a.uniteNom}
                </Text>
                <Text style={[s.td, { width: "15%" }]}>
                  {LABEL_TYPE_MESURE[a.type as TypeMesure] ?? a.type}
                </Text>
                <Text style={[s.td, { width: "15%" }]}>
                  {a.responsable ?? "—"}
                </Text>
              </View>
            ))}
          </>
        )}
        <Text style={s.footer} fixed>
          {entreprise.raisonSociale} — DUERP v{version}
        </Text>
      </Page>

      {/* Dénombrement des expositions relevées.
          On ne la génère que si au moins un risque renseigne l'un des champs
          (salariés exposés, mesures physiques, CMR).

          CETTE PAGE S'ANNONÇAIT COMME L'ANNEXE DE R. 4121-1-1, ET NE L'EST
          PAS. Elle imprime un effectif brut par risque du référentiel
          sectoriel, là où l'article demande une proportion rapportée à une
          liste fermée de facteurs de risques professionnels que le modèle
          `Risque` ne connaît pas. Le tableau est resté — ce sont de vraies
          saisies, et les réunir a une valeur propre —, le titre et le
          chapeau ont changé. Ils vivent désormais dans
          `mentions-exposition.ts`, où ils se vérifient : l'argument complet
          y est, et un test tient chacune des phrases qui empêchent la page
          d'être relue comme la pièce de l'article. */}
      {unites.some((u) =>
        u.risques.some(
          (r) =>
            r.nombreSalariesExposes !== null ||
            r.dateMesuresPhysiques !== null ||
            r.exposeCMR,
        ),
      ) && (
        <Page size="A4" style={s.page}>
          {bandeau}
          <Text style={s.h2}>{TITRE_ANNEXE_EXPOSITION}</Text>
          {CHAPEAU_ANNEXE_EXPOSITION.map((paragraphe, i) => (
            <Text
              key={i}
              style={[
                s.small,
                { marginBottom: i === CHAPEAU_ANNEXE_EXPOSITION.length - 1 ? 8 : 5 },
              ]}
            >
              {paragraphe}
            </Text>
          ))}
          <View style={s.thead}>
            <Text style={[s.th, { width: "30%" }]}>Risque</Text>
            <Text style={[s.th, { width: "20%" }]}>Unité</Text>
            <Text style={[s.th, { width: "15%" }]}>
              Salariés exposés
            </Text>
            <Text style={[s.th, { width: "20%" }]}>
              Dern. mesures physiques
            </Text>
            <Text style={[s.th, { width: "15%" }]}>CMR</Text>
          </View>
          {unites.flatMap((u) =>
            u.risques
              .filter(
                (r) =>
                  r.nombreSalariesExposes !== null ||
                  r.dateMesuresPhysiques !== null ||
                  r.exposeCMR,
              )
              .map((r) => (
                <View key={r.id} style={s.row}>
                  <Text style={[s.td, { width: "30%" }]}>{r.libelle}</Text>
                  <Text style={[s.td, { width: "20%" }]}>{u.nom}</Text>
                  <Text style={[s.td, { width: "15%" }]}>
                    {r.nombreSalariesExposes !== null
                      ? `${r.nombreSalariesExposes}`
                      : "—"}
                  </Text>
                  <Text style={[s.td, { width: "20%" }]}>
                    {formatDate(r.dateMesuresPhysiques)}
                  </Text>
                  <Text
                    style={[
                      s.td,
                      { width: "15%" },
                      r.exposeCMR ? { color: "#b30000" } : {},
                    ]}
                  >
                    {/* « Oui », et plus « Oui — R. 4412 ». `R. 4412` n'est
                        pas un article mais un chapitre, et tronqué dans une
                        cellule il se lit comme une référence. La cellule dit
                        un fait de saisie ; l'article qui s'y attache est
                        nommé en toutes lettres sous le tableau
                        (R. 4412-59 et suivants), une fois et correctement. */}
                    {r.exposeCMR ? "Oui" : "—"}
                  </Text>
                </View>
              )),
          )}
          <Text style={[s.small, { marginTop: 10 }]}>
            Textes de référence pour les mesures physiques : bruit
            (R. 4432-1 et suiv.), éclairement (R. 4223-4), ambiances
            thermiques, vibrations (R. 4441-1 et suiv.). Les expositions CMR
            déclenchent les obligations renforcées de l&apos;art. R. 4412-59
            et suivants (substitution, liste nominative, suivi médical).
          </Text>
          <Text style={s.footer} fixed>
            {entreprise.raisonSociale} — DUERP v{version}
          </Text>
        </Page>
      )}

      {/* Historique + mentions légales */}
      <Page size="A4" style={s.page}>
        {bandeau}
        <Text style={s.h2}>Historique des versions</Text>
        <View style={s.thead}>
          <Text style={[s.th, { width: "15%" }]}>Version</Text>
          <Text style={[s.th, { width: "25%" }]}>Date</Text>
          <Text style={[s.th, { width: "60%" }]}>Motif</Text>
        </View>
        {historique.map((v) => (
          <View key={v.numero} style={s.row}>
            <Text style={[s.td, { width: "15%" }]}>v{v.numero}</Text>
            <Text style={[s.td, { width: "25%" }]}>
              {formatDateTime(v.genereLe)}
            </Text>
            <Text style={[s.td, { width: "60%" }]}>{v.motif ?? "—"}</Text>
          </View>
        ))}

        <Text style={s.h2}>Mentions légales et rappels</Text>
        <Text>
          Ce document unique est établi en application des articles R. 4121-1
          à R. 4121-4 du Code du travail. Sa mise à jour est réalisée{" "}
          {enMinuscule(MAJ_DUERP_ANNUELLE)} (art. R. 4121-2, 1°). Quel que
          soit l&apos;effectif, il est :
        </Text>
        <View style={{ marginLeft: 10, marginTop: 6 }}>
          <Text>
            • mis à jour {enMinuscule(MAJ_DUERP_AMENAGEMENT_IMPORTANT)} ;
          </Text>
          <Text>
            • mis à jour {enMinuscule(MAJ_DUERP_INFORMATION_NOUVELLE)} ;
          </Text>
          <Text>
            • conservé pendant 40 ans à compter de son élaboration, ainsi que
            ses versions antérieures (art. R. 4121-4) ;
          </Text>
          <Text>
            • tenu à disposition des travailleurs, du CSE le cas échéant, du
            médecin du travail, des agents de l&apos;inspection du travail et
            des agents des services de prévention de la Carsat.
          </Text>
        </View>

        {entreprise.effectif >= 50 && (
          <>
            <Text style={[s.small, { marginTop: 10 }]}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>
                Entreprises d&apos;au moins 50 salariés (art. L. 4121-3-1) :
              </Text>{" "}
              le DUERP sert de base à l&apos;élaboration du programme annuel
              de prévention des risques professionnels et d&apos;amélioration
              des conditions de travail (PAPRIPACT), qui fixe la liste
              détaillée des mesures à prendre durant l&apos;année à venir
              avec, pour chacune, les conditions d&apos;exécution, les
              indicateurs de résultats et l&apos;estimation du coût.
            </Text>
          </>
        )}

        <Text style={[s.small, { marginTop: 10 }]}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>
            Annexes éventuellement obligatoires :
          </Text>{" "}
          données collectives utiles à l&apos;évaluation des expositions aux
          facteurs de risques professionnels (pénibilité / compte professionnel
          de prévention) ; proportion de salariés exposés au-delà des seuils
          réglementaires. Ces annexes sont à joindre séparément lorsque
          l&apos;activité le justifie.
        </Text>

        <Text style={[s.small, { marginTop: 16 }]}>
          Ce document a été rédigé avec l&apos;aide d&apos;un outil de
          structuration s&apos;appuyant sur les publications INRS et OiRA
          référencées en méthodologie. Il ne constitue pas un conseil
          juridique et ne se substitue pas à l&apos;intervention d&apos;un
          service de prévention et de santé au travail. La responsabilité de
          l&apos;évaluation des risques, des mesures prises et de leur mise
          en œuvre reste intégralement celle de l&apos;employeur.
        </Text>
        <Text style={s.footer} fixed>
          {entreprise.raisonSociale} — DUERP v{version}
        </Text>
      </Page>
    </Document>
  );
}
