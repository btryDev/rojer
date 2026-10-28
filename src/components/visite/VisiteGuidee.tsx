import { cookies } from "next/headers";
import { cookieVisiteMasquee, type CleVisite } from "@/lib/visite/visites";
import { IlotVideoVisite } from "./IlotVideoVisite";

/** La visite guidée d'une page : rien si l'utilisateur a demandé à ne plus la voir. */
export async function VisiteGuidee({ cle }: { cle: CleVisite }) {
  if ((await cookies()).has(cookieVisiteMasquee(cle))) return null;
  return <IlotVideoVisite cle={cle} />;
}
