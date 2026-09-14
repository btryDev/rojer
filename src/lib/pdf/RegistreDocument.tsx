import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { LABEL_RESULTAT } from "@/lib/rapports/schema";
import { LABEL_DOMAINE } from "@/lib/calendrier/labels";
import { MARQUAGE_CONTRACTUEL } from "@/lib/prescriptions/sources";
import type { DomaineObligation } from "@/lib/referentiels/conformite/types";
import type { ResultatVerification } from "@prisma/client";
import type { StatutPeint } from "@/lib/calendrier/etats";
import {
  BOARD,
  formatDateCourte,
  formatDateLongue,
  stylesCommuns as s,
} from "./styles";

export type LigneRapport = {
  id: string;
  dateRapport: Date;
  resultat: ResultatVerification;
  organismeVerif: string | null;
  libelleObligation: string;
  equipementLibelle: string;
  domaine: DomaineObligation | null;
  fichierNomOriginal: string;
  commentaires: string | null;
};

export type LigneVerif = {
  id: string;
  libelleObligation: string;
  equipementLibelle: string;
  datePrevue: Date;
  /** `datePrevue` est-elle une VRAIE échéance (`aUnRendezVous`) ? Sans elle,
   *  la date est celle de la génération : le document l'imprimait dans la
   *  colonne « Échéance » (relecture système du 2026-09-14). */
  echeanceConnue: boolean;
  /** Le statut PEINT — l'état du jour, « en retard » compris. */
  statut: StatutPeint;
  domaine: DomaineObligation | null;
  /**
   * La ligne naît-elle d'un engagement contractuel (ADR-032) ? Portée par le
   * type partagé, donc le registre et le dossier de conformité la reçoivent
   * ensemble : un PDF remis à un assureur ou à un acquéreur qui présenterait
   * une échéance contractuelle comme réglementaire est une affirmation que le
   * produit ne peut pas soutenir, et le papier ne se corrige pas après coup.
   */
  contractuelle: boolean;
};

/**
 * Une fiche du registre, mise à plat pour l'impression.
 *
 * Une seule forme de contenu est remplie à la fois — c'est la forme de la
 * fiche qui décide. Aucune n'est remplie quand rien ne la recueille : la
 * fiche s'imprime quand même, avec son état, parce qu'une fiche due absente
 * du document ferait croire le registre complet.
 */
export type FichePdf = {
  id: string;
  titre: string;
  attendu: string;
  raisons: string[];
  /** L'état de remplissage, dans les mots de l'écran. */
  etat: string;
  ton: "faite" | "renvoi" | "attente" | "muet";
  /**
   * La date de tenue de la fiche — le « Date ou mise à jour : le … » que
   * chaque feuille du registre imprimé porte en pied. `null` pour les fiches
   * qu'un autre écran alimente : leur fraîcheur n'est pas celle d'une saisie,
   * et imprimer une date inventée serait pire que n'en imprimer aucune.
   */
  misAJourLe: Date | null;
  /** Forme « établissement » ou « formulaire » : des questions et réponses. */
  champs?: { libelle: string; valeur: string }[];
  /** Forme « journal » : des lignes empilées. */
  colonnes?: string[];
  lignes?: string[][];
  /** Fiche tenue par un autre écran : ce qu'il porte, et lequel. */
  source?: string;
  tenues?: { titre: string; meta: string }[];
};

export type PartiePdf = {
  id: string;
  titre: string;
  fiches: FichePdf[];
};

export type BilanPdf = {
  dues: number;
  outillees: number;
  faites: number;
  aRemplir: number;
  tenuesAilleurs: number;
  nonOutillees: number;
};

export type RegistreData = {
  entreprise: string;
  etablissement: string;
  adresse: string;
  genereLe: Date;
  /** Les fiches dues, dans l'ordre du document. */
  parties: PartiePdf[];
  bilan: BilanPdf;
  rapports: LigneRapport[];
  verifsEnAttente: LigneVerif[];
};

const LIBELLE_STATUT_VERIF: Record<StatutPeint, string> = {
  a_planifier: "À planifier",
  planifiee: "Planifiée",
  en_retard: "En retard",
  realisee_conforme: "Conforme",
  realisee_observations: "Observations",
  realisee_ecart_majeur: "Écart majeur",
};


