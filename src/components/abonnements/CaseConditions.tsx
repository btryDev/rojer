"use client";
// La case des conditions générales (ADR-053 § 8), jamais cochée d'avance :
// l'essai (`FormulaireEssai`) et le passage au payant (`FormulaireAbonnement`).
// Le serveur refuse sans elle ; elle part sous `accepte=oui`.

import Link from "next/link";
import { CASE_A_COCHER } from "@/components/ui-kit/case-a-cocher";

export function CaseConditions({ accepte, onChange }: { accepte: boolean; onChange: (accepte: boolean) => void }) {
  return (
    <label className="flex max-w-[var(--board-mesure)] items-start gap-3 text-[14px] leading-[1.5]">
      <input
        type="checkbox"
        name="accepte"
        value="oui"
        checked={accepte}
        onChange={(e) => onChange(e.target.checked)}
        className={CASE_A_COCHER}
      />
      <span>
        J&apos;accepte les{" "}
        <Link href="/conditions" target="_blank" className="underline underline-offset-4">
          conditions générales
        </Link>{" "}
        (s&apos;ouvrent dans un nouvel onglet).
      </span>
    </label>
  );
}
