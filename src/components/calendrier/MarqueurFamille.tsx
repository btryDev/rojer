// Marqueur de famille d'une échéance — le second axe du langage du
// calendrier : la couleur dit l'urgence, l'icône dit la famille. Les
// formes géométriques (rond / carré / losange) ne se distinguaient pas
// à 8 px ; les icônes, si — et elles s'expliquent d'elles-mêmes :
//   presse-papiers  contrôles (vérifications périodiques d'équipements)
//   marteau         corrections (actions correctives, signalements)
//   casque          opérations encadrées (permis de feu, plan de prévention)
//   document        documents (DUERP, attestations prestataires)
//   carte           personnel (titres détenus par les salariés)
// La couleur vient de `currentColor` : l'appelant pose la taille et la
// couleur de texte, le marqueur ne décide que du pictogramme.

import {
  ClipboardCheck,
  Droplets,
  FileCheck2,
  FileText,
  Flame,
  Hammer,
  HandshakeIcon,
  HardHat,
  IdCard,
  ListChecks,
  Users,
} from "lucide-react";
import type { FamilleEcheance, TypeEcheance } from "@/lib/calendrier/echeances";

export const LABEL_FAMILLE: Record<FamilleEcheance, string> = {
  controle: "Vérifications",
  travaux: "Corrections",
  operations: "Opérations",
  papiers: "Documents",
  personnel: "Personnel",
};

/**
 * Ce que chaque famille contient, en une phrase.
 *
 * Chacune décrit un **geste**, et un seul : le rangement du calendrier
 * tient à ce que deux familles ne demandent jamais la même chose
 * (ADR-017). `travaux` disait jusqu'ici « corrections **et** opérations » —
 * l'aveu qu'elle en portait deux.
 */
export const DESCRIPTION_FAMILLE: Record<FamilleEcheance, string> = {
  controle: "Suivez les vérifications à faire réaliser sur vos équipements.",
  travaux: "Suivez les corrections à mener sur ce qui a été signalé.",
  // L'échéance porte sur l'**opération**, pas sur la pièce : elle alerte
  // quand l'opération n'a pas démarré, n'est pas close, ou a commencé sans
  // son préalable obligatoire. Le document, lui, existe déjà.
  operations:
    "Suivez les chantiers encadrés : travaux par point chaud et venue d'une entreprise extérieure.",
  papiers:
    "Suivez le renouvellement de vos documents : mise à jour du DUERP et attestations de prestataires.",
  // Ce que l'outil suit vraiment, et pas un mot de plus : les titres que
  // l'employeur a déclarés, quand le texte leur donne un terme (ADR-023).
  // « Suivez le dossier de vos salariés » promettait un dossier du personnel,
  // que ce produit n'est pas et ne veut pas être (docs/rgpd.md § 2.3).
  personnel:
    "Suivez l'échéance des titres que détiennent vos salariés — ceux auxquels un texte donne un terme.",
};

/** Libellés longs, pour le panneau de filtres — explicites sans contexte. */
export const LABEL_FAMILLE_LONG: Record<FamilleEcheance, string> = {
  controle: "Vérifications périodiques",
  travaux: "Corrections & réparations",
  operations: "Opérations encadrées",
  papiers: "Documents à renouveler",
  // « Personnel » nu laissait attendre un onglet du personnel entier. Le
  // libellé long nomme ce que la famille contient : des titres.
  personnel: "Titres du personnel",
};

const ICONE: Record<FamilleEcheance, typeof ClipboardCheck> = {
  controle: ClipboardCheck,
  // Marteau et non clé à molette : `Wrench` désigne « Équipements » dans le
  // rail, et la même icône ne peut pas nommer un objet ici et une action là.
  travaux: Hammer,
  // Casque de chantier : le mot du rail (« Opérations ») et l'icône de sa
  // catégorie, pour que la pastille du calendrier renvoie à l'écran.
  operations: HardHat,
  papiers: FileText,
  // `IdCard`, l'icône de « Équipe » dans le rail — et pas `Users`, qui
  // désigne déjà les prestataires et le type `attestation` (cf. `ICONE_TYPE`
  // plus bas) : la même icône ne peut pas nommer deux objets. La famille ne
  // contient qu'un type, `titre-salarie` ; les deux niveaux portent donc le
  // même pictogramme, ce qui est le même objet vu de deux distances.
  personnel: IdCard,
};



