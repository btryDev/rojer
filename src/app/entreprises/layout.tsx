// En-tête global sur ce segment — cf. `LayoutAvecEnTete` (audit Next.js du
// 2026-10-14, M2) — et l'état de l'abonnement (ADR-053 § 3) : les fiches
// d'entreprise s'y modifient.

import { Suspense } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { BandeauAbonnementDuCompte } from "@/components/abonnements/BandeauAbonnementDuCompte";

export default function EntreprisesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AppHeader />
      <Suspense fallback={null}>
        <BandeauAbonnementDuCompte dansLeContenu="mx-6 mt-4 sm:mx-10" />
      </Suspense>
      {children}
    </>
  );
}
