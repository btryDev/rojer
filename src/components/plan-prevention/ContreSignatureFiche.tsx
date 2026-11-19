import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { formaterDateFr } from "@/lib/dates";
import {
  ecartsDeLaProposition,
  propositionSchema,
  type PlanComparable,
} from "@/lib/plan-prevention/proposition";
import { TraiterPropositionBoutons } from "./ContreSignatureBoutons";

/**
 * Ce que la fiche du plan montre de la contre-signature (ADR-061) : la
 * proposition de l'entreprise extérieure qui attend une décision, et les
 * signatures révoquées — jamais effacées, montrées à part.
 */

const CARTE =
  "rounded-[22px] border border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] p-5";

function Ligne({ libelle, texte }: { libelle: string; texte: string | null | undefined }) {
  if (!texte) return null;
  return (
    <p className="m-0 text-[13px] leading-[1.55]">
      <span className="text-[color:var(--board-slate-mid)]">{libelle} : </span>
      {texte}
    </p>
  );
}

export function PropositionEnAttente({
  proposition,
  plan,
}: {
  proposition: { id: string; contenu: Prisma.JsonValue; createdAt: Date };
  plan: PlanComparable;
}) {
  const lue = propositionSchema.safeParse(proposition.contenu);
  const e = lue.success ? ecartsDeLaProposition(plan, lue.data) : null;
  return (
    <section className={`${CARTE} space-y-4`} aria-labelledby="proposition-titre">
      <div>
        <h2 id="proposition-titre" className="m-0 text-[17px] font-semibold tracking-[-0.01em]">
          L&apos;entreprise extérieure propose une modification
        </h2>
        <p className="mt-1 text-[13px] text-[color:var(--board-slate-mid)]">
          Reçue le {formaterDateFr(proposition.createdAt)}. Aucune signature ne se recueille
          avant votre décision. Accepter révoque les signatures déjà posées ; refuser les
          laisse valables.
        </p>
      </div>

      {!e ? (
        <p className="m-0 text-[13px] text-[color:var(--board-signal-ink)]">
          Cette proposition ne se lit plus : refusez-la et corrigez le plan à la main.
        </p>
      ) : (
        <div className="space-y-3">
          {e.fiche.length > 0 && (
            <div className="space-y-1">
              <p className="m-0 text-[13px] font-semibold">Fiche de l&apos;entreprise extérieure</p>
              {e.fiche.map((c) => (
                <p key={c.champ} className="m-0 text-[13px] leading-[1.55]">
                  {c.libelle} : <s>{c.avant || "—"}</s> → {c.apres || "—"}
                </p>
              ))}
            </div>
          )}
          {e.modifiees.map(({ avant, apres }) => (
            <div key={avant.id} className="space-y-1">
              <p className="m-0 text-[13px] font-semibold">Risque modifié</p>
              <p className="m-0 text-[13px] leading-[1.55]">
                <s>{avant.risque}</s>
              </p>
              <Ligne libelle="Devient" texte={apres.risque} />
              <Ligne libelle="Votre mesure" texte={apres.mesureEntrepriseUtilisatrice} />
              <Ligne libelle="Sa mesure" texte={apres.mesureEntrepriseExterieure} />
            </div>
          ))}
          {e.ajoutees.map((l, i) => (
            <div key={`ajout-${i}`} className="space-y-1">
              <p className="m-0 text-[13px] font-semibold">Risque ajouté</p>
              <Ligne libelle="Risque" texte={l.risque} />
              <Ligne libelle="Votre mesure" texte={l.mesureEntrepriseUtilisatrice} />
              <Ligne libelle="Sa mesure" texte={l.mesureEntrepriseExterieure} />
            </div>
          ))}
          {e.supprimees.map((l) => (
            <div key={l.id} className="space-y-1">
              <p className="m-0 text-[13px] font-semibold">Risque retiré</p>
              <p className="m-0 text-[13px] leading-[1.55]">
                <s>{l.risque}</s>
              </p>
            </div>
          ))}
        </div>
      )}

      <TraiterPropositionBoutons propositionId={proposition.id} />
    </section>
  );
}

type SignatureRevoquee = {
  id: string;
  signataireNom: string;
  horodatageIso: Date;
  revoqueLe: Date | null;
  revoqueMotif: string | null;
};

export function SignaturesRevoquees({ signatures }: { signatures: SignatureRevoquee[] }) {
  if (signatures.length === 0) return null;
  return (
    <section className={`${CARTE} space-y-2`} aria-labelledby="revoquees-titre">
      <h3 id="revoquees-titre" className="m-0 text-[14px] font-semibold">
        Signatures révoquées
      </h3>
      <p className="m-0 text-[12.5px] text-[color:var(--board-slate-mid)]">
        Une signature révoquée n&apos;est jamais effacée : elle garde sa date et sa preuve.
      </p>
      <ul className="m-0 list-none space-y-1.5 p-0">
        {signatures.map((s) => (
          <li key={s.id} className="text-[13px] leading-[1.55]">
            {s.signataireNom}, signé le {formaterDateFr(s.horodatageIso)}
            {s.revoqueLe && <> — révoquée le {formaterDateFr(s.revoqueLe)}</>}
            {s.revoqueMotif && <> : {s.revoqueMotif}</>}.{" "}
            <Link href={`/verifier/${s.id}`} className="underline">
              Vérifier
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