// ---------------------------------------------------------------------------
// Le niveau fin : le type (ADR-016).
//
// La famille regroupe pour filtrer, le type nomme. « Corrections » ne dit
// pas si le dirigeant a devant lui une mesure qu'il a inscrite à son DUERP
// ou une action née d'un rapport de vérification ; le type le dit.

/**
 * Le mot posé devant une ligne. Lexique de l'ADR-015 : « Vérification » et
 * non « Contrôle ».
 *
 * Les deux actions sont **toutes deux** qualifiées. « Action DUERP » face à
 * « Action » laissait croire à une action générique et à un cas particulier,
 * alors que le XOR de l'ADR-002 en fait deux origines de même rang. Qualifier
 * les deux rend aussi le mot « Action » nu disponible pour la famille, sans
 * qu'il nomme deux niveaux de finesse à la fois.
 */
export const LABEL_TYPE: Record<TypeEcheance, string> = {
  verification: "Vérification",
  // « Titre » et non « Attestation » : le mot est déjà pris par la pièce de
  // vigilance d'un prestataire, et le titre d'un salarié couvre aussi
  // l'habilitation et le CACES (ADR-023 § 1).
  "titre-salarie": "Titre salarié",
  "action-duerp": "Action DUERP",
  // ADR-048 : les mots de l'objet.
  "action-verification": "Point à corriger",
  "permis-feu": "Permis de feu",
  "plan-prevention": "Plan de prévention",
  "duerp-maj": "DUERP",
  attestation: "Attestation",
  legionelles: "Analyse légionelles",
};

/**
 * Chaque type porte l'icône de **son module dans le rail** : une ligne
 * d'échéance montre le pictogramme de l'écran d'où elle sort, et le
 * dirigeant relie les deux sans apprendre un second alphabet.
 */
const ICONE_TYPE: Record<TypeEcheance, typeof ClipboardCheck> = {
  verification: ClipboardCheck,
  // `IdCard`, l'icône de « Équipe » dans le rail — et pas `Users`, qui
  // désigne déjà les prestataires et le type `attestation` : la même icône
  // ne peut pas nommer deux objets (ADR-023, conséquences).
  "titre-salarie": IdCard,
  "action-duerp": FileCheck2,
  "action-verification": ListChecks,
  "permis-feu": Flame,
  "plan-prevention": HandshakeIcon,
  "duerp-maj": FileCheck2,
  attestation: Users,
  legionelles: Droplets,
};

export function MarqueurFamille({
  famille = "controle",
  className = "",
}: {
  famille?: FamilleEcheance;
  className?: string;
}) {
  const Icone = ICONE[famille];
  return <Icone aria-hidden className={"flex-none " + className} />;
}

/**
 * Marqueur de nature au niveau fin, **avec son mot**.
 *
 * Le mot n'est pas décoratif : une signalétique qui tient à une icône
 * disparaît en niveaux de gris, à l'impression et pour qui n'y voit pas.
 * `motVisible={false}` le réserve aux lecteurs d'écran quand la surface
 * l'affiche déjà à côté (une méta qui commence par « Vérification · … »).
 */
export function MarqueurEcheance({
  type = "verification",
  motVisible = true,
  className = "",
}: {
  type?: TypeEcheance;
  motVisible?: boolean;
  className?: string;
}) {
  const Icone = ICONE_TYPE[type];
  const mot = LABEL_TYPE[type];
  return (
    <span className={"inline-flex items-center gap-1.5 " + className}>
      <Icone aria-hidden className="size-[13px] flex-none" />
      <span className={motVisible ? "" : "sr-only"}>{mot}</span>
    </span>
  );
}
