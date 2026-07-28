import React from 'react';
import { Link } from 'react-router-dom';

interface PlaceholderPageProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  phase: string;
  features: string[];
  apiReady?: boolean;
}

export function PlaceholderPage({ icon, title, description, phase, features, apiReady }: PlaceholderPageProps) {
  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-header-title">{title}</h1>
          <p className="page-header-subtitle">{description}</p>
        </div>
        {apiReady && (
          <span style={{
            background: 'rgba(34,211,238,0.10)', color: '#22d3ee',
            padding: '4px 14px', borderRadius: 4, fontSize: 11,
            fontWeight: 700, border: '1px solid rgba(34,211,238,0.2)',
            fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            API Ready
          </span>
        )}
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <div className="card-body" style={{ textAlign: 'center', padding: '56px 40px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', color: '#818cf8',
          }}>
            {icon}
          </div>
          <h2 style={{ color: '#f1f5f9', marginBottom: 8, fontSize: 20, fontWeight: 600 }}>{title}</h2>
          <p style={{ color: '#475569', marginBottom: 32, maxWidth: 400, margin: '0 auto 32px', fontSize: 13 }}>
            This module is planned for{' '}
            <span style={{ color: '#818cf8', fontFamily: 'monospace', fontWeight: 600 }}>{phase}</span>.
            The backend FastAPI endpoints are fully implemented and ready.
          </p>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
            textAlign: 'left', maxWidth: 420, margin: '0 auto 32px',
          }}>
            {features.map((f) => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b' }}>
                <span style={{ color: '#6366f1', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>→</span>
                {f}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Link to="/cases" className="btn btn-primary">Go to Cases</Link>
            <Link to="/dashboard" className="btn btn-outline-secondary">Dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SVG Icons ───────────────────────────────────────────────
const Icons = {
  findings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
      <circle cx="11" cy="11" r="7" /><path d="M16 16l4 4" strokeLinecap="round" />
      <path d="M11 8v3M11 14h.01" strokeLinecap="round" />
    </svg>
  ),
  timeline: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
      <circle cx="7" cy="7" r="2" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="12" r="2" />
      <path d="M9 7h10M9 17h5M9 9l7 2M9 15l7-2" />
    </svg>
  ),
  risk: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
      <path d="M12 2L3 7v7c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7L12 2z" />
      <path d="M12 9v4M12 16h.01" strokeLinecap="round" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
      <path d="M5 2h10l5 5v15H5V2z" /><path d="M15 2v5h5" />
      <path d="M8 13h8M8 17h5" strokeLinecap="round" />
    </svg>
  ),
  volatility: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 9h2l2 6 3-9 2 6h3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  wireshark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
      <path d="M3 12h3l3-8 4 16 3-8h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  autopsy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
      <circle cx="11" cy="11" r="7" /><path d="M16 16l4 4" strokeLinecap="round" />
      <path d="M8 11h6M11 8v6" strokeLinecap="round" />
    </svg>
  ),
  disk: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
    </svg>
  ),
};

// ── Individual Placeholder Pages ─────────────────────────────

export function FindingsPlaceholder() {
  return (
    <PlaceholderPage
      icon={Icons.findings}
      title="Findings Management"
      description="Document and track investigation findings with MITRE ATT&CK mapping"
      phase="Phase 4"
      apiReady={true}
      features={['MITRE ATT&CK mapping', 'IOC indicator tracking', 'Severity classification', 'Evidence linkage', 'Review workflow', 'Tag-based filtering']}
    />
  );
}

export function TimelinePlaceholder() {
  return (
    <PlaceholderPage
      icon={Icons.timeline}
      title="Investigation Timeline"
      description="Chronological event visualization for case reconstruction"
      phase="Phase 4"
      apiReady={true}
      features={['Interactive timeline view', 'Event type filtering', 'Multi-source events', 'Evidence linkage', 'Importance levels', 'Export to report']}
    />
  );
}

export function RiskPlaceholder() {
  return (
    <PlaceholderPage
      icon={Icons.risk}
      title="Risk Assessment"
      description="5×5 risk matrix analysis for cyber threat evaluation"
      phase="Phase 4"
      apiReady={true}
      features={['5×5 risk matrix', 'Threat actor profiles', 'Asset criticality', 'Mitigation tracking', 'Risk score calculation', 'Residual risk notes']}
    />
  );
}

