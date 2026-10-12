import type { Signature } from "@prisma/client";
import { BlocCreux, SignatureBlock } from "@/components/ui-kit";

/**
 * Le scellé d'une signature sur une fiche board — la même projection pour les
 * deux parties et pour les deux fiches (plan, permis), qui la recopiaient
 * chacune deux fois.
 */
export function SceauSignature({ s }: { s: Signature }) {
  return (
    <SignatureBlock
      charte="board"
      signataireNom={s.signataireNom}
      signataireRole={s.signataireRole}
      signataireEmail={s.signataireEmail}
      horodatageIso={s.horodatageIso}
      methode={s.methode}
      hashDocument={s.hashDocument}
      nomDocument={s.nomDocument}
      signatureId={s.id}
      verifierHref={`/verifier/${s.id}`}
    />
  );
}

/**
 * Les signatures qu'aucune partie enregistrée ne porte — toutes celles d'avant
 * le 2026-10-12, date à laquelle la partie est entrée en base. Elles ne
 * disparaissent pas (une signature donnée est un fait), et ne comptent pour
 * aucune des deux parties : les fiches les rattachaient par l'adresse, et
 * c'était le défaut (`lib/signatures/parties.ts`).
 */
export function SignaturesSansPartie({ signatures }: { signatures: Signature[] }) {
  if (signatures.length === 0) return null;
  return (
    <BlocCreux>
      <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
        {signatures.length > 1
          ? "Ces signatures ont été posées avant que Rojer n'enregistre au nom de quelle partie on signe : elles ne sont comptées pour aucune des deux."
          : "Cette signature a été posée avant que Rojer n'enregistre au nom de quelle partie on signe : elle n'est comptée pour aucune des deux."}
      </p>
      <div className="mt-3 grid grid-cols-1 gap-[22px] md:grid-cols-2">
        {signatures.map((s) => (
          <SceauSignature key={s.id} s={s} />
        ))}
      </div>
    </BlocCreux>
  );
}
