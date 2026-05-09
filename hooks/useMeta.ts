import { useState, useEffect, useCallback } from 'react';

export interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
}

export interface MetaPost {
  id: string;
  message?: string;
  story?: string;
  created_time: string;
  full_picture?: string;
  permalink_url?: string;
  likes?: { summary: { total_count: number } };
  comments?: { summary: { total_count: number } };
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: string;
  cpc: string;
}

export function useMeta(since: string, until: string) {
  const [metaConnected, setMetaConnected] = useState(false);
  const [metaUser, setMetaUser] = useState('');
  const [pages, setPages] = useState<MetaPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<MetaPage | null>(null);
  const [posts, setPosts] = useState<MetaPost[]>([]);
  const [metaCampaigns, setMetaCampaigns] = useState<MetaCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkMeta = useCallback(async () => {
    try {
      const res = await fetch('/api/meta-data?type=me');
      if (!res.ok) {
        // Not necessarily an error if not connected yet
        return;
      }
      const d = await res.json();

      if (d.id) {
        setMetaConnected(true);
        setMetaUser(d.name);

        const pagesRes = await fetch('/api/meta-data?type=pages');
        if (!pagesRes.ok) throw new Error('Failed to fetch Meta pages');
        const pd = await pagesRes.json();

        if (pd.data) {
          setPages(pd.data);
          setSelectedPage(pd.data[0] || null);
        }
      }
    } catch (e: any) {
      console.error('Meta connection check failed:', e);
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    checkMeta();
  }, [checkMeta]);

  const loadPosts = async () => {
    if (!selectedPage) return;
    setLoading(true);
    setPosts([]);
    setError(null);
    try {
      const params = new URLSearchParams({
        type: 'posts',
        page_id: selectedPage.id,
        page_token: selectedPage.access_token,
        since,
        until,
      });
      const res = await fetch(`/api/meta-data?${params.toString()}`);
      const d = await res.json();

      if (!res.ok || d.error) {
        throw new Error(d.error?.message || d.error || 'Failed to load posts');
      }

      setPosts(d.data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMetaAds = async () => {
    setLoading(true);
    setMetaCampaigns([]);
    setError(null);
    try {
      const params = new URLSearchParams({
        type: 'ads',
        since,
        until,
      });
      const res = await fetch(`/api/meta-data?${params.toString()}`);
      const d = await res.json();

      if (!res.ok || d.error) {
        throw new Error(d.error?.message || d.error || 'Failed to load ads');
      }

      setMetaCampaigns(d.campaigns || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    metaConnected,
    metaUser,
    pages,
    selectedPage,
    setSelectedPage,
    posts,
    metaCampaigns,
    loading,
    error,
    setError,
    loadPosts,
    loadMetaAds,
    refreshConnection: checkMeta,
  };
}
