/** Format/checksum screening only. A passing value is deliberately never evidence
 * that a GST registration is active or that its holder is verified. */
export function isValidGstinFormat(gstin: string) {
  const value = gstin.trim().toUpperCase();
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value)) return false;
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let factor = 2;
  let sum = 0;
  for (let index = value.length - 2; index >= 0; index -= 1) {
    const code = chars.indexOf(value[index]);
    const product = code * factor;
    sum += Math.floor(product / 36) + (product % 36);
    factor = factor === 2 ? 1 : 2;
  }
  return chars[(36 - (sum % 36)) % 36] === value[14];
}

export const identityLabel = (status?: string | null, method?: string | null) =>
  status === "verified" ? (["aadhaar", "uidai_offline_ekyc"].includes(method || "") ? "Aadhaar Verified" : "Identity Verified") :
  status === "verified_demo" ? "Identity Verified — Demo" : "Not Verified";

export const businessLabel = (status?: string | null, method?: string | null) =>
  status === "verified" ? (method === "demo" ? "GST Verification — Demo" : "GST Verified Business") : "Not Verified";
