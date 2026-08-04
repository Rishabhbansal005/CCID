import React, { useState } from 'react';
import { FileDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import StatCard from '@/components/shared/StatCard';
import { osintApi, OsintFinding, CveResult, ExploitSearchResult, DomainReputationResult, HashLookupResult } from '@/api/osint';
import OsintToolModal, { ToolType } from './OsintToolModal';
// SVG Icons
const I = {
  tool: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
      <path d="M10 2l2 2-2 2-2-2 2-2zM4 10l2 2-2 2-2-2 2-2zM16 10l2 2-2 2-2-2 2-2zM10 18l2 2-2 2-2-2 2-2z" />
      <path d="M7.5 7.5L4 4M12.5 7.5l3.5-3.5M7.5 12.5L4 16M12.5 12.5l3.5 3.5" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
      <path d="M10 2L3 5v6c0 4 7 7 7 7s7-3 7-7V5l-7-3z" />
    </svg>
  ),
  code: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
      <path d="M7 6L3 10l4 4M13 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  scan: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
      <path d="M4 4h3M13 4h3v3M16 13v3h-3M7 16H4v-3M4 7v6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 7v6M7 10h6" strokeLinecap="round" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
      <path d="M9 16A7 7 0 109 2a7 7 0 000 14z" />
      <path d="M14 14l4 4" strokeLinecap="round" />
    </svg>
  ),
  globe: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
      <circle cx="10" cy="10" r="8" />
      <path d="M10 2a12 12 0 000 16M10 2a12 12 0 010 16M2 10h16" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
      <circle cx="10" cy="6" r="4" />
      <path d="M4 16c0-2.2 3-4 6-4s6 1.8 6 4" strokeLinecap="round" />
    </svg>
  ),
  database: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
      <ellipse cx="10" cy="5" rx="7" ry="3" />
      <path d="M3 5v10c0 1.66 3.13 3 7 3s7-1.34 7-3V5M3 10c0 1.66 3.13 3 7 3s7-1.34 7-3" />
    </svg>
  )
};

const ACTIVITY_DATA = [
  { name: 'Mon', mentions: 120, leaks: 10 },
  { name: 'Tue', mentions: 250, leaks: 45 },
  { name: 'Wed', mentions: 180, leaks: 20 },
  { name: 'Thu', mentions: 390, leaks: 80 },
  { name: 'Fri', mentions: 210, leaks: 30 },
  { name: 'Sat', mentions: 110, leaks: 5 },
  { name: 'Sun', mentions: 90, leaks: 2 },
];

const THREAT_RADAR = [
  { subject: 'Dark Web', A: 80, fullMark: 100 },
  { subject: 'Social Media', A: 65, fullMark: 100 },
  { subject: 'Public Records', A: 45, fullMark: 100 },
  { subject: 'Forums', A: 90, fullMark: 100 },
  { subject: 'Paste Sites', A: 75, fullMark: 100 },
];

const STATS = [
  { id: 'monitored_entities', label: 'Monitored Entities', value: 24, icon: I.user, color: '#3b82f6', colorMuted: 'rgba(59,130,246,0.12)' },
  { id: 'active_alerts', label: 'Total OTX Reports', value: 142, icon: I.globe, color: '#f43f5e', colorMuted: 'rgba(244,63,94,0.12)' },
  { id: 'data_leaks', label: 'Loaded Reports', value: 89, icon: I.database, color: '#10b981', colorMuted: 'rgba(16,185,129,0.12)' },
];

// Start with a populated feed to give the dashboard life before search
const RECENT_FINDINGS: OsintFinding[] = [
  { id: 'OTX-8821', entity: '185.15.22.1', type: 'Malicious IP', source: 'AlienVault OTX', severity: 'High', time: '10 mins ago', url: 'https://otx.alienvault.com' },
  { id: 'OTX-8820', entity: 'evil-domain.com', type: 'Phishing', source: 'AlienVault OTX', severity: 'High', time: '25 mins ago', url: 'https://otx.alienvault.com' },
  { id: 'OTX-8819', entity: 'test-user@company.com', type: 'Data Breach', source: 'HIBP', severity: 'Medium', time: '1 hour ago' },
  { id: 'OTX-8818', entity: 'f2a3b1...', type: 'Malware Hash', source: 'VirusTotal', severity: 'Critical', time: '2 hours ago' },
];

