// Le barrel du kit. Les pages PUBLIQUES (connexion, inscription, mot de passe,
// vérification et signature, accès externe) importent chaque composant par son
// fichier, pas d'ici : sur `/login`, passer par le barrel coûtait 28 Ko
// (9 Ko gzip) de plus, mesuré le 2026-10-14 (audit Next.js, M8).
export type { Charte } from "./charte";
export {
  StatusPill,
  STATUS_LABEL,
  STATUS_LABEL_BOARD,
  type StatusKind,
} from "./StatusPill";
export { LegalBadge } from "./LegalBadge";
export { WhyCard } from "./WhyCard";
export { SignatureBlock } from "./SignatureBlock";
export { ComplianceTimeline, type TimelineItem } from "./ComplianceTimeline";
export { EvidenceDropzone } from "./EvidenceDropzone";
export { AideEcran } from "./AideEcran";
export { FilRetour } from "./FilRetour";
export { ChampBoard, SectionChamps } from "./ChampBoard";
export { useConfirmation, type Question } from "./Confirmation";
export * from "./fiche";
