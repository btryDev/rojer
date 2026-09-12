// De combien le score bouge-t-il avec l'ADR-034, et pour quel dossier ?
//
// L'ADR le demandait avant le lot N4 : « Le score baissera. De combien, pour
// quel dossier type ? » Ce script répond avec des nombres plutôt qu'avec une
// intuition, et il le fait SANS BASE : il fabrique des dossiers en mémoire,
// puis appelle les fonctions réelles du produit — `repartirVerifications` et
// `calculerScoreDepuisEtat`, les mêmes que le tableau de bord et le dossier
// PDF. Rien à seeder, rien à nettoyer, reproductible à la seconde près.
//
//   pnpm mesure:score
//
// CE QUI EST COMPARÉ, ET POURQUOI DEUX « AVANT ». Une ligne de suivi n'avait
// pas un état d'avant, elle en avait deux, et c'est tout l'objet du lot :
//
//  · « avant, dossier vivant » — la régénération a tourné depuis que l'échéance
//    est passée : elle relançait le cycle (`dateRealisee` effacée, statut
//    `depassee`), et le retard se voyait ;
//  · « avant, dossier immobile » — personne n'a rouvert le calendrier depuis.
//    La ligne gardait `realisee_conforme` avec une `datePrevue` dépassée, et
//    les prédicats la sortaient de TOUS les ensembles : ni retard, ni à venir,
//    ni au dénominateur. C'est le défaut du « lot 3 bis », et c'est le cas
//    NORMAL d'un dirigeant qui ne se connecte pas — donc celui qui compte.
//
// Le nouveau modèle n'a plus qu'un état : la ligne porte l'échéance ouverte,
// et « en retard » est une fonction de la date.

import {
  calculerScoreDepuisEtat,
  type EntreeScoreConformite,
} from "../src/lib/dashboard/score";
import { repartirVerifications } from "../src/lib/pdf/etat-verifications";
import { ajouterMois, cleJourCivil, debutDuJour } from "../src/lib/dates";
import type { VerificationDatee } from "../src/lib/dates/retard";

const MAINTENANT = debutDuJour(new Date());

/** Une ligne décrite par les FAITS, indépendamment du modèle qui la stocke. */
type Fait = {
  /** Mois écoulés depuis le dernier contrôle. `null` = jamais contrôlée. */
  dernierControleIlYaMois: number | null;
  /** Rythme réglementaire, en mois. */
  periodiciteMois: number;
  /** L'obligation ne s'applique plus (appareil retiré, régime changé). */
  archivee?: boolean;
};

type Ligne = VerificationDatee & { derniereRealisation: Date | null };

const moisAvant = (n: number) => ajouterMois(MAINTENANT, -n);

/** La ligne telle que le produit l'écrit DEPUIS l'ADR-034 : une échéance
 *  ouverte, et le contrôle fait lu sur son dernier rapport. */
function ligneApres(f: Fait): Ligne {
  const controle =
    f.dernierControleIlYaMois === null ? null : moisAvant(f.dernierControleIlYaMois);
  const echeance =
    controle === null
      ? moisAvant(1)
      : ajouterMois(controle, f.periodiciteMois);
  return {
    statut: controle === null ? "a_planifier" : "planifiee",
    datePrevue: echeance,
    dateRealisee: null,
    archiveLe: f.archivee ? moisAvant(2) : null,
    derniereRealisation: controle,
    libelleObligation: "Vérification périodique",
  };
}

/**
 * La ligne telle qu'elle était stockée AVANT l'ADR-034. Les règles de
 * classement d'alors sont recopiées plus bas : elles n'existent plus dans le
 * produit, et c'est bien pour ça qu'il faut les réécrire ici pour comparer.
 */
function ligneAvant(f: Fait, dossierVivant: boolean): Ligne {
  const l = ligneApres(f);
  if (f.dernierControleIlYaMois === null) return l;
  const echeancePassee = l.datePrevue.getTime() < MAINTENANT.getTime();
  if (echeancePassee && dossierVivant) {
    // La régénération a relancé le cycle : la preuve quitte la ligne.
    return { ...l, statut: "depassee", dateRealisee: null };
  }
  // Cycle soldé : la ligne porte la réalisation ET le rendez-vous suivant.
  return { ...l, statut: "realisee_conforme", dateRealisee: moisAvant(f.dernierControleIlYaMois) };
}

/** Les prédicats D'AVANT, recopiés — une occurrence réalisée sortait de tout. */
const HORIZON_JOURS = 30;
const estPassee = (d: Date) => d.getTime() < MAINTENANT.getTime();
const dansHorizon = (d: Date) =>
  !estPassee(d) &&
  d.getTime() <= MAINTENANT.getTime() + HORIZON_JOURS * 86_400_000;
const realiseeAvant = (l: Ligne) =>
  l.dateRealisee !== null || l.statut.startsWith("realisee");

