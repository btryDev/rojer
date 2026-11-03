import "server-only";
// L'empreinte d'une version des conditions générales : ce que la preuve
// d'acceptation garde (ADR-053 § 8), même empreinte que les signatures
// (ADR-006, `signatures/hash.ts`).

import { sha256Hex } from "@/lib/signatures/hash";
import { CONDITIONS, VERSION_CONDITIONS, type Section } from "./conditions";

export function empreinteConditions(sections: Section[] = CONDITIONS, version = VERSION_CONDITIONS): string {
  return sha256Hex(JSON.stringify({ version, sections }));
}
