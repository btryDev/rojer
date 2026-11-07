"use client";

// Le dépôt du fichier d'un écrit que le règlement fait annexer au registre de
// sécurité (ADR-056) : le schéma d'organisation de la sécurité, un contrat,
// une notice.
//
// LE SEUL DÉPÔT DE « CE QUI DOIT ÊTRE EN PLACE ». L'ADR-027 § 3 interdit
// toute surface de dépôt sur cet écran ; l'ADR-056 l'amende pour ces seules
// lignes, et la garde (`regle.test.ts`) ne tolère qu'ici un champ de fichier.
// La fiche ne le monte que si la ligne en reçoit un (`FicheLigne.fichier`,
// posé par `annexeDeLaLigne`).
//
// Rojer ne lit pas le fichier : déposer vaut déclarer « en place », et la
// phrase sous les réponses dit toujours que Rojer ne vérifie pas.

import { formaterDateFr } from "@/lib/dates";
import { libelleDepot } from "@/lib/etats-permanents/phrases";
import { MIME_AUTORISES } from "@/lib/rapports/validator";
import type { FicheLigne } from "./RevueEnPlace";

export function DepotEcritAnnexe({
  fichier,
  pending,
  onDeposer,
}: {
  fichier: NonNullable<FicheLigne["fichier"]>;
  pending: boolean;
  onDeposer: (fichier: File | undefined, champ: HTMLInputElement) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[22px] bg-[color:var(--board-slate-pale)] px-4 py-3.5 text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)]">
      <p className="m-0">
        <strong className="font-semibold text-[color:var(--board-ink)]">
          À annexer au registre de sécurité.
        </strong>{" "}
        Déposez le fichier ici : le registre le reprend, et le dossier de contrôle le joint.
      </p>
      {fichier.enCours ? (
        <p className="m-0">
          Fichier en cours :{" "}
          <a href={fichier.enCours.href} className={LIEN}>
            {fichier.enCours.nom}
          </a>
          , déposé le {formaterDateFr(new Date(fichier.enCours.deposeLe))}.
        </p>
      ) : (
        <p className="m-0">Aucun fichier déposé.</p>
      )}
      {fichier.precedent && (
        <p className="m-0 text-[12px]">
          Version précédente :{" "}
          <a href={fichier.precedent.href} className={LIEN}>
            {fichier.precedent.nom}
          </a>
          , remplacée le {formaterDateFr(new Date(fichier.precedent.remplaceeLe))}. Elle est effacée
          au prochain dépôt.
        </p>
      )}
      <label className={BOUTON}>
        {libelleDepot(fichier.enCours !== null)}
        <input
          type="file"
          className="sr-only"
          accept={MIME_AUTORISES.join(",")}
          disabled={pending}
          onChange={(e) => onDeposer(e.currentTarget.files?.[0], e.currentTarget)}
        />
      </label>
    </div>
  );
}

const LIEN =
  "font-semibold text-[color:var(--board-blue-ink)] underline-offset-2 hover:text-[color:var(--board-ink)] hover:underline";
const BOUTON =
  "mt-1 inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[17px] py-[9px] text-[13px] font-semibold text-[color:var(--board-ink)] has-[:disabled]:cursor-default has-[:disabled]:opacity-60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--board-blue-strong)]";