export default function OsintDashboard() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [findings, setFindings] = useState<OsintFinding[]>(RECENT_FINDINGS);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [dynamicStats, setDynamicStats] = useState(STATS);
  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const blob = await osintApi.generateReport(findings);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'osint_report.pdf';
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to generate report', e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const result = await osintApi.search(query);
      if (result.success) {
        setFindings(result.findings);
        setDynamicStats([
          { ...STATS[0], value: 1 },
          // 100% accurate: total pulse count from OTX
          { ...STATS[1], value: result.stats?.mentions || 0 },
          // Accurate: how many reports we actually loaded
          { ...STATS[2], value: result.findings?.length || 0 },
        ]);
      } else {
        setSearchError(result.error || 'Failed to retrieve OSINT results.');
        setFindings([]);
        setDynamicStats([{ ...STATS[0], value: 1 }, { ...STATS[1], value: 0 }, { ...STATS[2], value: 0 }]);
      }
    } catch (err: any) {
      setSearchError(err.message || 'An error occurred while connecting to the backend API.');
      setFindings([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-header-title">OSINT Intelligence</h1>
          <p className="page-header-subtitle">Open-Source Intelligence & Threat Monitoring Hub</p>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="card mb-4" style={{ background: 'linear-gradient(90deg, rgba(30,41,59,0.5), rgba(15,23,42,0.5))', border: '1px solid rgba(99,102,241,0.3)' }}>
        <div className="card-body">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                {I.search}
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search IPs, Domains, Emails, or Usernames..."
                style={{
                  width: '100%',
                  padding: '16px 16px 16px 48px',
                  background: 'rgba(15,23,42,0.6)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0 32px', fontSize: '15px', fontWeight: 600 }}
              disabled={isSearching}
            >
              {isSearching ? 'Scanning...' : 'Analyze'}
            </button>
          </form>
          {searchError && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(244,63,94,0.1)', color: '#f43f5e', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.3)', fontSize: '14px' }}>
              <span style={{ fontWeight: 600 }}>Error: </span>{searchError}
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="row g-3 mb-4">
        {dynamicStats.map(s => (
          <div key={s.id} className="col-12 col-md-4">
            <StatCard icon={s.icon} label={s.label} value={s.value} color={s.color} colorMuted={s.colorMuted} />
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-xl-8">
          <div className="card h-100">
            <div className="card-header">
              <span className="card-title">Discovery Volume (7 Days)</span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={ACTIVITY_DATA} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="gMentions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gLeaks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="mentions" name="Mentions" stroke="#3b82f6" strokeWidth={2} fill="url(#gMentions)" />
                  <Area type="monotone" dataKey="leaks" name="Data Leaks" stroke="#f43f5e" strokeWidth={2} fill="url(#gLeaks)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="col-12 col-xl-4">
          <div className="card h-100">
            <div className="card-header">
              <span className="card-title">Threat Sources</span>
            </div>
            <div className="card-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={THREAT_RADAR}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Threat Activity" dataKey="A" stroke="#8b5cf6" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.4} />
                  <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '8px', color: '#fff' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>


      {/* Cyber Security Tools Row */}
      <div className="section-heading mb-3 mt-2" style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Analyst Toolbox
      </div>
      <div className="row g-3 mb-4">
        {[
          { title: 'Vulnerability Scanner', desc: 'CVE lookup & external service scan triggers.', icon: I.scan, action: 'Run Scan', type: 'cve' as ToolType },
          { title: 'Port Scanner (Nmap)', desc: 'Scan common network ports for active services.', icon: I.tool, action: 'Scan Ports', type: 'nmap' as ToolType },
          { title: 'Dark Web Search', desc: 'Check if an email was compromised in data breaches.', icon: I.database, action: 'Search Breach', type: 'breach' as ToolType },
          { title: 'Exploit DB Search', desc: 'Search for proof-of-concepts and exploits.', icon: I.code, action: 'Search DB', type: 'exploit' as ToolType },
          { title: 'Domain Reputation', desc: 'Check domain health and threat pulses.', icon: I.globe, action: 'Check Domain', type: 'domain' as ToolType },
          { title: 'WHOIS Explorer', desc: 'Track domain history and registration records.', icon: I.search, action: 'WHOIS Lookup', type: 'whois' as ToolType },
          { title: 'Malware Sandbox', desc: 'Submit file hashes for dynamic analysis.', icon: I.shield, action: 'Submit Hash', type: 'hash' as ToolType },
          { title: 'IP Geolocation', desc: 'Locate IP addresses and view ISP/org details.', icon: I.search, action: 'Locate IP', type: 'ipgeo' as ToolType },
          { title: 'MAC Address Lookup', desc: 'Identify hardware vendor by MAC address.', icon: I.tool, action: 'Lookup MAC', type: 'mac' as ToolType }
        ].map((tool, idx) => (
          <div key={idx} className="col-12 col-md-6 col-xl-4">
            <div className="card h-100 tool-card" style={{ transition: 'all 0.2s', cursor: 'pointer', background: 'rgba(30,41,59,0.3)' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.5)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.boxShadow = 'none'; }}
              onClick={() => setActiveTool(tool.type)}
            >
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ padding: '8px', background: 'rgba(99,102,241,0.1)', borderRadius: '8px', color: '#818cf8', display: 'flex' }}>
                    {tool.icon}
                  </div>
                  <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '14px' }}>{tool.title}</div>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '18px', flex: 1, lineHeight: '1.5' }}>
                  {tool.desc}
                </div>
                <button className="btn" style={{ fontSize: '12px', padding: '6px 0', width: '100%', background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; e.currentTarget.style.color = '#818cf8'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                  {tool.action}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Live Feed Row */}
      <div className="row g-3">
        <div className="col-12">
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title">Live Intelligence Feed</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="btn"
                  style={{
                    padding: '4px 12px', fontSize: '12px', background: 'rgba(99,102,241,0.1)',
                    color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <FileDown size={14} />
                  {isExporting ? 'Generating...' : 'Export to PDF'}
                </button>
                <span style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} className="blink-anim" />
                  Live Updates Active
                </span>
              </div>
            </div>
            <div style={{ padding: '0 4px' }}>
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Target Entity</th>
                    <th>Detection Type</th>
                    <th>Source</th>
                    <th>Severity</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {findings.length === 0 && !isSearching && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                        <div style={{ fontWeight: 600, marginBottom: '4px', color: '#94a3b8' }}>No results yet</div>
                        <div style={{ fontSize: '12px' }}>Enter an IP, domain, or file hash above and click Analyze</div>
                      </td>
                    </tr>
                  )}
                  {findings.map((f) => (
                    <tr
                      key={f.id}
                      title={f.url ? 'Click to open full report on AlienVault OTX' : ''}
                      style={{ cursor: f.url ? 'pointer' : 'default', transition: 'background 0.15s' }}
                      onClick={() => f.url && window.open(f.url, '_blank', 'noopener,noreferrer')}
                      onMouseEnter={(e) => { if (f.url) e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td>
                        <span className="font-mono" style={{ color: '#818cf8', fontSize: '12px', textDecoration: f.url ? 'underline' : 'none' }}>
                          {f.id}
                        </span>
                      </td>
                      <td style={{ color: '#f8fafc', fontWeight: 500 }}>{f.entity}</td>
                      <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.type}</td>
                      <td><span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{f.source}</span></td>
                      <td>
                        <span style={{
                          color: f.severity === 'High' ? '#f43f5e' : f.severity === 'Medium' ? '#fb923c' : '#34d399',
                          fontWeight: 600, fontSize: '13px'
                        }}>
                          ● {f.severity}
                        </span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '12px' }}>{f.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .blink-anim {
          animation: blink 2s infinite;
        }
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
      `}</style>

      <OsintToolModal
        isOpen={!!activeTool}
        onClose={() => setActiveTool(null)}
        toolType={activeTool}
      />
    </div>
  );
}
