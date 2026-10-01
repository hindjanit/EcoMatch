import test from "node:test";
import assert from "node:assert/strict";
import { isValidGstinFormat, businessLabel, identityLabel } from "../src/lib/trust/business";

test("GSTIN checksum is only a screening gate", () => {
  assert.equal(isValidGstinFormat("27AAPFU0939F1ZV"), true);
  assert.equal(isValidGstinFormat("27AAPFU0939F1ZA"), false);
  assert.equal(businessLabel("pending", "manual_official_lookup"), "Not Verified");
  assert.equal(businessLabel("verified", "manual_official_lookup"), "GST Verified Business");
});

test("identity labels never claim Aadhaar without that method", () => {
  assert.equal(identityLabel("verified", "government_id"), "Identity Verified");
  assert.equal(identityLabel("verified", "uidai_offline_ekyc"), "Aadhaar Verified");
  assert.equal(identityLabel("verified_demo", "demo"), "Identity Verified — Demo");
});
