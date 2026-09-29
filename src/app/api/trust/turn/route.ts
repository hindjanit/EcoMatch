import { createHmac } from 'node:crypto';
import { actor, fail, rateLimit } from '@/lib/trust/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { db, user } = await actor(request, false, true);
    await rateLimit(db, `turn:${user.id}`, 30);

    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 12;
    // TURN only needs an expiring nonce; never disclose the EcoMatch user ID to the relay.
    const username = String(expiresAt);
    const secret = process.env.TURN_SHARED_SECRET || 'openrelayprojectsecret';
    const host = process.env.TURN_HOST || 'staticauth.openrelay.metered.ca';
    const credential = createHmac('sha1', secret).update(username).digest('base64');

    return Response.json({
      iceServers: [
        { urls: `turn:${host}:80`, username, credential },
        { urls: `turn:${host}:443`, username, credential },
        { urls: `turn:${host}:443?transport=tcp`, username, credential },
        { urls: `turns:${host}:443?transport=tcp`, username, credential },
      ],
      expiresAt,
    });
  } catch (error) {
    return fail(error);
  }
}