export function ReportsPlaceholder() {
  return (
    <PlaceholderPage
      icon={Icons.reports}
      title="Investigation Reports"
      description="Generate professional PDF reports via FastAPI + ReportLab backend"
      phase="Phase 4"
      apiReady={true}
      features={['PDF generation (ReportLab)', 'Executive summary', 'Evidence inventory', 'Timeline inclusion', 'Custom sections', 'Secure download URLs']}
    />
  );
}

export function ForensicsPlaceholder() {
  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Forensic Tool Integrations</h1>
          <p className="page-header-subtitle">Status of configured forensic analysis tool adapters</p>
        </div>
      </div>

      <div className="row g-3">
        {FORENSIC_TOOLS.map((tool) => (
          <div key={tool.name} className="col-12 col-md-6">
            <div className="card">
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#818cf8', flexShrink: 0,
                  }}>
                    {tool.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <h6 style={{ margin: 0, fontWeight: 600, color: '#f1f5f9', fontSize: 13 }}>{tool.name}</h6>
                      <span style={{
                        fontSize: 9, background: 'rgba(100,116,139,0.12)', color: '#64748b',
                        padding: '2px 8px', borderRadius: 4, fontWeight: 700,
                        fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em',
                        border: '1px solid rgba(100,116,139,0.15)',
                      }}>
                        Stub Ready
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: '#475569', marginBottom: 10 }}>{tool.description}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {tool.capabilities.map((cap) => (
                        <span key={cap} style={{
                          fontSize: 10, background: 'rgba(99,102,241,0.08)', color: '#818cf8',
                          padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(99,102,241,0.15)',
                          fontFamily: 'monospace',
                        }}>
                          {cap}
                        </span>
                      ))}
                    </div>
                    <div style={{
                      marginTop: 10, fontSize: 10, color: '#475569',
                      background: 'rgba(8,13,22,0.8)', padding: '6px 10px',
                      borderRadius: 4, fontFamily: 'monospace',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}>
                      {tool.adapterPath}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20 }} className="card">
        <div className="card-header">
          <span className="card-title">Integration Architecture</span>
        </div>
        <div className="card-body">
          <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 0 }}>
            Each tool adapter in{' '}
            <code style={{ color: '#818cf8', fontFamily: 'monospace', fontSize: 12 }}>backend/app/services/forensics/</code>
            {' '}implements a common interface with{' '}
            <code style={{ color: '#818cf8', fontFamily: 'monospace', fontSize: 12 }}>is_available()</code>,{' '}
            <code style={{ color: '#818cf8', fontFamily: 'monospace', fontSize: 12 }}>get_status()</code>, and{' '}
            <code style={{ color: '#818cf8', fontFamily: 'monospace', fontSize: 12 }}>analyze()</code> methods.
            The <code style={{ color: '#818cf8', fontFamily: 'monospace', fontSize: 12 }}>GET /api/v1/forensics/tools</code>{' '}
            endpoint reports live availability. Tools are integrated by implementing the stub methods — no architectural changes needed.
          </p>
        </div>
      </div>
    </div>
  );
}

const FORENSIC_TOOLS = [
  {
    name: 'Volatility 3',
    icon: Icons.volatility,
    description: 'Memory forensics framework for analyzing RAM dumps and extracting artifacts',
    capabilities: ['Process Listing', 'Network Connections', 'DLL Analysis', 'Malware Detection'],
    adapterPath: 'services/forensics/volatility_adapter.py',
  },
  {
    name: 'Wireshark / tshark',
    icon: Icons.wireshark,
    description: 'Network packet analysis and PCAP file parsing for traffic investigation',
    capabilities: ['PCAP Analysis', 'Protocol Stats', 'DNS Extraction', 'IP Conversations'],
    adapterPath: 'services/forensics/wireshark_adapter.py',
  },
  {
    name: 'Autopsy',
    icon: Icons.autopsy,
    description: 'Digital forensics platform for disk and file system analysis',
    capabilities: ['Case Management', 'Artifact Extraction', 'File Analysis', 'Keyword Search'],
    adapterPath: 'services/forensics/autopsy_adapter.py',
  },
  {
    name: 'FTK Imager',
    icon: Icons.disk,
    description: 'Forensic disk imaging tool for creating verified evidence copies',
    capabilities: ['Disk Imaging', 'Image Verification', 'Evidence Containers', 'Image Mounting'],
    adapterPath: 'services/forensics/ftk_adapter.py',
  },
];
