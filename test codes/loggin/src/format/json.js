import { safeJsonStringify } from "../utils/safeJson.js";

export function formatJsonLine(entry) {
  return safeJsonStringify(entry) + "\n";
}
