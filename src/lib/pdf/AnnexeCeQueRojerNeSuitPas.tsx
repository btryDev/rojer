// L'annexe « Ce que Rojer ne suit pas » du PDF du référentiel complet
// (`scripts/generer-grille-equipements.tsx`), 2026-10-17, ADR-046.
//
// La page « Ce que Rojer ne couvre pas » a été ramenée à ce qu'un dirigeant
// lit : une phrase par domaine, les obligations hors du quotidien, cinq
// familles. TOUT ce qu'elle a cessé de dire s'imprime ici, pour le relecteur :
// les annonces avec leurs références et leurs phrases, les obligations au
// niveau audit marquées « Audit », les régimes refusés à l'entrée, et chaque
// article écarté avec le motif qui l'écarte. Les données viennent de
// `perimetre/detail-hors-page.ts` ; ce composant ne fait que les imprimer.
//
// Contraintes de mise en page (session 98, qui tient ce PDF) : pages A4 à
// l'italienne au style de page du script, son pied de page sur chaque page,
// `s.h1` et `s.small`, couleurs `BOARD.*` seulement, tout texte passé par
// `pourHelvetica`, aucun nom de personne. Le style de page et le pied de page
// sont ceux du script, reçus en props : l'insertion dans le script tient en
// une ligne.
//
// UN SEUL COMPOSANT, SANS SOUS-COMPOSANT, et c'est voulu : le test
// (`AnnexeCeQueRojerNeSuitPas.test.tsx`) lit l'arbre rendu sans exécuter les
// sous-composants (`arbre-rendu.test-utils.ts`). Un sous-composant cacherait
// au test le texte qu'il imprime.

import type { ComponentProps, ReactElement } from "react";
import { Link, Page, Text, View } from "@react-pdf/renderer";

type Style = ComponentProps<typeof Page>["style"];
import {
  detailHorsPage,
  type DetailHorsPage,
} from "@/lib/perimetre/detail-hors-page";
import { BOARD, stylesCommuns as s } from "@/lib/pdf/styles";
import { pourHelvetica as t } from "@/lib/pdf/textes-grille-relecture";

const titreSection = { fontSize: 13, fontFamily: "Helvetica-Bold", color: BOARD.encre, marginTop: 14 } as const;
const titreBloc = { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: BOARD.encre, marginTop: 10 } as const;
const corps = { fontSize: 9, color: BOARD.ardoiseEncre, marginTop: 2 } as const;
const ligne = { marginTop: 4, paddingBottom: 3, borderBottomWidth: 0.5, borderBottomColor: BOARD.ardoiseFilet } as const;

