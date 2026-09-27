# Identity and audit repairs — implementation and verification

## What changed

The old verifier accepted only an `OKY` root with an `s` attribute using a regular expression. Current `OfflinePaperlessKyc` XML has nested `UidData/Poi/Poa/Pht` and an enveloped XMLDSig signature, so it failed before cryptographic verification. The previous certificate URL also returned HTTP 404 during this work.

The verifier now uses strict XML parsing, rejects DTD/entities/malformed/ambiguous signatures, validates a whole-document reference, and reads identity fields only from authenticated signed content. It supports the documented XMLDSig profile and preserves the RSA-SHA256 verification path for legacy OKY files. It never trusts an uploaded `KeyInfo` certificate. UIDAI's published XMLDSig sample uses RSA-SHA1 for SignedInfo and SHA256 for the document digest; this exact legacy profile and RSA-SHA256 are explicitly allowed, without algorithm fallback or bypass. Unsupported algorithms fail verification.

The fixed certificate is fetched only from the current official download URL and its SHA256 fingerprint, RSA key length and validity dates are checked. A changed/expired/unavailable certificate fails closed. Rotation requires reviewing UIDAI's current official certificate and updating the pin; no user-provided certificate can enable verification.

Sources inspected:
- [UIDAI official sample format](https://www.uidai.gov.in/pu/915-developer-section/tutorial-section/11347-offline-ekyc-sample-data.html) (indexed official sample; direct page currently unavailable)
- [UIDAI downloads](https://uidai.gov.in/en/data-and-download)
- [Current certificate](https://backend.uidai.gov.in/get/files/media/document/2026-07/uidai_offline_publickey_2026.cer), HTTP 200 verified; valid 3 February 2026–3 February 2029.
- [xml-crypto verification guidance](https://github.com/node-saml/xml-crypto), especially authenticated signed references and wrapping protection.

## Database changes

Apply `supabase/phase19_identity_and_audit_repairs.sql` once, after phase 18, in staging first. These SQL files are outside Supabase CLI's standard `supabase/migrations/` directory; `supabase db push` will NOT automatically discover them. Use your managed migration process or the SQL Editor in phase order. This task did not apply a live migration.

- New private, service-only `identity_sessions`: authenticated user, method, signed-proof hash (real only), challenge, 10-minute expiry and single-use consumption. No raw XML, Aadhaar number, name, DOB, photo or camera image is persisted by this new flow.
- Profile `identity_presence_status`; supports `verified_demo` with `demo_identity_liveness`. Real success uses `verified` / `uidai_offline_ekyc`.
- Browser profile changes cannot forge protected identity fields. Old client-supplied `complete_identity_verification` and caller-selected OTP setter lose public/authenticated execution privileges.
- Demo reset affects demo verification only, does not erase genuine UIDAI verification, and invalidates outstanding demo sessions.
- Self-pickup OTP/QR verification and both individual confirmations are server-authorized. Direct writes to verification, confirmations and completion are blocked. OTPs use bcrypt, expiry and committed attempt counters; QR tokens are hashed, expiring and single-use. Old SHA256 OTPs must be regenerated after migration. UI fake-QR fallbacks were removed.
- Safety assessments advance the product's moderation version atomically and preserve previous reviews. Stale concurrent assessments cannot overwrite a newer review.
- Call attribution records buyer/seller/unable-to-determine, reviewer, reason and time. Existing enforcement actions record the action in the audit log. Unattributed cases cannot restrict an account; an already blocked attribution must be restored before reassignment.

## Configuration

Existing public Supabase URL/key plus `SUPABASE_SERVICE_ROLE_KEY` are required server-side. Never prefix the service key with NEXT_PUBLIC and never paste it into chat.

Production default:

```env
ECOMATCH_DEMO_MODE=false
```

Judge environment only:

```env
ECOMATCH_DEMO_MODE=true
```

This is the existing shared EcoMatch demo flag; enabling it also makes the other explicitly configured demo providers eligible. No query string, localStorage flag or submitted body field can enable identity demo mode. Real signed-XML verification stays available in a demo environment. Use a separate unverified demo account: real identity status is not overwritten by demo.

The local environment inspected in this task has no service-role key or demo flag. No credentials or .env.local values were changed. Authenticated end-to-end persistence requires that configuration and the migration.

## Judge walkthrough

1. Sign in with a demo account in the server-enabled demo environment.
2. Open `/verify-identity`. Check the JUDGE DEMO MODE notice and synthetic-data disclaimer.
3. Choose **Try Demo Verification**. The server issues a random challenge and synthetic profile: EcoMatch Demo User, age 24, DEMO-prefixed reference.
4. Start the real browser camera and allow permission. Wait for live frames, perform the displayed challenge, then explicitly confirm it.
5. Capture/check the frame. Native FaceDetector, if supported and functioning, requires exactly one face. If unavailable, the UI explains the manual demo confirmation. Movement recognition and face matching are not claimed.
6. Finish verification. Confirm **DEMO VERIFIED** and the three completion messages.
7. `/admin/trust` → Identity shows method, status, presence and timestamp separately. `/profile` shows DEMO VERIFIED without granting genuine verification privileges.
8. Select **Reset Demo Verification** to repeat.

For real verification, upload an extracted, genuinely UIDAI-signed XML. Document verification creates a server-side session; a browser-supplied proof hash cannot activate genuine status. The camera step is an additional self-reported presence exercise. It does not cryptographically bind the camera subject to the document.

## Tests and build

```powershell
node --import tsx --test tests/trust.test.ts tests/identity.test.ts
npx tsc --noEmit
npx eslint src/lib/identity src/lib/trust/qr.ts src/app/api/identity src/app/verify-identity/page.tsx src/app/api/trust/admin/route.ts src/components/TrustCenter.tsx src/app/profile/page.tsx src/app/deals/[id]/page.tsx tests/trust.test.ts tests/identity.test.ts tests/identity-http.test.mjs
npm run build
```

For the HTTP regression tests, start the production build in a separate terminal:

```powershell
$env:ECOMATCH_DEMO_MODE='false'
npm run start -- -p 3107
# From another terminal:
node --test tests/identity-http.test.mjs
```

Observed: 14 domain/cryptographic/database tests passed; 3 production HTTP tests passed. TypeScript and production build passed. Modified-file ESLint: 0 errors; 30 existing warnings in the deal/profile files (unused symbols, image and effect dependency warnings). Full-project lint was not claimed fixed.

Coverage includes tampered/foreign-key/malformed/unsigned XML, missing fields, duplicate/wrapped signatures, legacy OKY; demo defaults and forged query/body flags; server-only session completion and replay; self-pickup unilateral-completion rejection and separate confirmations; complete QR decode at 94 and 829 bytes plus oversized-input rejection; review retry/history; admin attribution and targeted enforcement; existing secure-delivery settlement and reviewed returns.

PGlite uses `tests/phase17-contract.sql`, a minimal prior-schema contract. This is not proof of live schema compatibility. XML signature tests use ephemeral test keys and clearly synthetic data; they are never accepted as production UIDAI credentials.

## Camera and remaining limitations

- Real `getUserMedia`, video preview and local frame capture are implemented. Native face presence detection is optional. Challenge completion is explicitly self-reported, including where native face presence detection exists.
- `identity_liveness_passed` remains false and face-match score remains null; `identity_presence_status` carries the honest result. There is no biometric match, motion classifier or anti-spoof guarantee.
- Production/demo controls were inspected in the browser with the server flag false and true. Real webcam completion was not exercised: the local authenticated session/service-role configuration and live migration were unavailable.
- No genuine private UIDAI XML was supplied, so real-user end-to-end success is not claimed. The official current certificate's reachability/validity was verified.
- No deployment, live database alteration, real payment/logistics activation or live account restriction was performed.
- Server sessions contain only minimal verification metadata. Configure periodic service-role cleanup of expired sessions under the deployment's retention policy; no raw-document or camera retention exists here.

## Files created this task

- `src/lib/identity/ekyc.ts`
- `src/lib/identity/certificate.ts`
- `src/lib/identity/policy.ts`
- `src/app/api/identity/demo/route.ts`
- `src/app/api/identity/session/route.ts`
- `supabase/phase19_identity_and_audit_repairs.sql`
- `tests/identity.test.ts`
- `tests/identity-http.test.mjs`
- `docs/identity-and-audit-repairs.md`

## Existing working-tree files modified this task

- `package.json`, `package-lock.json` (xmldom, xml-crypto, qrcode; QR typings and jsqr test decoder)
- `src/app/api/identity/verify-aadhaar/route.ts`
- `src/app/verify-identity/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/deals/[id]/page.tsx`
- `src/app/api/trust/admin/route.ts`
- `src/components/TrustCenter.tsx`
- `src/lib/trust/qr.ts`
- `tests/trust.test.ts`

Earlier uncommitted work and presentation output were preserved.
