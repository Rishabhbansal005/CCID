import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { osintApi, CveResult, ExploitSearchResult, DomainReputationResult, HashLookupResult } from '@/api/osint';

export type ToolType = 'cve' | 'exploit' | 'domain' | 'hash' | 'ipgeo' | 'mac' | 'nmap' | 'breach' | 'whois' | null;

interface OsintToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolType: ToolType;
}

export default function OsintToolModal({ isOpen, onClose, toolType }: OsintToolModalProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || toolType !== 'hash') return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await osintApi.uploadHash(acceptedFiles[0]);
      if (res.success) {
        setResult(res);
      } else {
        setError(res.error || 'No results found.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during file upload.');
    } finally {
      setIsLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  if (!isOpen || !toolType) return null;

  const toolConfig = {
    cve: {
      title: 'Vulnerability Scanner (CVE)',
      placeholder: 'Enter CVE ID (e.g. CVE-2021-44228)',
      action: 'Scan',
      apiCall: osintApi.lookupCve,
    },
    exploit: {
      title: 'Exploit DB Search',
      placeholder: 'Enter keyword (e.g. wordpress, ssh)',
      action: 'Search',
      apiCall: osintApi.searchExploits,
    },
    domain: {
      title: 'Domain Reputation',
      placeholder: 'Enter domain (e.g. example.com)',
      action: 'Check',
      apiCall: osintApi.checkDomain,
    },
    hash: {
      title: 'Malware Sandbox (Hash Lookup)',
      placeholder: 'Enter MD5, SHA1 or SHA256 hash',
      action: 'Submit',
      apiCall: osintApi.checkHash,
    },
    ipgeo: {
      title: 'IP Geolocation',
      placeholder: 'Enter IPv4 or IPv6 address',
      action: 'Locate',
      apiCall: osintApi.checkIpGeo,
    },
    mac: {
      title: 'MAC Address Lookup',
      placeholder: 'Enter MAC address (e.g. 00:11:22:33:44:55)',
      action: 'Lookup',
      apiCall: osintApi.checkMac,
    },
    nmap: {
      title: 'Port Scanner (Nmap)',
      placeholder: 'Enter IP address or Domain to scan',
      action: 'Scan Ports',
      apiCall: osintApi.runNmap,
    },
    breach: {
      title: 'Dark Web / Breach Search',
      placeholder: 'Enter email address (e.g. user@example.com)',
      action: 'Search',
      apiCall: osintApi.checkBreach,
    },
    whois: {
      title: 'WHOIS Explorer',
      placeholder: 'Enter domain (e.g. example.com)',
      action: 'Lookup',
      apiCall: osintApi.lookupWhois,
    },
  }[toolType];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await toolConfig.apiCall(query);
      if (res.success) {
        setResult(res);
      } else {
        setError(res.error || 'No results found.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during the lookup.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    setQuery('');
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: '#0f172a', border: '1px solid var(--border-subtle)',
        borderRadius: '12px', width: '100%', maxWidth: '600px',
        display: 'flex', flexDirection: 'column', maxHeight: '85vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#f8fafc' }}>
            {toolConfig.title}
          </h2>
          <button onClick={resetAndClose} style={{
            background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
            padding: '4px', display: 'flex', alignItems: 'center'
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={toolConfig.placeholder}
              style={{
                flex: 1, padding: '12px 16px', background: 'rgba(30,41,59,0.5)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                color: '#f8fafc', fontSize: '14px', outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !query}
              className="btn btn-primary"
              style={{ padding: '0 24px' }}
            >
              {isLoading ? 'Processing...' : toolConfig.action}
            </button>
          </form>

          {toolType === 'hash' && (
            <div
              {...getRootProps()}
              style={{
                marginBottom: '24px', padding: '32px', textAlign: 'center', cursor: 'pointer',
                background: isDragActive ? 'rgba(99,102,241,0.1)' : 'rgba(15,23,42,0.5)',
                border: isDragActive ? '2px dashed #818cf8' : '2px dashed rgba(255,255,255,0.1)',
                borderRadius: '8px', color: isDragActive ? '#818cf8' : '#94a3b8', transition: 'all 0.2s'
              }}
            >
              <input {...getInputProps()} />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32" style={{ marginBottom: '12px', color: isDragActive ? '#818cf8' : '#64748b' }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {isDragActive ? (
                <p style={{ margin: 0, fontWeight: 500 }}>Drop the file here...</p>
              ) : (
                <div>
                  <p style={{ margin: '0 0 4px 0', fontWeight: 500, color: '#e2e8f0' }}>Drag & drop a file here</p>
                  <p style={{ margin: 0, fontSize: '12px' }}>to automatically extract and scan its hash (Max 50MB)</p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={{ padding: '12px', background: 'rgba(244,63,94,0.1)', color: '#f43f5e', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.3)', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {result && (
            <div style={{ background: 'rgba(30,41,59,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', padding: '20px' }}>
              {toolType === 'cve' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '20px', color: '#f8fafc' }}>{result.cve}</h3>
                    {result.cvss && (
                      <span style={{
                        background: result.cvss >= 7 ? 'rgba(244,63,94,0.2)' : 'rgba(251,146,60,0.2)',
                        color: result.cvss >= 7 ? '#f43f5e' : '#fb923c',
                        padding: '4px 10px', borderRadius: '4px', fontWeight: 600, fontSize: '14px'
                      }}>
                        CVSS: {result.cvss}
                      </span>
                    )}
                  </div>
                  <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: 1.6, marginBottom: '16px' }}>{result.summary}</p>
                  {result.references && result.references.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>References:</h4>
                      <ul style={{ margin: 0, paddingLeft: '20px', color: '#6366f1', fontSize: '13px' }}>
                        {result.references.slice(0, 5).map((ref: string, idx: number) => (
                          <li key={idx} style={{ marginBottom: '4px' }}>
                            <a href={ref} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>{ref}</a>
                          </li>
                        ))}
                        {result.references.length > 5 && <li><span style={{ color: '#94a3b8' }}>+ {result.references.length - 5} more</span></li>}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {toolType === 'exploit' && (
                <div>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#f8fafc' }}>
                    Exploits found for: <span style={{ color: '#818cf8' }}>{result.query}</span>
                  </h3>
                  {result.exploits && result.exploits.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {result.exploits.map((exp: any) => (
                        <div key={exp.id} style={{ padding: '12px', background: 'rgba(15,23,42,0.5)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ fontWeight: 500, color: '#f8fafc', marginBottom: '4px', fontSize: '14px' }}>{exp.title}</div>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#94a3b8' }}>
                            <span><strong>Type:</strong> {exp.type}</span>
                            <span><strong>Platform:</strong> {exp.platform}</span>
                            <span><strong>Date:</strong> {exp.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#94a3b8', fontSize: '14px' }}>No exploits found matching this keyword.</p>
                  )}
                </div>
              )}

              {toolType === 'domain' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>{result.domain}</h3>
                    {result.reputation && (
                      <span style={{
                        background: result.rep_color === 'red' ? 'rgba(244,63,94,0.2)' : result.rep_color === 'yellow' ? 'rgba(251,146,60,0.2)' : 'rgba(16,185,129,0.2)',
                        color: result.rep_color === 'red' ? '#f43f5e' : result.rep_color === 'yellow' ? '#fb923c' : '#10b981',
                        padding: '4px 10px', borderRadius: '4px', fontWeight: 600, fontSize: '13px',
                        textTransform: 'uppercase'
                      }}>
                        {result.reputation} Reputation
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Threat Pulses (OTX)</div>
                      <div style={{ fontSize: '20px', fontWeight: 600, color: '#f8fafc' }}>{result.pulse_count || 0}</div>
                    </div>
                    {result.country && (
                      <div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Hosting Country</div>
                        <div style={{ fontSize: '16px', color: '#e2e8f0' }}>{result.country}</div>
                      </div>
                    )}
                    {result.alexa_rank && (
                      <div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Alexa Rank</div>
                        <div style={{ fontSize: '16px', color: '#e2e8f0' }}>#{result.alexa_rank}</div>
                      </div>
                    )}
                  </div>
                  {result.validation && result.validation.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Validation Flags:</h4>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {result.validation.map((v: string) => (
                          <span key={v} style={{ padding: '2px 8px', background: 'rgba(99,102,241,0.1)', color: '#818cf8', borderRadius: '4px', fontSize: '12px' }}>
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.recent_pulses && result.recent_pulses.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Recent Pulses:</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {result.recent_pulses.slice(0, 3).map((p: any, idx: number) => (
                          <div key={idx} style={{ fontSize: '13px', color: '#cbd5e1', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>
                            {p.name} <span style={{ color: '#64748b', fontSize: '11px', marginLeft: '6px' }}>({p.modified.split('T')[0]})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {toolType === 'hash' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '14px', fontFamily: 'monospace', color: '#818cf8', wordBreak: 'break-all' }}>{result.hash}</h3>
                      {result.filename && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>Filename: {result.filename}</div>}
                    </div>
                    {result.verdict && (
                      <span style={{
                        background: result.verdict_color === 'red' ? 'rgba(244,63,94,0.2)' : result.verdict_color === 'yellow' ? 'rgba(251,146,60,0.2)' : 'rgba(16,185,129,0.2)',
                        color: result.verdict_color === 'red' ? '#f43f5e' : result.verdict_color === 'yellow' ? '#fb923c' : '#10b981',
                        padding: '4px 10px', borderRadius: '4px', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', flexShrink: 0, marginLeft: '12px'
                      }}>
                        {result.verdict}
                      </span>
                    )}
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Associated Threat Pulses (OTX)</div>
                    <div style={{ fontSize: '20px', fontWeight: 600, color: '#f8fafc' }}>{result.pulse_count || 0}</div>
                  </div>
                  {result.malware_families && result.malware_families.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Malware Families:</h4>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {result.malware_families.map((m: string) => (
                          <span key={m} style={{ padding: '2px 8px', background: 'rgba(244,63,94,0.1)', color: '#f43f5e', borderRadius: '4px', fontSize: '12px', border: '1px solid rgba(244,63,94,0.3)' }}>
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.recent_pulses && result.recent_pulses.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Recent Pulses:</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {result.recent_pulses.slice(0, 4).map((p: any, idx: number) => (
                          <div key={idx} style={{ fontSize: '13px', color: '#cbd5e1', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>
                            {p.name} <span style={{ color: '#64748b', fontSize: '11px', marginLeft: '6px' }}>({p.modified.split('T')[0]})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {toolType === 'ipgeo' && (
                <div>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#f8fafc' }}>{result.ip}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Country</div>
                      <div style={{ fontSize: '16px', color: '#e2e8f0' }}>{result.country || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>City</div>
                      <div style={{ fontSize: '16px', color: '#e2e8f0' }}>{result.city || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>ISP</div>
                      <div style={{ fontSize: '16px', color: '#e2e8f0' }}>{result.isp || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Organization</div>
                      <div style={{ fontSize: '16px', color: '#e2e8f0' }}>{result.org || 'N/A'}</div>
                    </div>
                  </div>
                  {result.lat && result.lon && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Coordinates</div>
                      <div style={{ fontSize: '16px', color: '#e2e8f0', fontFamily: 'monospace' }}>
                        {result.lat}, {result.lon}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {toolType === 'mac' && (
                <div>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#f8fafc', fontFamily: 'monospace' }}>{result.mac}</h3>
                  <div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Hardware Vendor</div>
                    <div style={{ fontSize: '18px', color: '#e2e8f0', fontWeight: 500 }}>{result.vendor || 'Unknown Vendor'}</div>
                  </div>
                </div>
              )}

              {toolType === 'nmap' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>Scan Results for {result.target}</h3>
                    <span style={{
                      background: 'rgba(99,102,241,0.2)', color: '#818cf8',
                      padding: '4px 10px', borderRadius: '4px', fontWeight: 600, fontSize: '13px'
                    }}>
                      {result.open_ports?.length || 0} Open Ports
                    </span>
                  </div>

                  {result.open_ports && result.open_ports.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', color: '#cbd5e1' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: '#94a3b8' }}>
                          <th style={{ padding: '8px' }}>PORT</th>
                          <th style={{ padding: '8px' }}>STATE</th>
                          <th style={{ padding: '8px' }}>SERVICE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.open_ports.map((p: any) => (
                          <tr key={p.port} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '8px', color: '#f8fafc', fontWeight: 500 }}>{p.port}/tcp</td>
                            <td style={{ padding: '8px', color: '#34d399' }}>{p.state}</td>
                            <td style={{ padding: '8px' }}>{p.service}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                      No open ports found out of {result.total_scanned} scanned.
                    </div>
                  )}
                </div>
              )}

              {toolType === 'breach' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>Breach Results for {result.email}</h3>
                    <span style={{
                      background: result.total_breaches > 0 ? 'rgba(244,63,94,0.2)' : 'rgba(16,185,129,0.2)',
                      color: result.total_breaches > 0 ? '#f43f5e' : '#10b981',
                      padding: '4px 10px', borderRadius: '4px', fontWeight: 600, fontSize: '13px'
                    }}>
                      {result.total_breaches} Breaches Found
                    </span>
                  </div>
                  
                  {result.breaches && result.breaches.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {result.breaches.map((b: any, idx: number) => (
                        <div key={idx} style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '16px' }}>{b.Name}</h4>
                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>{b.BreachDate}</span>
                          </div>
                          <p style={{ margin: '0 0 12px 0', color: '#cbd5e1', fontSize: '14px' }}>{b.Description}</p>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {b.DataClasses.map((dc: string, dcIdx: number) => (
                              <span key={dcIdx} style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', color: '#e2e8f0' }}>
                                {dc}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                      No breaches found. This email appears safe!
                    </div>
                  )}
                </div>
              )}

              {toolType === 'whois' && (
                <div>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#f8fafc' }}>{result.domain}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Registrar</div>
                      <div style={{ fontSize: '16px', color: '#e2e8f0' }}>{result.registrar || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Creation Date</div>
                      <div style={{ fontSize: '16px', color: '#e2e8f0' }}>{result.creation_date?.split('T')[0] || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Expiration Date</div>
                      <div style={{ fontSize: '16px', color: '#e2e8f0' }}>{result.expiration_date?.split('T')[0] || 'N/A'}</div>
                    </div>
                  </div>
                  {result.nameservers && result.nameservers.length > 0 && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Name Servers</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {result.nameservers.map((ns: string, idx: number) => (
                          <div key={idx} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '14px', color: '#cbd5e1' }}>
                            {ns}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
