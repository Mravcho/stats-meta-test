import { useState, useEffect } from 'react';

type Page = { id: string; name: string; access_token: string; instagram_business_account?: { id: string } };
type MetaCampaign = { id: string; name: string; status: string; spend: number; impressions: number; clicks: number; ctr: string; cpc: string };
type Post = { id: string; message?: string; story?: string; created_time: string; full_picture?: string; permalink_url?: string; likes?: { summary: { total_count: number } }; comments?: { summary: { total_count: number } } };
type GA4Row = { dimensionValues: { value: string }[]; metricValues: { value: string }[] };
type AdsCampaign = { campaign: { id: string; name: string; status: string }; metrics: { impressions: string; clicks: string; costMicros: string; conversions: string; conversionsValue: string } };

export default function Home() {
  const [section, setSection] = useState<'meta' | 'google'>('meta');

  // Meta
  const [metaConnected, setMetaConnected] = useState(false);
  const [metaUser, setMetaUser] = useState('');
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [metaTab, setMetaTab] = useState<'posts' | 'ads'>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [metaCampaigns, setMetaCampaigns] = useState<MetaCampaign[]>([]);

  // Google
  const [googleConnected, setGoogleConnected] = useState(false);
  const [ga4Properties, setGa4Properties] = useState<{ id: string; name: string }[]>([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [googleTab, setGoogleTab] = useState<'ga4' | 'ads'>('ga4');
  const [ga4Rows, setGa4Rows] = useState<GA4Row[]>([]);
  const [adsCustomers, setAdsCustomers] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [adsCampaigns, setAdsCampaigns] = useState<AdsCampaign[]>([]);

  // Shared
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [since, setSince] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; });
  const [until, setUntil] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('error')) setError(decodeURIComponent(p.get('error')!));
    if (p.get('error_google')) setError(decodeURIComponent(p.get('error_google')!));
    checkMeta();
    checkGoogle();
  }, []);

  const checkMeta = async () => {
    try {
      const d = await fetch('/api/meta-data?type=me').then(r => r.json());
      if (d.id) {
        setMetaConnected(true); setMetaUser(d.name);
        const pd = await fetch('/api/meta-data?type=pages').then(r => r.json());
        if (pd.data) { setPages(pd.data); setSelectedPage(pd.data[0] || null); }
      }
    } catch {}
  };

  const checkGoogle = async () => {
    try {
      const d = await fetch('/api/google-data?type=properties').then(r => r.json());
      if (d.properties) {
        setGoogleConnected(true);
        const props = d.properties.map((p: any) => ({ id: p.name.replace('properties/', ''), name: p.displayName }));
        setGa4Properties(props);
        if (props.length) setSelectedProperty(props[0].id);
      }
    } catch {}
  };

  const loadPosts = async () => {
    if (!selectedPage) return;
    setLoading(true); setPosts([]); setError('');
    const d = await fetch(`/api/meta-data?type=posts&page_id=${selectedPage.id}&page_token=${selectedPage.access_token}&since=${since}&until=${until}`).then(r => r.json());
    if (d.error) setError(typeof d.error === 'string' ? d.error : d.error.message || JSON.stringify(d.error));
    setPosts(d.data || []);
    setLoading(false);
  };

  const loadMetaAds = async () => {
    setLoading(true); setMetaCampaigns([]); setError('');
    const d = await fetch(`/api/meta-data?type=ads&since=${since}&until=${until}`).then(r => r.json());
    if (d.error) setError(d.error);
    setMetaCampaigns(d.campaigns || []);
    setLoading(false);
  };

  const loadGA4 = async () => {
    if (!selectedProperty) return;
    setLoading(true); setGa4Rows([]); setError('');
    const d = await fetch(`/api/google-data?type=ga4&property_id=${selectedProperty}&since=${since}&until=${until}`).then(r => r.json());
    if (d.error) setError(d.error);
    setGa4Rows(d.rows || []);
    setLoading(false);
  };

  const loadAdsCustomers = async () => {
    setLoading(true); setError('');
    const d = await fetch('/api/google-data?type=ads_customers').then(r => r.json());
    if (d.error) { setError(d.error); setLoading(false); return; }
    const ids = (d.resourceNames || []).map((n: string) => n.replace('customers/', ''));
    setAdsCustomers(ids);
    if (ids.length) { setSelectedCustomer(ids[0]); loadAdsCampaigns(ids[0]); return; }
    setLoading(false);
  };

  const loadAdsCampaigns = async (custId?: string) => {
    const id = custId || selectedCustomer;
    if (!id) return;
    setLoading(true); setAdsCampaigns([]); setError('');
    const d = await fetch(`/api/google-data?type=ads_campaigns&customer_id=${id}`).then(r => r.json());
    if (d.error) setError(d.error);
    setAdsCampaigns(d.results || []);
    setLoading(false);
  };

  const s: React.CSSProperties = { fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: 960, margin: '0 auto', padding: 24, color: '#1d1d1f', background: '#f5f5f7', minHeight: '100vh' };
  const cardStyle: React.CSSProperties = { border: '1px solid #e5e5ea', borderRadius: 10, background: '#fff', overflow: 'hidden', marginBottom: 12 };
  const thStyle: React.CSSProperties = { padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#636366', borderBottom: '1px solid #e5e5ea', whiteSpace: 'nowrap', fontSize: 12 };
  const tdStyle: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid #f0f0f0', fontSize: 13 };

  return (
    <div style={s}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>🧪 Stats You Need — Integration Test</h1>
      <p style={{ color: '#636366', fontSize: 13, marginBottom: 20 }}>Test environment · Not production</p>

      {error && (
        <div style={{ background: '#fff0f0', border: '1px solid #fcc', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#c00', display: 'flex', justifyContent: 'space-between' }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c00', fontWeight: 700, fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Section toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {([['meta', '📘 Meta', '#1877F2'], ['google', '🔵 Google', '#4285F4']] as const).map(([id, label, color]) => (
          <button key={id} onClick={() => setSection(id)}
            style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: section === id ? color : '#fff', color: section === id ? '#fff' : '#1d1d1f', cursor: 'pointer', fontWeight: 600, fontSize: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── META ── */}
      {section === 'meta' && (
        !metaConnected ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📘</div>
            <h2 style={{ marginBottom: 8 }}>Connect Facebook</h2>
            <p style={{ color: '#636366', marginBottom: 20, fontSize: 14 }}>Access Pages and Ads data</p>
            <a href="/api/meta-auth" style={{ display: 'inline-block', background: '#1877F2', color: '#fff', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
              f  Connect with Facebook
            </a>
          </div>
        ) : (
          <div>
            <div style={{ background: '#f0fff4', border: '1px solid #c3e6cb', borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              ✅ <strong>Connected as {metaUser}</strong>
              <a href="/api/meta-auth" style={{ marginLeft: 'auto', fontSize: 13, color: '#0066cc' }}>Reconnect</a>
            </div>
            {pages.length > 0 && (
              <div style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Page:</label>
                <select value={selectedPage?.id || ''} onChange={e => setSelectedPage(pages.find(p => p.id === e.target.value) || null)}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}>
                  {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {([['posts', '📘 Posts'], ['ads', '📣 Ads']] as const).map(([id, label]) => (
                <button key={id} onClick={() => setMetaTab(id)}
                  style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #ddd', background: metaTab === id ? '#1877F2' : '#fff', color: metaTab === id ? '#fff' : '#1d1d1f', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
              <input type="date" value={since} onChange={e => setSince(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
              <span>→</span>
              <input type="date" value={until} onChange={e => setUntil(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
              <button onClick={metaTab === 'posts' ? loadPosts : loadMetaAds} disabled={loading}
                style={{ padding: '7px 20px', borderRadius: 6, background: '#1877F2', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                {loading ? 'Loading...' : 'Load'}
              </button>
            </div>

            {metaTab === 'posts' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
                {posts.length === 0 && !loading && <p style={{ color: '#636366', fontSize: 13 }}>No posts. Click Load.</p>}
                {posts.map(p => (
                  <div key={p.id} style={cardStyle}>
                    {p.full_picture && <img src={p.full_picture} alt="" style={{ width: '100%', height: 140, objectFit: 'cover' }} />}
                    <div style={{ padding: 12 }}>
                      <p style={{ fontSize: 13, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.message || p.story || '(no text)'}</p>
                      <div style={{ fontSize: 12, color: '#636366', display: 'flex', gap: 10 }}>
                        <span>❤️ {p.likes?.summary?.total_count || 0}</span>
                        <span>💬 {p.comments?.summary?.total_count || 0}</span>
                        <span>{new Date(p.created_time).toLocaleDateString()}</span>
                        {p.permalink_url && <a href={p.permalink_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', color: '#1877F2' }}>→</a>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {metaTab === 'ads' && (
              <div style={cardStyle}>
                <div style={{ padding: '12px 16px', fontWeight: 600, borderBottom: '1px solid #f0f0f0' }}>Campaigns ({metaCampaigns.length})</div>
                {metaCampaigns.length === 0 && <p style={{ padding: 16, color: '#636366', fontSize: 13 }}>No campaigns. Click Load.</p>}
                {metaCampaigns.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr style={{ background: '#f5f5f7' }}>
                        {['Campaign','Status','Spend','Impressions','Clicks','CTR%','CPC'].map(h=><th key={h} style={thStyle}>{h}</th>)}
                      </tr></thead>
                      <tbody>{metaCampaigns.map((c,i)=>(
                        <tr key={c.id} style={{ background: i%2===0?'#fff':'#fafafa' }}>
                          <td style={{...tdStyle,fontWeight:500,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</td>
                          <td style={tdStyle}><span style={{background:c.status==='ACTIVE'?'#e8f5e9':'#f5f5f5',color:c.status==='ACTIVE'?'#2e7d32':'#757575',padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:600}}>{c.status}</span></td>
                          <td style={{...tdStyle,fontWeight:600}}>{c.spend.toFixed(2)}</td>
                          <td style={tdStyle}>{c.impressions.toLocaleString()}</td>
                          <td style={tdStyle}>{c.clicks.toLocaleString()}</td>
                          <td style={tdStyle}>{c.ctr}%</td>
                          <td style={tdStyle}>{c.cpc}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      )}

      {/* ── GOOGLE ── */}
      {section === 'google' && (
        !googleConnected ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔵</div>
            <h2 style={{ marginBottom: 8 }}>Connect Google</h2>
            <p style={{ color: '#636366', marginBottom: 20, fontSize: 14 }}>Access Google Analytics 4 and Google Ads</p>
            <a href="/api/google-auth" style={{ display: 'inline-block', background: '#4285F4', color: '#fff', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
              G  Connect with Google
            </a>
          </div>
        ) : (
          <div>
            <div style={{ background: '#f0f7ff', border: '1px solid #c3d9ff', borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              ✅ <strong>Google Connected</strong>
              <a href="/api/google-auth" style={{ marginLeft: 'auto', fontSize: 13, color: '#0066cc' }}>Reconnect</a>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {([['ga4', '📈 Analytics 4'], ['ads', '🔷 Google Ads']] as const).map(([id, label]) => (
                <button key={id} onClick={() => setGoogleTab(id)}
                  style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #ddd', background: googleTab === id ? '#4285F4' : '#fff', color: googleTab === id ? '#fff' : '#1d1d1f', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  {label}
                </button>
              ))}
            </div>

            {googleTab === 'ga4' && (
              <div>
                {ga4Properties.length > 0 && (
                  <div style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>Property:</label>
                    <select value={selectedProperty} onChange={e => setSelectedProperty(e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}>
                      {ga4Properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                  <input type="date" value={since} onChange={e => setSince(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
                  <span>→</span>
                  <input type="date" value={until} onChange={e => setUntil(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
                  <button onClick={loadGA4} disabled={loading}
                    style={{ padding: '7px 20px', borderRadius: 6, background: '#4285F4', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                    {loading ? 'Loading...' : 'Load GA4'}
                  </button>
                </div>
                {ga4Rows.length > 0 && (
                  <div style={cardStyle}>
                    <div style={{ padding: '12px 16px', fontWeight: 600, borderBottom: '1px solid #f0f0f0' }}>Sessions by Channel</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr style={{ background: '#f5f5f7' }}>
                        {['Channel','Sessions','Users','New Users','Bounce Rate'].map(h=><th key={h} style={thStyle}>{h}</th>)}
                      </tr></thead>
                      <tbody>{ga4Rows.map((row, i) => (
                        <tr key={i} style={{ background: i%2===0?'#fff':'#fafafa' }}>
                          <td style={{...tdStyle,fontWeight:500}}>{row.dimensionValues[0]?.value}</td>
                          {row.metricValues.map((m,j)=>(
                            <td key={j} style={tdStyle}>{j===3?`${(parseFloat(m.value)*100).toFixed(1)}%`:parseInt(m.value).toLocaleString()}</td>
                          ))}
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
                {ga4Rows.length === 0 && !loading && <p style={{ color: '#636366', fontSize: 13 }}>Select property and click Load GA4.</p>}
              </div>
            )}

            {googleTab === 'ads' && (
              <div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button onClick={loadAdsCustomers} disabled={loading}
                    style={{ padding: '7px 16px', borderRadius: 6, background: '#34a853', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                    {loading ? 'Loading...' : 'Load Ad Accounts'}
                  </button>
                  {adsCustomers.length > 0 && (
                    <>
                      <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}
                        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}>
                        {adsCustomers.map(id => <option key={id} value={id}>Account {id}</option>)}
                      </select>
                      <button onClick={() => loadAdsCampaigns()} disabled={loading}
                        style={{ padding: '7px 16px', borderRadius: 6, background: '#4285F4', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                        Load Campaigns
                      </button>
                    </>
                  )}
                </div>
                {adsCampaigns.length > 0 && (
                  <div style={cardStyle}>
                    <div style={{ padding: '12px 16px', fontWeight: 600, borderBottom: '1px solid #f0f0f0' }}>Campaigns ({adsCampaigns.length})</div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr style={{ background: '#f5f5f7' }}>
                          {['Campaign','Status','Spend','Impressions','Clicks','Conv.','ROAS'].map(h=><th key={h} style={thStyle}>{h}</th>)}
                        </tr></thead>
                        <tbody>{adsCampaigns.map((row, i) => {
                          const spend = parseInt(row.metrics?.costMicros||'0') / 1000000;
                          const convVal = parseFloat(row.metrics?.conversionsValue||'0');
                          const roas = spend > 0 ? (convVal/spend).toFixed(2) : '—';
                          return (
                            <tr key={row.campaign?.id||i} style={{ background: i%2===0?'#fff':'#fafafa' }}>
                              <td style={{...tdStyle,fontWeight:500,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.campaign?.name}</td>
                              <td style={tdStyle}><span style={{background:row.campaign?.status==='ENABLED'?'#e8f5e9':'#f5f5f5',color:row.campaign?.status==='ENABLED'?'#2e7d32':'#757575',padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:600}}>{row.campaign?.status}</span></td>
                              <td style={{...tdStyle,fontWeight:600}}>{spend.toFixed(2)}</td>
                              <td style={tdStyle}>{parseInt(row.metrics?.impressions||'0').toLocaleString()}</td>
                              <td style={tdStyle}>{parseInt(row.metrics?.clicks||'0').toLocaleString()}</td>
                              <td style={tdStyle}>{parseFloat(row.metrics?.conversions||'0').toFixed(1)}</td>
                              <td style={{...tdStyle,fontWeight:600,color:parseFloat(roas)>=2?'#2e7d32':parseFloat(roas)>=1?'#1d1d1f':'#c62828'}}>{roas}x</td>
                            </tr>
                          );
                        })}</tbody>
                      </table>
                    </div>
                  </div>
                )}
                {adsCampaigns.length === 0 && !loading && <p style={{ color: '#636366', fontSize: 13 }}>Click "Load Ad Accounts" to start.</p>}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
