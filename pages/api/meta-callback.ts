import type { NextApiRequest, NextApiResponse } from 'next';

const META_APP_ID = process.env.META_APP_ID!;
const META_APP_SECRET = process.env.META_APP_SECRET!;
const APP_URL = process.env.APP_URL || 'https://stats-meta-test.vercel.app';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state, error } = req.query as Record<string, string>;

  if (error) {
    return res.redirect(`/?error=${encodeURIComponent(error)}`);
  }

  // Verify state from cookie
  const cookieState = req.cookies?.meta_state;
  if (!cookieState || cookieState !== state) {
    return res.redirect('/?error=invalid_state');
  }

  try {
    // Exchange code for short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `client_id=${META_APP_ID}&redirect_uri=${APP_URL}/api/meta-callback` +
      `&client_secret=${META_APP_SECRET}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.redirect(`/?error=${encodeURIComponent('Token exchange failed: ' + JSON.stringify(tokenData))}`);
    }

    // Exchange for long-lived token
    const llRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token` +
      `&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
    );
    const llData = await llRes.json();
    const longToken = llData.access_token || tokenData.access_token;

    // Store token in cookie (for testing only)
    res.setHeader('Set-Cookie', `meta_token=${longToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`);
    return res.redirect('/?connected=1');
  } catch (e: any) {
    return res.redirect(`/?error=${encodeURIComponent(e.message)}`);
  }
}
