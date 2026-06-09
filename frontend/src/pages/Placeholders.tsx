import React from 'react';
import { Link } from 'react-router-dom';

interface PlaceholderPageProps {
  icon: string;
  title: string;
  description: string;
  phase: string;
  features: string[];
  apiReady?: boolean;
}

export function PlaceholderPage({ icon, title, description, phase, features, apiReady }: PlaceholderPageProps) {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header-title">{title}</h1>
          <p className="page-header-subtitle">{description}</p>
        </div>
        {apiReady && (
          <span style={{ background: 'var(--success-muted)', color: 'var(--success)', padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: '1px solid rgba(16,185,129,0.3)' }}>
            ✅ API Ready
          </span>
        )}
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <div className="card-body" style={{ textAlign: 'center', padding: '56px 40px' }}>
          <div style={{ fontSize: 72, marginBottom: 24, opacity: 0.6 }}>{icon}</div>
          <h2 style={{ color: 'var(--text-heading)', marginBottom: 12, fontSize: 22 }}>{title}</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>
            This module is planned for <strong style={{ color: 'var(--teal)' }}>{phase}</strong>.
            The backend FastAPI endpoints are fully implemented and ready.
          </p>

          {/* Feature list */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, textAlign: 'left', maxWidth: 420, margin: '0 auto 32px' }}>
            {features.map((f) => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--teal)', fontSize: 14 }}>→</span>
                {f}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link to="/cases" className="btn btn-primary">Go to Cases</Link>
            <Link to="/dashboard" className="btn btn-outline-secondary">Dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Individual Placeholder Pages
// ============================================================

export function FindingsPlaceholder() {
  return (
    <PlaceholderPage
      icon="🎯"
      title="Findings Management"
      description="Document and track investigation findings with MITRE ATT&CK mapping"
      phase="Phase 4"
      apiReady={true}
      features={[
        'MITRE ATT&CK mapping',
        'IOC indicator tracking',
        'Severity classification',
        'Evidence linkage',
        'Review workflow',
        'Tag-based filtering',
      ]}
    />
  );
}

export function TimelinePlaceholder() {
  return (
    <PlaceholderPage
      icon="📅"
      title="Investigation Timeline"
      description="Chronological event visualization for case reconstruction"
      phase="Phase 4"
      apiReady={true}
      features={[
        'Interactive timeline view',
        'Event type filtering',
        'Multi-source events',
        'Evidence linkage',
        'Importance levels',
        'Export to report',
      ]}
    />
  );
}

export function RiskPlaceholder() {
  return (
    <PlaceholderPage
      icon="🛡️"
      title="Risk Assessment"
      description="5×5 risk matrix analysis for cyber threat evaluation"
      phase="Phase 4"
      apiReady={true}
      features={[
        '5×5 risk matrix',
        'Threat actor profiles',
        'Asset criticality',
        'Mitigation tracking',
        'Risk score calculation',
        'Residual risk notes',
      ]}
    />
  );
}

export function ReportsPlaceholder() {
  return (
    <PlaceholderPage
      icon="📄"
      title="Investigation Reports"
      description="Generate professional PDF reports via FastAPI + ReportLab backend"
      phase="Phase 4"
      apiReady={true}
      features={[
        'PDF generation (ReportLab)',
        'Executive summary',
        'Evidence inventory',
        'Timeline inclusion',
        'Custom sections',
        'Secure download URLs',
      ]}
    />
  );
}

export function ForensicsPlaceholder() {
  return (
    <div>
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
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ fontSize: 36 }}>{tool.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <h6 style={{ margin: 0, fontWeight: 700, color: 'var(--text-heading)' }}>{tool.name}</h6>
                      <span style={{ fontSize: 10, background: 'rgba(100,116,139,0.15)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                        🔌 Stub Ready
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>{tool.description}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {tool.capabilities.map((cap) => (
                        <span key={cap} style={{ fontSize: 10, background: 'var(--teal-muted)', color: 'var(--teal)', padding: '2px 8px', borderRadius: 20 }}>
                          {cap}
                        </span>
                      ))}
                    </div>
                    <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '8px 12px', borderRadius: 6, fontFamily: 'var(--font-mono)' }}>
                      {tool.adapterPath}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24 }} className="card">
        <div className="card-body">
          <h6 style={{ fontWeight: 700, marginBottom: 12, color: 'var(--text-heading)' }}>
            🔌 Integration Architecture
          </h6>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 0 }}>
            Each tool adapter in <code style={{ color: 'var(--teal)' }}>backend/app/services/forensics/</code> implements
            a common interface with <code style={{ color: 'var(--teal)' }}>is_available()</code>, <code style={{ color: 'var(--teal)' }}>get_status()</code>,
            and <code style={{ color: 'var(--teal)' }}>analyze()</code> methods.
            The <code style={{ color: 'var(--teal)' }}>GET /api/v1/forensics/tools</code> endpoint reports live availability.
            Tools are integrated by implementing the stub methods — no architectural changes needed.
          </p>
        </div>
      </div>
    </div>
  );
}

const FORENSIC_TOOLS = [
  {
    name: 'Volatility 3',
    icon: '🧠',
    description: 'Memory forensics framework for analyzing RAM dumps and extracting artifacts',
    capabilities: ['Process Listing', 'Network Connections', 'DLL Analysis', 'Malware Detection'],
    adapterPath: 'services/forensics/volatility_adapter.py',
  },
  {
    name: 'Wireshark / tshark',
    icon: '📡',
    description: 'Network packet analysis and PCAP file parsing for traffic investigation',
    capabilities: ['PCAP Analysis', 'Protocol Stats', 'DNS Extraction', 'IP Conversations'],
    adapterPath: 'services/forensics/wireshark_adapter.py',
  },
  {
    name: 'Autopsy',
    icon: '🔬',
    description: 'Digital forensics platform for disk and file system analysis',
    capabilities: ['Case Management', 'Artifact Extraction', 'File Analysis', 'Keyword Search'],
    adapterPath: 'services/forensics/autopsy_adapter.py',
  },
  {
    name: 'FTK Imager',
    icon: '💿',
    description: 'Forensic disk imaging tool for creating verified evidence copies',
    capabilities: ['Disk Imaging', 'Image Verification', 'Evidence Containers', 'Image Mounting'],
    adapterPath: 'services/forensics/ftk_adapter.py',
  },
];
