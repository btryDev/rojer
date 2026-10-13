import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EcranIncident } from "@/components/layout/EcranIncident";

/**
 * Page introuvable — une URL qui ne mène nulle part, ou un `notFound()` levé
 * par une page ou une action (un dossier d'un autre compte y tombe aussi, à
 * dessein : la réponse ne dit pas s'il existe).
 */
export default function NotFound() {
  return (
    <>
      <title>Page introuvable — Rojer</title>
      <EcranIncident
        surTitre="Page introuvable"
        titre="Cette page n'existe pas."
        actions={
          <Link href="/" className={buttonVariants({ variant: "board", size: "board" })}>
            Revenir à l&apos;accueil
          </Link>
        }
      >
        <p className="m-0">
          Le lien est peut-être incomplet, ou la page a été retirée. Si vous
          l&apos;avez ouvert depuis votre dossier, revenez-y : il vous mènera à
          la bonne adresse.
        </p>
      </EcranIncident>
    </>
  );
}
