import type { NextApiRequest, NextApiResponse } from 'next';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_ADS_DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || 'LRiFnm2qcnyV5kEwOwk1QQ';

async function refreshToken(refreshToken: string): Promise<string> {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(d));
  return d.access_token;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { type } = req.query;
  let accessToken = req.cookies?.google_access_token;
  const refresh = req.cookies?.google_refresh_token;

  if (!accessToken && !refresh) return res.status(401).json({ error: 'Not connected' });

  // Refresh if needed
  if (!accessToken && refresh) {
    try { accessToken = await refreshToken(refresh); } catch (e: any) { return res.status(401).json({ error: e.message }); }
  }

  try {
    if (type === 'properties') {
      // List GA4 properties
      const r = await fetch(
        'https://analyticsadmin.googleapis.com/v1beta/properties?filter=parent:accounts/-&pageSize=50',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const d = await r.json();
      return res.json(d);
    }

    if (type === 'ga4') {
      const { property_id, since, until } = req.query as Record<string, string>;
      if (!property_id) return res.status(400).json({ error: 'Missing property_id' });

      const r = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${property_id}:runReport`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dateRanges: [{ startDate: since || '30daysAgo', endDate: until || 'today' }],
            dimensions: [{ name: 'sessionDefaultChannelGroup' }],
            metrics: [
              { name: 'sessions' },
              { name: 'totalUsers' },
              { name: 'newUsers' },
              { name: 'bounceRate' },
            ],
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
            limit: 20,
          }),
        }
      );
      return res.json(await r.json());
    }

    if (type === 'ads_customers') {
      const r = await fetch('https://googleads.googleapis.com/v17/customers:listAccessibleCustomers', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
        },
      });
      return res.json(await r.json());
    }

    if (type === 'ads_campaigns') {
      const { customer_id } = req.query as Record<string, string>;
      if (!customer_id) return res.status(400).json({ error: 'Missing customer_id' });

      const r = await fetch(
        `https://googleads.googleapis.com/v17/customers/${customer_id}/googleAds:search`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `SELECT campaign.id, campaign.name, campaign.status,
              metrics.impressions, metrics.clicks, metrics.cost_micros,
              metrics.conversions, metrics.conversions_value
              FROM campaign
              WHERE segments.date DURING LAST_30_DAYS
              AND campaign.status != 'REMOVED'
              ORDER BY metrics.cost_micros DESC LIMIT 20`,
          }),
        }
      );
      return res.json(await r.json());
    }

    return res.status(400).json({ error: 'Unknown type' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