export function AnnexeCeQueRojerNeSuitPas({
  stylePage,
  piedDePage,
  detail = detailHorsPage(),
}: {
  stylePage: Style;
  piedDePage: ReactElement;
  detail?: DetailHorsPage;
}) {
  const nbArticlesAnnonces = detail.annonces.reduce((n, d) => n + d.articles.length, 0);
  const nbEcartes = detail.exclusions.reduce((n, e) => n + e.articles.length, 0);
  return (
    <>
      <Page size="A4" orientation="landscape" style={stylePage}>
        <Text style={{ fontSize: 10, color: BOARD.ardoiseMoyenne }}>
          {t("Annexe · page « Ce que Rojer ne couvre pas »")}
        </Text>
        <Text style={[s.h1, { marginTop: 4 }]}>{t("Ce que Rojer ne suit pas")}</Text>
        <Text style={s.small}>
          {t(
            `La page de l'application dit au dirigeant, par famille, ce que Rojer ne suit pas. Cette annexe en porte le détail : ${detail.annonces.length} domaines annoncés (${nbArticlesAnnonces} articles), ${detail.niveauAudit.length} obligations au niveau audit, ${detail.refus.length} régimes refusés à l'entrée, ${detail.exclusions.length} motifs d'exclusion (${nbEcartes} articles écartés). Le dirigeant n'a pas accès à ce document : la page se suffit à elle-même. Rien ici n'est compté comme une mesure de complétude ; une obligation que l'outil ne traite pas reste due si un texte l'impose.`,
          )}
        </Text>

        <Text style={titreSection}>{t("Ce que Rojer ne gère pas — les cinq familles de la page")}</Text>
        {detail.familles.map((f) => (
          <Text key={f.cle} style={[corps, { marginTop: 4 }]}>
            {t(f.phrase)}
          </Text>
        ))}

        <Text style={titreSection}>{t("Refusé à l'entrée")}</Text>
        <Text style={s.small}>
          {t(
            "Les régimes pour lesquels aucun dossier ne s'ouvre, tels que la porte de création les refuse. Ils ne figurent plus sur la page : si un dossier existe, il n'en relevait pas à sa création.",
          )}
        </Text>
        {detail.refus.map((r) => (
          <View key={r.cle} style={ligne} wrap={false}>
            <Text style={titreBloc}>{t(r.regime)}</Text>
            <Text style={corps}>{t(r.message)}</Text>
            <Text style={[s.small, { marginTop: 2 }]}>{t(r.indication)}</Text>
          </View>
        ))}
        {piedDePage}
      </Page>

      <Page size="A4" orientation="landscape" style={stylePage}>
        <Text style={[s.h1, { fontSize: 16 }]}>
          {t("Ce qui peut concerner un dossier, et que Rojer ne suit pas")}
        </Text>
        <Text style={s.small}>
          {t(
            "Toutes les annonces, à tout dossier. La page n'en montre que la phrase faite des sujets, au seul dossier que chaque article peut concerner ; les références, les intitulés et les phrases détaillées ne sont qu'ici.",
          )}
        </Text>
        {detail.annonces.map((d) => (
          <View key={d.cle} style={{ marginTop: 8 }}>
            <Text style={titreBloc} minPresenceAhead={40}>
              {t(d.titre)}
            </Text>
            <Text style={[s.small, { marginTop: 2, color: BOARD.bleuEncre }]}>
              {t(`Sur la page : ${d.phrasePage}`)}
            </Text>
            {d.phrase ? <Text style={corps}>{t(d.phrase)}</Text> : null}
            {d.articles.map((a) => (
              <View key={`${d.cle}-${a.ref}`} style={ligne} wrap={false}>
                {a.url ? (
                  <Link src={a.url} style={[s.td, { color: BOARD.encre, fontFamily: "Helvetica-Bold" }]}>
                    {t(a.ref)}
                  </Link>
                ) : (
                  <Text style={[s.td, { fontFamily: "Helvetica-Bold" }]}>{t(a.ref)}</Text>
                )}
                {a.intitule ? <Text style={corps}>{t(a.intitule)}</Text> : null}
                {a.phrase ? <Text style={corps}>{t(a.phrase)}</Text> : null}
                <Text style={[s.small, { marginTop: 2 }]}>
                  {t(`${a.corpus} · ${a.aQui}`)}
                </Text>
              </View>
            ))}
          </View>
        ))}
        {piedDePage}
      </Page>

      <Page size="A4" orientation="landscape" style={stylePage}>
        <Text style={[s.h1, { fontSize: 16 }]}>
          {t("Obligations légales que Rojer ne suit pas au quotidien")}
        </Text>
        <Text style={s.small}>
          {t(
            "Le niveau audit (ADR-042) : au référentiel avec leur source, hors du quotidien de l'application. La page les nomme au dossier qu'elles peuvent concerner, avec le geste, sans le mot « audit » ni la référence ; les deux sont ici.",
          )}
        </Text>
        {detail.niveauAudit.map((l) => (
          <View key={l.id} style={ligne} wrap={false}>
            <Text style={[s.td, { fontFamily: "Helvetica-Bold", color: BOARD.ambreEncre }]}>
              {l.mention}
            </Text>
            <Text style={titreBloc}>{t(l.libelle)}</Text>
            <Text style={corps}>{t(l.geste)}</Text>
            {l.url ? (
              <Link src={l.url} style={[s.small, { marginTop: 2, color: BOARD.bleuEncre }]}>
                {t(l.reference)}
              </Link>
            ) : (
              <Text style={[s.small, { marginTop: 2 }]}>{t(l.reference)}</Text>
            )}
          </View>
        ))}
        {piedDePage}
      </Page>

      <Page size="A4" orientation="landscape" style={stylePage}>
        <Text style={[s.h1, { fontSize: 16 }]}>{t("Hors périmètre déclaré")}</Text>
        <Text style={s.small}>
          {t(
            "Les textes lus dont l'outil ne tire aucune obligation d'exploitant, rangés par motif. La page dit les familles ; chaque article, son corpus et ce que la lecture a conclu ne sont qu'ici.",
          )}
        </Text>
        {detail.exclusions.map((e) => (
          <View key={e.cle} style={{ marginTop: 8 }}>
            <Text style={titreBloc} minPresenceAhead={40}>
              {t(e.libelle)}
            </Text>
            <Text style={corps}>{t(e.motif)}</Text>
            {e.articles.length === 0 ? (
              <Text style={[s.small, { marginTop: 2 }]}>
                {t("Aucun article lu n'a encore été écarté à ce titre.")}
              </Text>
            ) : null}
            {e.articles.map((a) => (
              <View key={`${e.cle}|${a.corpus}|${a.ref}`} style={ligne} wrap={false}>
                <Text style={s.td}>
                  {t(a.intitule ? `${a.ref} — ${a.intitule}` : a.ref)}
                </Text>
                <Text style={[s.small, { marginTop: 1 }]}>{t(a.corpus)}</Text>
                {a.motif ? (
                  <Text style={[s.small, { marginTop: 1 }]}>{t(a.motif)}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ))}
        {piedDePage}
      </Page>
    </>
  );
}
