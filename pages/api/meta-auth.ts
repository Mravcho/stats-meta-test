import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

const META_APP_ID = process.env.META_APP_ID!;
const APP_URL = (process.env.APP_URL || 'https://stats-meta-test.vercel.app').replace(/\/$/, '');

const SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'business_management',
  'ads_read',
  'read_insights',
].join(',');

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const state = crypto.randomBytes(16).toString('hex');
  // Store state in cookie
  res.setHeader('Set-Cookie', `meta_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);
  const params = new URLSearchParams({
    client_id: META_APP_ID,
    redirect_uri: `${APP_URL}/api/meta-callback`,
    scope: SCOPES,
    response_type: 'code',
    state,
  });
  res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
}
