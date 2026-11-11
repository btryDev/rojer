import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/**
 * Le retour d'une page du DUERP (2026-11-12) : un bouton clair « ← … », le
 * même partout — en tête des pages de détail et en pied des étapes. Il y
 * avait trois formes (capitales monospacées, lien gris, bouton).
 */
export function LienRetour({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={buttonVariants({ variant: "boardClair", size: "boardSm" })}>
      ← {children}
    </Link>
  );
}