// Mise en page propre au registre.
//
// Le document ne cherche pas une identité à lui : il reprend celle du
// registre imprimé qu'il remplace — une page de garde, un sommaire, puis des
// feuilles, chacune titrée et datée. C'est le vocabulaire que connaît la
// personne qui l'ouvrira, souvent un contrôleur, et le seul qui lui permette
// de retrouver une pièce sans lire le tout.
const sr = StyleSheet.create({
  // Le filet vert sous la marque : le seul geste de couleur de la couverture
  // du registre imprimé, et sa signature. Il se retrouve sous le sur-titre de
  // chaque feuille.
  gardeFilet: { borderTopWidth: 2.5, borderTopColor: BOARD.cielDoux, width: 62 },
  gardeMarque: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: BOARD.ardoiseDouce,
    marginBottom: 10,
  },
  gardeTitre: {
    fontSize: 30,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.15,
    marginTop: 18,
    color: BOARD.encre,
  },
  gardeLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.6,
    color: BOARD.ardoiseMoyenne,
    marginBottom: 3,
  },
  gardeValeur: { fontSize: 12, marginBottom: 16, color: BOARD.encre },

  // En-tête de partie : le numéro porte le repère, le titre porte le sens.
  partieTete: {
    flexDirection: "row",
    alignItems: "baseline",
    borderBottomWidth: 1.5,
    borderBottomColor: BOARD.encre,
    paddingBottom: 5,
    marginTop: 22,
    marginBottom: 2,
  },
  partieNum: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    width: 42,
    color: BOARD.encre,
  },
  // Le vert du modèle ne porte jamais de texte de structure : il ponctue.
  // Un numéro de partie en vert se lisait délavé à côté du titre marine.
  partieAccent: {
    borderTopWidth: 2.5,
    borderTopColor: BOARD.cielDoux,
    width: 26,
    marginTop: 22,
  },
  partieTitre: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: BOARD.encre,
  },

  ficheTete: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 0.5,
    borderBottomColor: BOARD.ardoiseFilet,
    paddingBottom: 3,
  },
  ficheTitre: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: BOARD.encre,
  },
  // L'en-tête de tableau du board : petites capitales ardoise sur creux
  // pâle, filet dessous. C'est exactement ce que rend `FicheJournal` à
  // l'écran — le document et l'écran doivent se reconnaître.
  //
  // Le creux est ajouté pour l'impression : à l'écran, l'espace suffit à
  // détacher l'en-tête ; sur une page qui empile plusieurs grilles, il
  // fallait un fond pour l'attraper d'un coup d'œil.
  bandeTete: {
    flexDirection: "row",
    backgroundColor: BOARD.ardoisePale,
    borderBottomWidth: 0.75,
    borderBottomColor: BOARD.ardoise,
    paddingVertical: 4,
    paddingHorizontal: 5,
    marginTop: 6,
  },
  bandeTh: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: BOARD.ardoiseDouce,
  },
  // La pastille d'état, comme à l'écran : le champ et l'encre viennent des
  // mêmes jetons que le calendrier. Une fiche qui reste à remplir n'est pas
  // en retard — pas de rose ici, rien n'a d'échéance sur ce document.
  pastille: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  ligneTableau: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: BOARD.ardoiseFilet,
    paddingVertical: 3.5,
    paddingHorizontal: 5,
  },
  // Le pied de feuille du registre imprimé, qui date la tenue de la fiche.
  fichePied: {
    marginTop: 5,
    fontSize: 7.5,
    color: BOARD.ardoiseMoyenne,
    textAlign: "right",
  },
  cle: { fontSize: 9, color: BOARD.ardoiseMoyenne, width: "42%" },
  valeur: { fontSize: 9, width: "58%", color: BOARD.encre },

  sommaireCol: { width: "48%" },
  sommairePartie: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginTop: 10,
    marginBottom: 3,
    color: BOARD.encre,
  },
  sommaireFiche: {
    fontSize: 8.5,
    color: BOARD.ardoiseMoyenne,
    marginBottom: 1.5,
  },
});

/** Champ et encre de la pastille d'état, par ton. Mêmes jetons qu'à l'écran. */
const HABILLAGE_ETAT: Record<
  FichePdf["ton"],
  { fond: string; encre: string }
> = {
  faite: { fond: BOARD.vert, encre: BOARD.vertEncre },
  renvoi: { fond: BOARD.cielPale, encre: BOARD.bleuEncre },
  attente: { fond: BOARD.ardoisePale, encre: BOARD.ardoiseMoyenne },
  muet: { fond: BOARD.carte, encre: BOARD.ardoiseDouce },
};

