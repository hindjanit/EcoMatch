import { fail, HttpError } from "@/lib/trust/server";
// Never accept generic unsigned 'paid' payloads. A real adapter must validate the
// provider's raw-body signature, event id, currency, amount and merchant account.
export async function POST(){return fail(new HttpError(503,"No production webhook adapter is enabled. Mock transactions use authenticated demo controls."));}
