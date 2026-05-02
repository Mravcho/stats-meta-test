import { useState, useEffect } from 'react';

type Page = { id: string; name: string; access_token: string; instagram_business_account?: { id: string } };
type Campaign = { id: string; name: string; status: string; account: string; spend: number; impressions: number; clicks: number; ctr: string; cpc: string; reach: number };
type Post = { id: string; message?: string; story?: string; created_time: string; full_picture?: string; media_url?: string; permalink_url?: string; permalink?: string; like_count?: number; likes?: { summary: { total_count: number } }; comments?: { summary: { total_count: number } }; comments_count?: number };

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [userName, setUserName] = useState('');
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [tab, setTab] = useState<'posts' | 'ig' | 'ads'>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [igPosts, setIgPosts] = useState<Post[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [since, setSince] = useState(() => { const d = new Date(); d.setDate(d.getDate()-30); return d.toISOString().split('T')[0]; });
  const [until, setUntil] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected')) {
      loadUser();
    } else if (params.get('error')) {
      setError(decodeURIComponent(params.get('error')!));
    }
    // Try to load user on mount
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const r = await fetch('/api/meta-data?type=me');
      const d = await r.json();
      if (d.id) {
        setConnected(true);
        setUserName(d.name);
        loadPages();
      }
    } catch {}
  };

  const loadPages = async () => {
    const r = await fetch('/api/meta-data?type=pages');
    const d = await r.json();
    if (d.data) {
      setPages(d.data);
      if (d.data.length > 0) setSelectedPage(d.data[0]);
    }
  };

  const loadPosts = async () => {
    if (!selectedPage) return;
    setLoading(true);
    setPosts([]);
    try {
      const r = await fetch(`/api/meta-data?type=posts&page_id=${selectedPage.id}&page_token=${selectedPage.access_token}&since=${since}&until=${until}`);
      const d = await r.json();
      setPosts(d.data || []);
      if (d.error) setError(d.error.message || JSON.stringify(d.error));
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const loadIgPosts = async () => {
    if (!selectedPage?.instagram_business_account) return;
    setLoading(true);
    setIgPosts([]);
    try {
      const igId = selectedPage.instagram_business_account.id;
      const r = await fetch(`/api/meta-data?type=ig_posts&ig_id=${igId}&page_token=${selectedPage.access_token}&since=${since}&until=${until}`);
      const d = await r.json();
      setIgPosts(d.data || []);
      if (d.error) setError(d.error.message || JSON.stringify(d.error));
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const loadAds = async () => {
    setLoading(true);
    setCampaigns([]);
    try {
      const r = await fetch(`/api/meta-data?type=ads&since=${since}&until=${until}`);
      const d = await r.json();
      setCampaigns(d.campaigns || []);
      if (d.error) setError(d.error);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleLoad = () => {
    setError('');
    if (tab === 'posts') loadPosts();
    else if (tab === 'ig') loadIgPosts();
    else loadAds();
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto', padding: 24, color: '#1d1d1f' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>📱 Meta Integration Test</h1>
      <p style={{ color: '#636366', marginBottom: 24, fontSize: 14 }}>Test environment — not production</p>

      {error && (
        <div style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: '#cc0000' }}>
          ⚠️ {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: '#cc0000' }}>×</button>
        </div>
      )}

      {!connected ? (
        <div style={{ background: '#f5f7ff', border: '1px solid #d0d7ff', borderRadius: 12, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📘</div>
          <h2 style={{ marginBottom: 8 }}>Connect Facebook</h2>
          <p style={{ color: '#636366', marginBottom: 20, fontSize: 14 }}>
            This will request access to your Pages, Instagram and Ads data.
          </p>
          <a href="/api/meta-auth"
            style={{ display: 'inline-block', background: '#1877F2', color: '#fff', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 15 }}>
            f  Connect with Facebook
          </a>
        </div>
      ) : (
        <div>
          {/* Connected header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, background: '#f0fff4', border: '1px solid #c3e6cb', borderRadius: 8, padding: '10px 16px' }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <span style={{ fontWeight: 600 }}>Connected as {userName}</span>
            <a href="/api/meta-auth" style={{ marginLeft: 'auto', fontSize: 13, color: '#0066cc' }}>Reconnect</a>
          </div>

          {/* Page selector */}
          {pages.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, marginRight: 8 }}>Page:</label>
              <select value={selectedPage?.id || ''} onChange={e => setSelectedPage(pages.find(p => p.id === e.target.value) || null)}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }}>
                {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {selectedPage?.instagram_business_account && (
                <span style={{ marginLeft: 10, fontSize: 12, color: '#636366' }}>📸 Instagram connected</span>
              )}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[['posts', '📘 FB Posts'], ['ig', '📸 IG Posts'], ['ads', '📣 Meta Ads']].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id as any)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', background: tab === id ? '#1877F2' : '#fff', color: tab === id ? '#fff' : '#1d1d1f', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                {label}
              </button>
            ))}
          </div>

          {/* Date range + Load */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <input type="date" value={since} onChange={e => setSince(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
            <span style={{ color: '#636366' }}>→</span>
            <input type="date" value={until} onChange={e => setUntil(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
            <button onClick={handleLoad} disabled={loading}
              style={{ padding: '7px 20px', borderRadius: 6, background: '#1877F2', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              {loading ? 'Loading...' : 'Load'}
            </button>
          </div>

          {/* FB Posts */}
          {tab === 'posts' && (
            <div>
              <h3 style={{ marginBottom: 12, fontSize: 16 }}>Facebook Posts ({posts.length})</h3>
              {posts.length === 0 && !loading && <p style={{ color: '#636366', fontSize: 13 }}>No posts found. Click Load.</p>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {posts.map(p => (
                  <div key={p.id} style={{ border: '1px solid #e5e5ea', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                    {p.full_picture && <img src={p.full_picture} alt="" style={{ width: '100%', height: 150, objectFit: 'cover' }} />}
                    <div style={{ padding: 12 }}>
                      <p style={{ fontSize: 13, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {p.message || p.story || '(no text)'}
                      </p>
                      <div style={{ fontSize: 12, color: '#636366', display: 'flex', gap: 10 }}>
                        <span>❤️ {p.likes?.summary?.total_count || 0}</span>
                        <span>💬 {p.comments?.summary?.total_count || 0}</span>
                        <span>📅 {new Date(p.created_time).toLocaleDateString()}</span>
                        {p.permalink_url && <a href={p.permalink_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', color: '#1877F2' }}>→</a>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* IG Posts */}
          {tab === 'ig' && (
            <div>
              <h3 style={{ marginBottom: 12, fontSize: 16 }}>Instagram Posts ({igPosts.length})</h3>
              {!selectedPage?.instagram_business_account && (
                <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 8, padding: 12, fontSize: 13 }}>
                  ⚠️ This page has no Instagram Business account connected.
                </div>
              )}
              {igPosts.length === 0 && !loading && selectedPage?.instagram_business_account && (
                <p style={{ color: '#636366', fontSize: 13 }}>No posts found. Click Load.</p>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {igPosts.map(p => (
                  <div key={p.id} style={{ border: '1px solid #e5e5ea', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                    {p.media_url && <img src={p.media_url} alt="" style={{ width: '100%', height: 150, objectFit: 'cover' }} />}
                    <div style={{ padding: 12 }}>
                      <p style={{ fontSize: 13, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {p.message || '(no caption)'}
                      </p>
                      <div style={{ fontSize: 12, color: '#636366', display: 'flex', gap: 10 }}>
                        <span>❤️ {p.like_count || 0}</span>
                        <span>💬 {p.comments_count || 0}</span>
                        <span>📅 {new Date(p.created_time).toLocaleDateString()}</span>
                        {p.permalink && <a href={p.permalink} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', color: '#E1306C' }}>→</a>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta Ads */}
          {tab === 'ads' && (
            <div>
              <h3 style={{ marginBottom: 12, fontSize: 16 }}>Meta Ads Campaigns ({campaigns.length})</h3>
              {campaigns.length === 0 && !loading && <p style={{ color: '#636366', fontSize: 13 }}>No campaigns found. Click Load.</p>}
              {campaigns.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f5f5f7' }}>
                        {['Campaign', 'Status', 'Account', 'Spend', 'Impressions', 'Clicks', 'CTR%', 'CPC', 'Reach'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#636366', borderBottom: '1px solid #e5e5ea', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((c, i) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ background: c.status === 'ACTIVE' ? '#e8f5e9' : '#f5f5f5', color: c.status === 'ACTIVE' ? '#2e7d32' : '#757575', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{c.status}</span>
                          </td>
                          <td style={{ padding: '8px 12px', fontSize: 11, color: '#636366' }}>{c.account}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{c.spend.toFixed(2)}</td>
                          <td style={{ padding: '8px 12px' }}>{c.impressions.toLocaleString()}</td>
                          <td style={{ padding: '8px 12px' }}>{c.clicks.toLocaleString()}</td>
                          <td style={{ padding: '8px 12px' }}>{c.ctr}%</td>
                          <td style={{ padding: '8px 12px' }}>{c.cpc}</td>
                          <td style={{ padding: '8px 12px' }}>{c.reach.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