/** Une fiche que rien ne recueille n'a pas d'aplat : elle porte un contour. */
const CONTOUR_MUET = {
  borderWidth: 0.5,
  borderColor: BOARD.ardoise,
  borderStyle: "dashed",
} as const;

/** Ce que dit le pied d'une feuille — une date, ou pourquoi il n'y en a pas. */
function piedDeFiche(fiche: FichePdf): string {
  if (fiche.misAJourLe) {
    return `Date ou mise à jour : le ${formatDateLongue(fiche.misAJourLe)}`;
  }
  if (fiche.source) return `Tenue depuis ${fiche.source}`;
  return "Conservée hors de l'application";
}

/** Une feuille du registre : son titre, son état, ce qu'elle porte, sa date. */
function FichePdfVue({ fiche }: { fiche: FichePdf }) {
  const largeur = (n: number) => `${(100 / n).toFixed(4)}%`;

  return (
    // ⚠ Cette vue SE PAGINE, et il ne faut pas y remettre `wrap={false}`.
    //
    // Elle l'a porté, et react-pdf ne sait pas couper un bloc non sécable :
    // tout ce qui dépassait la page était émis hors-page et jamais imprimé.
    // Mesuré sur ce composant — un journal de 400 lignes rendait 5 pages, un
    // journal de 1000 lignes en rendait 5 aussi, seul le poids du fichier
    // changeait. Le dirigeant tendait alors à un inspecteur un registre
    // coupé au milieu d'une fiche, sans que rien ne l'indique.
    //
    // Seule la tête reste insécable : un titre de fiche seul en bas de page
    // est laid, un corps tronqué est faux.
    <View style={{ marginTop: 14 }}>
      <View wrap={false}>
        <View style={sr.ficheTete}>
          <Text style={sr.ficheTitre}>{fiche.titre}</Text>
          <Text
            style={[
              sr.pastille,
              {
                backgroundColor: HABILLAGE_ETAT[fiche.ton].fond,
                color: HABILLAGE_ETAT[fiche.ton].encre,
              },
              fiche.ton === "muet" ? CONTOUR_MUET : {},
            ]}
          >
            {fiche.etat}
          </Text>
        </View>
        <Text style={[s.small, { marginTop: 3 }]}>{fiche.attendu}</Text>
      </View>

      {/* Forme « établissement » ou « formulaire » : des questions, des
          réponses. Une question sans réponse s'imprime quand même — c'est
          elle qui dit ce qui manquerait à une visite. */}
      {fiche.champs && (
        <View style={{ marginTop: 6 }}>
          {fiche.champs.map((c) => (
            <View
              key={c.libelle}
              wrap={false}
              style={{
                flexDirection: "row",
                borderBottomWidth: 0.5,
                borderBottomColor: BOARD.ardoiseFilet,
                paddingVertical: 2.5,
              }}
            >
              <Text style={sr.cle}>{c.libelle}</Text>
              <Text style={sr.valeur}>{c.valeur}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Forme « journal ». Les colonnes s'impriment même sans ligne : une
          fiche vide doit montrer ce qu'on attendait d'elle.

          L'en-tête est `fixed` : une table qui court sur plusieurs pages
          sans rappeler ses intitulés ne se lit plus dès la deuxième. */}
      {fiche.colonnes && (
        <View style={{ marginTop: 6 }}>
          <View style={sr.bandeTete} fixed>
            {fiche.colonnes.map((c) => (
              <Text
                key={c}
                style={[sr.bandeTh, { width: largeur(fiche.colonnes!.length) }]}
              >
                {c}
              </Text>
            ))}
          </View>
          {(fiche.lignes ?? []).length === 0 ? (
            <Text style={[s.small, { marginTop: 4 }]}>
              Aucune ligne consignée à ce jour.
            </Text>
          ) : (
            fiche.lignes!.map((ligne, i) => (
              <View key={i} style={sr.ligneTableau} wrap={false}>
                {ligne.map((v, j) => (
                  <Text
                    key={j}
                    style={[
                      s.td,
                      { width: largeur(ligne.length), color: BOARD.encre },
                    ]}
                  >
                    {v}
                  </Text>
                ))}
              </View>
            ))
          )}
        </View>
      )}

      {/* Fiche tenue par un autre écran : son contenu s'imprime ici, parce
          que c'est ici qu'il est présenté. */}
      {fiche.tenues && (
        <View style={{ marginTop: 6 }}>
          {fiche.tenues.length === 0 ? (
            <Text style={s.small}>
              Rien de déclaré à ce jour dans {fiche.source}.
            </Text>
          ) : (
            <>
              <View style={sr.bandeTete} fixed>
                <Text style={[sr.bandeTh, { width: "50%" }]}>Désignation</Text>
                <Text style={[sr.bandeTh, { width: "50%" }]}>
                  Emplacement ou échéance
                </Text>
              </View>
              {fiche.tenues.map((t, i) => (
                <View key={i} style={sr.ligneTableau} wrap={false}>
                  <Text style={[s.td, { width: "50%", color: BOARD.encre }]}>
                    {t.titre}
                  </Text>
                  <Text
                    style={[s.td, { width: "50%", color: BOARD.ardoiseMoyenne }]}
                  >
                    {t.meta}
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      {/* Rien ne la recueille : le dire, plutôt que d'imprimer un blanc. */}
      {!fiche.champs && !fiche.colonnes && !fiche.tenues && (
        <Text style={[s.small, { marginTop: 5 }]}>
          Cette fiche est due mais n&apos;est pas tenue dans l&apos;application.
          Elle est conservée sur un autre support et se présente avec le présent
          registre.
        </Text>
      )}

      <Text style={sr.fichePied}>{piedDeFiche(fiche)}</Text>
    </View>
  );
}

/**
 * Le pied de page, à instancier une fois par `Page`.
 *
 * ⚠ **Sans numéro de page, et ce n'est pas un oubli.** La prop `render` de
 * `@react-pdf/renderer` (4.5.1) ne produit rien — vérifié en isolant les
 * quatre variantes : `fixed` + texte statique s'imprime, `render` ne
 * s'imprime jamais, qu'il rende une chaîne ou un nœud, avec ou sans `fixed`,
 * sur un `Text` comme sur un `View`.
 *
 * Le défaut ne vient pas de ce document : `stylesCommuns.footer` est utilisé
 * avec `render` par les quatre PDF du produit (DUERP, plan d'actions,
 * dossier de conformité, registre), qui perdent donc tous leur pied de page
 * en silence. Le rétablir partout suppose de monter de version ou de
 * numéroter autrement, ce qui se décide à l'échelle du dossier `pdf/`.
 *
 * En attendant, mieux vaut un pied qui s'imprime sans numéro qu'un pied
 * qui ne s'imprime pas : sur un document d'une cinquantaine de feuilles
 * présenté à un contrôleur, savoir de quel établissement il s'agit est ce
 * qui compte le plus.
 */
function PiedDePage({ etablissement }: { etablissement: string }) {
  return (
    <Text
      style={[s.footer, { color: BOARD.ardoiseMoyenne, borderTopColor: BOARD.ardoiseFilet }]}
      fixed
    >
      {etablissement} — Registre de sécurité incendie
    </Text>
  );
}

export function RegistreDocument({ data }: { data: RegistreData }) {

  // Le sommaire se lit sur deux colonnes, comme celui du registre imprimé :
  // dix parties et une cinquantaine de fiches tiennent alors sur une page, et
  // l'on voit la forme du document d'un seul regard.
  const moitie = Math.ceil(data.parties.length / 2);
  const colonnes = [
    data.parties.slice(0, moitie),
    data.parties.slice(moitie),
  ];

  return (
    <Document>
      {/* Page de garde — l'identité de l'établissement, et rien d'autre.
          C'est la page qu'on pose sur une table devant un contrôleur. */}
      <Page
        size="A4"
        style={[s.pageGarde, { flexDirection: "column", justifyContent: "space-between" }]}
      >
        <View>
          <Text style={sr.gardeMarque}>Rojer</Text>
          <View style={sr.gardeFilet} />
          <Text style={sr.gardeTitre}>
            Registre{"\n"}de sécurité{"\n"}incendie
          </Text>
        </View>

        {/* L'identité en pied de page, comme sur la couverture du registre
            imprimé : le titre dit ce que c'est, le pied dit de qui. */}
        <View>
          <Text style={sr.gardeLabel}>ÉTABLISSEMENT</Text>
          <Text style={sr.gardeValeur}>{data.etablissement}</Text>

          <Text style={sr.gardeLabel}>ENTREPRISE</Text>
          <Text style={sr.gardeValeur}>{data.entreprise}</Text>

          <Text style={sr.gardeLabel}>ADRESSE</Text>
          <Text style={sr.gardeValeur}>{data.adresse}</Text>

          <Text style={sr.gardeLabel}>DATE D&apos;ÉDITION</Text>
          <Text style={sr.gardeValeur}>{formatDateLongue(data.genereLe)}</Text>
        </View>
      </Page>

      {/* Sommaire et composition. Le premier dit ce que contient le document,
          la seconde ce qui y manque : les deux questions qu'on se pose en
          l'ouvrant, dans cet ordre. */}
      <Page size="A4" style={s.page}>
        <Text style={[s.h1, { color: BOARD.encre }]}>Sommaire</Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {colonnes.map((col, i) => (
            <View key={i} style={sr.sommaireCol}>
              {col.map((partie) => (
                <View key={partie.id} wrap={false}>
                  <Text style={sr.sommairePartie}>
                    {partie.id}  {partie.titre}
                  </Text>
                  {partie.fiches.map((f) => (
                    <Text key={f.id} style={sr.sommaireFiche}>
                      {f.titre}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={s.mentionsLegalesBloc}>
          <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 4 }}>
            Composition de ce registre
          </Text>
          <Text>
            {data.bilan.dues} fiches sont dues pour cet établissement, compte
            tenu de son régime et des équipements déclarés :{" "}
            {data.bilan.faites} renseignées, {data.bilan.tenuesAilleurs}{" "}
            tenues
            depuis le parc d&apos;équipements ou le calendrier,{" "}
            {data.bilan.aRemplir} restant à remplir, et{" "}
            {data.bilan.nonOutillees}{" "}
            conservées hors de l&apos;application.
          </Text>
          <Text style={{ marginTop: 4 }}>
            Ce décompte dit ce que l&apos;application recueille, et rien
            d&apos;autre. Il ne vaut pas attestation de conformité : une fiche
            renseignée peut l&apos;être avec une réponse fausse, et une fiche
            que l&apos;outil ne recueille pas reste due.
          </Text>
        </View>

        <PiedDePage etablissement={data.etablissement} />
      </Page>

      {/* Le corps : les fiches, dans l'ordre du document. */}
      <Page size="A4" style={s.page}>
        {data.parties.map((partie) => (
          <View key={partie.id}>
            {/* L'en-tête a voyagé avec sa première fiche, dans un même bloc
                insécable, pour éviter qu'un titre de partie reste seul en bas
                de page. L'intention était bonne, la portée trop large : la
                partie 4 n'ayant qu'une fiche, son journal d'événements se
                retrouvait toujours enfermé, donc tronqué dès qu'il grossissait.
                Un titre orphelin est un défaut d'allure ; une fiche coupée est
                un document faux. Seul l'en-tête reste insécable. */}
            <View wrap={false} minPresenceAhead={70}>
              <View style={sr.partieAccent} />
              <View style={[sr.partieTete, { marginTop: 6 }]}>
                <Text style={sr.partieNum}>{partie.id}</Text>
                <Text style={sr.partieTitre}>{partie.titre}</Text>
              </View>
            </View>
            {partie.fiches.map((fiche) => (
              <FichePdfVue key={fiche.id} fiche={fiche} />
            ))}
          </View>
        ))}

        <PiedDePage etablissement={data.etablissement} />
      </Page>

      {/* L'index des rapports archivés — la pièce qu'un contrôleur ouvre en
          premier, et la seule qui pointe vers des fichiers conservés à part. */}
      <Page size="A4" style={s.page}>
        <Text style={[s.h1, { color: BOARD.encre }]}>
          Rapports de vérification archivés
        </Text>
        {data.rapports.length === 0 ? (
          <Text style={s.small}>
            Aucun rapport archivé à ce jour. Le registre reste tenu à
            disposition de l&apos;inspection.
          </Text>
        ) : (
          <View>
            <View style={s.thead}>
              <Text style={[s.th, { width: "14%" }]}>Date</Text>
              <Text style={[s.th, { width: "36%" }]}>Obligation</Text>
              <Text style={[s.th, { width: "20%" }]}>Équipement</Text>
              <Text style={[s.th, { width: "16%" }]}>Organisme</Text>
              <Text style={[s.th, { width: "14%" }]}>Résultat</Text>
            </View>
            {data.rapports.map((r) => (
              <View key={r.id} style={s.row} wrap={false}>
                <Text style={[s.td, { width: "14%" }]}>
                  {formatDateCourte(r.dateRapport)}
                </Text>
                <View style={{ width: "36%", paddingRight: 4 }}>
                  <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9.5 }}>
                    {r.libelleObligation}
                  </Text>
                  <Text style={[s.small, { marginTop: 2 }]}>
                    {r.domaine ? LABEL_DOMAINE[r.domaine] : ""}
                  </Text>
                </View>
                <Text style={[s.td, { width: "20%" }]}>
                  {r.equipementLibelle}
                </Text>
                <Text style={[s.td, { width: "16%" }]}>
                  {r.organismeVerif ?? "—"}
                </Text>
                <Text style={[s.td, { width: "14%" }]}>
                  {LABEL_RESULTAT[r.resultat]}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[s.h2, { color: BOARD.encre }]}>
          Vérifications en attente ou programmées
        </Text>
        {data.verifsEnAttente.length === 0 ? (
          <Text style={s.small}>
            Aucune vérification en cours. Déclarez vos équipements pour peupler
            le calendrier.
          </Text>
        ) : (
          <View>
            <View style={s.thead}>
              <Text style={[s.th, { width: "14%" }]}>Échéance</Text>
              <Text style={[s.th, { width: "40%" }]}>Obligation</Text>
              <Text style={[s.th, { width: "25%" }]}>Équipement</Text>
              <Text style={[s.th, { width: "21%" }]}>Statut</Text>
            </View>
            {data.verifsEnAttente.map((v) => (
              <View key={v.id} style={s.row} wrap={false}>
                <Text style={[s.td, { width: "14%" }]}>
                  {/* Une date de génération n'est pas une échéance : on ne
                      l'imprime pas dans cette colonne (`echeanceConnue`). */}
                  {v.echeanceConnue ? formatDateCourte(v.datePrevue) : "À planifier"}
                </Text>
                <View style={{ width: "40%", paddingRight: 4 }}>
                  <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9.5 }}>
                    {v.libelleObligation}
                  </Text>
                  <Text style={[s.small, { marginTop: 2 }]}>
                    {v.domaine ? LABEL_DOMAINE[v.domaine] : ""}
                  </Text>
                  {/* Sous l'obligation, en ambre : c'est la place où la ligne
                      dit ce qu'elle est, et le domaine y est vide pour une
                      obligation sur mesure. Le registre se lit devant une
                      commission de sécurité — ce document ne peut pas laisser
                      une échéance d'assurance passer pour du droit
                      (ADR-032). */}
                  {v.contractuelle && (
                    <Text
                      style={[
                        s.small,
                        { marginTop: 2, color: BOARD.ambreEncre },
                      ]}
                    >
                      {MARQUAGE_CONTRACTUEL}
                    </Text>
                  )}
                </View>
                <Text style={[s.td, { width: "25%" }]}>
                  {v.equipementLibelle}
                </Text>
                <Text style={[s.td, { width: "21%" }]}>
                  {LIBELLE_STATUT_VERIF[v.statut]}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.mentionsLegalesBloc}>
          {/* Trois références, et pas une de plus. R. 143-44 CCH fonde le
              registre en ERP, L. 4711-1 et L. 4711-5 CT le fondent côté
              employeur — ce sont les deux régimes que ce générateur sert.

              R. 146-35 CCH, qui figurait ici, n'y est plus : c'est l'article
              du registre **IGH**, et l'IGH est hors périmètre du produit
              (`src/lib/perimetre/couverture.ts` l'écarte avant même de
              regarder la catégorie ERP). Ce document n'est donc jamais
              présenté par un IGH, et la citation ne rencontrait personne.
              C'est le même défaut que celui corrigé sur L. 4711-5 en août
              2026 — une référence qui ne vise pas son lecteur. Si l'IGH
              entre un jour au périmètre, elle reviendra avec lui, et ce sera
              un ajout conscient plutôt qu'un héritage. */}
          <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 4 }}>
            Tenue du registre (R. 143-44 CCH · L. 4711-1 et L. 4711-5 CT)
          </Text>
          <Text>
            Ce registre réunit les fiches dues à cet établissement, leur contenu
            et les rapports de vérification archivés, à tenir à disposition de
            l&apos;inspection du travail et de la commission de sécurité. Les
            fichiers originaux des rapports sont conservés et téléchargeables
            depuis l&apos;application.
          </Text>
        </View>

        <PiedDePage etablissement={data.etablissement} />
      </Page>
    </Document>
  );
}
