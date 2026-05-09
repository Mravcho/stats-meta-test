import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.cookies?.meta_token;
  if (!token) return res.status(401).json({ error: 'Not connected' });

  const { type } = req.query;

  try {
    if (type === 'pages') {
      // Get Facebook Pages
      const r = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account,followers_count&access_token=${token}`
      );
      const data = await r.json();
      if (data.error) {
        console.error('Meta API Error (pages):', data.error);
      }
      return res.json(data);
    }

    if (type === 'posts') {
      const { page_id, page_token, since, until } = req.query as Record<string, string>;
      const timeFilter = since && until ? `&since=${since}&until=${until}` : '';
      const r = await fetch(
        `https://graph.facebook.com/v19.0/${page_id}/posts?` +
        `fields=id,message,story,created_time,full_picture,permalink_url,likes.summary(true),comments.summary(true),shares` +
        `&limit=20${timeFilter}&access_token=${page_token}`
      );
      const data = await r.json();
      if (data.error) {
        console.error('Meta API Error (posts):', data.error);
      }
      return res.json(data);
    }

    if (type === 'ig_posts') {
      const { ig_id, page_token, since, until } = req.query as Record<string, string>;
      const timeFilter = since && until ? `&since=${since}&until=${until}` : '';
      const r = await fetch(
        `https://graph.facebook.com/v19.0/${ig_id}/media?` +
        `fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count` +
        `&limit=20${timeFilter}&access_token=${page_token}`
      );
      return res.json(await r.json());
    }

    if (type === 'ads') {
      const { since, until } = req.query as Record<string, string>;
      // Get ad accounts
      const accountsRes = await fetch(
        `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,currency&access_token=${token}`
      );
      const accountsData = await accountsRes.json();
      if (accountsData.error) return res.json({ error: accountsData.error.message });

      const accounts = accountsData.data || [];
      const allCampaigns: any[] = [];

      for (const account of accounts.slice(0, 3)) {
        const timeRange = since && until
          ? `&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}`
          : '';
        const r = await fetch(
          `https://graph.facebook.com/v19.0/${account.id}/campaigns?` +
          `fields=id,name,status,insights.date_preset(last_30d){spend,impressions,clicks,ctr,cpc,reach}` +
          `${timeRange}&access_token=${token}`
        );
        const data = await r.json();
        (data.data || []).forEach((c: any) => {
          const ins = c.insights?.data?.[0] || {};
          allCampaigns.push({
            id: c.id, name: c.name, status: c.status, account: account.name,
            spend: parseFloat(ins.spend || '0'),
            impressions: parseInt(ins.impressions || '0'),
            clicks: parseInt(ins.clicks || '0'),
            ctr: parseFloat(ins.ctr || '0').toFixed(2),
            cpc: parseFloat(ins.cpc || '0').toFixed(2),
            reach: parseInt(ins.reach || '0'),
          });
        });
      }
      return res.json({ accounts, campaigns: allCampaigns.sort((a, b) => b.spend - a.spend) });
    }

    if (type === 'me') {
      const r = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${token}`);
      return res.json(await r.json());
    }

    return res.status(400).json({ error: 'Unknown type' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