function repartirAvant(lignes: Ligne[]) {
  const actives = lignes.filter((l) => l.archiveLe === null);
  const enRetard = actives.filter(
    (l) =>
      !realiseeAvant(l) &&
      (l.statut === "depassee" ||
        ((l.statut === "planifiee" || l.statut === "a_planifier") &&
          estPassee(l.datePrevue))),
  );
  const aPlanifier = actives.filter(
    (l) => !realiseeAvant(l) && l.statut === "a_planifier" && !estPassee(l.datePrevue),
  );
  const aVenir = actives.filter(
    (l) => !realiseeAvant(l) && l.statut === "planifiee" && dansHorizon(l.datePrevue),
  );
  const fenetre = ajouterMois(MAINTENANT, -12).getTime();
  const realisees12m = lignes.filter(
    (l) => l.dateRealisee !== null && l.dateRealisee.getTime() >= fenetre,
  );
  return {
    enRetard: enRetard.length,
    total:
      enRetard.length + aPlanifier.length + aVenir.length + realisees12m.length,
    realisees12m: realisees12m.length,
  };
}

function score(verifs: { total: number; enRetard: number }): number {
  const entree: EntreeScoreConformite = {
    verifs,
    // Isolé volontairement : ni action ouverte, ni DUERP. On mesure l'effet du
    // lot sur les vérifications, pas la note globale d'un dossier réel.
    actions: { ouvertesTotal: 0, enRetard: 0 },
    duerp: null,
    etatsPermanents: { total: 0, enPlace: 0 },
  };
  return calculerScoreDepuisEtat(entree).valeur;
}

type Dossier = { nom: string; faits: Fait[] };

const A_JOUR: Fait[] = Array.from({ length: 10 }, () => ({
  dernierControleIlYaMois: 3,
  periodiciteMois: 12,
}));

const DOSSIERS: Dossier[] = [
  { nom: "Tout à jour, contrôles récents", faits: A_JOUR },
  {
    nom: "3 échéances dépassées sur 10, contrôles récents",
    faits: [
      ...Array.from({ length: 3 }, () => ({
        dernierControleIlYaMois: 7,
        periodiciteMois: 6,
      })),
      ...A_JOUR.slice(0, 7),
    ],
  },
  {
    nom: "3 dépassées, dernier contrôle il y a plus d'un an",
    faits: [
      ...Array.from({ length: 3 }, () => ({
        dernierControleIlYaMois: 14,
        periodiciteMois: 12,
      })),
      ...A_JOUR.slice(0, 7),
    ],
  },
  {
    nom: "Jamais contrôlé : 10 lignes ouvertes, échéance passée",
    faits: Array.from({ length: 10 }, () => ({
      dernierControleIlYaMois: null,
      periodiciteMois: 12,
    })),
  },
  {
    nom: "Parc partiellement retiré : 4 lignes archivées sur 10",
    faits: [
      ...Array.from({ length: 4 }, () => ({
        dernierControleIlYaMois: 14,
        periodiciteMois: 12,
        archivee: true,
      })),
      ...Array.from({ length: 3 }, () => ({
        dernierControleIlYaMois: 14,
        periodiciteMois: 12,
      })),
      ...A_JOUR.slice(0, 3),
    ],
  },
];

const colonne = (v: string | number, n: number) => String(v).padStart(n);

// `cleJourCivil` et non `toISOString` : `MAINTENANT` est minuit à PARIS, donc
// 22:00 UTC la veille — l'entête annonçait le 11 septembre un 12 septembre.
console.log(
  `\nEffet de l'ADR-034 sur le score de conformité — mesuré le ${cleJourCivil(MAINTENANT)}\n`,
);
const NOM = 52;
console.log(
  `${"dossier".padEnd(NOM)} | avant, immobile | avant, régénéré | après | écart`,
);
console.log(
  `${"-".repeat(NOM)}-|-----------------|-----------------|-------|------`,
);

for (const d of DOSSIERS) {
  const apres = repartirVerifications(d.faits.map(ligneApres), MAINTENANT);
  const immobile = repartirAvant(d.faits.map((f) => ligneAvant(f, false)));
  const vivant = repartirAvant(d.faits.map((f) => ligneAvant(f, true)));

  const sApres = score({ total: apres.total, enRetard: apres.enRetard.length });
  const sImmobile = score(immobile);
  const sVivant = score(vivant);

  console.log(
    `${d.nom.padEnd(NOM)} | ${colonne(sImmobile, 15)} | ${colonne(sVivant, 15)} | ${colonne(sApres, 5)} | ${colonne(sApres - sImmobile, 5)}`,
  );
  // La ligne de dessous dit d'où vient la note : retards sur lignes comptées.
  console.log(
    `${"".padEnd(NOM)} | ${colonne(`${immobile.enRetard} ret./${immobile.total} lig.`, 15)} | ${colonne(`${vivant.enRetard} ret./${vivant.total} lig.`, 15)} | ${colonne(`${apres.enRetard.length}/${apres.total}`, 5)} |`,
  );
}

console.log(
  "\nLecture : « avant (immobile) » est le cas normal d'un dirigeant qui ne\n" +
    "rouvre pas son calendrier — c'est ce que l'écran lui montrait. L'écart de\n" +
    "la dernière colonne est donc ce qu'il verra changer.\n",
);
