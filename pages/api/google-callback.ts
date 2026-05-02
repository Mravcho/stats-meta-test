import type { NextApiRequest, NextApiResponse } from 'next';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const APP_URL = (process.env.APP_URL || 'https://stats-meta-test.vercel.app').replace(/\/$/, '');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state, error } = req.query as Record<string, string>;

  if (error) return res.redirect(`/?error_google=${encodeURIComponent(error)}`);

  const cookieState = req.cookies?.google_state;
  if (!cookieState || cookieState !== state) {
    return res.redirect('/?error_google=invalid_state');
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${APP_URL}/api/google-callback`,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.redirect(`/?error_google=${encodeURIComponent('Token failed: ' + JSON.stringify(tokenData))}`);
    }

    // Store tokens in cookies
    res.setHeader('Set-Cookie', [
      `google_access_token=${tokenData.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`,
      `google_refresh_token=${tokenData.refresh_token || ''}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
    ]);
    return res.redirect('/?google_connected=1');
  } catch (e: any) {
    return res.redirect(`/?error_google=${encodeURIComponent(e.message)}`);
  }
}
