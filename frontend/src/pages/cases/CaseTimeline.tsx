import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import timelineApi from '@/api/timeline';
import { format } from 'date-fns';
import type { EventType, EventImportance } from '@/types';

interface CaseTimelineProps {
  caseId: string;
}

export default function CaseTimeline({ caseId }: CaseTimelineProps) {
  const [eventTypeFilter, setEventTypeFilter] = useState<EventType | ''>('');
  const [importanceFilter, setImportanceFilter] = useState<EventImportance | ''>('');

  const { data: events, isLoading, error } = useQuery({
    queryKey: ['timeline', caseId, eventTypeFilter, importanceFilter],
    queryFn: () => timelineApi.listForCase(caseId, {
      event_type: eventTypeFilter || undefined,
      importance: importanceFilter || undefined,
    }),
  });

  if (isLoading) {
    return <div className="text-center p-4">Loading timeline...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">Error loading timeline events.</div>;
  }

  const getEventIcon = (type: EventType) => {
    switch (type) {
      case 'system': return '⚙️';
      case 'network': return '🌐';
      case 'user_action': return '👤';
      case 'file': return '📄';
      case 'registry': return '🔑';
      case 'process': return '⚙️';
      case 'authentication': return '🔐';
      case 'email': return '📧';
      case 'web': return '🌍';
      case 'evidence': return '🔬';
      case 'integrity': return '✅';
      case 'memory_analysis': return '🧠';
      case 'network_analysis': return '🕸️';
      case 'finding': return '🎯';
      case 'risk_assessment': return '🛡️';
      default: return '📅';
    }
  };

  const getImportanceColor = (imp: EventImportance) => {
    switch (imp) {
      case 'critical': return 'var(--danger)';
      case 'high': return 'var(--orange)';
      case 'medium': return 'var(--yellow)';
      case 'normal': return 'var(--teal)';
      case 'low': return 'var(--text-muted)';
      case 'informational': return 'var(--blue)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div>
      <div className="d-flex gap-3 mb-4">
        <select 
          className="form-select form-select-sm" 
          style={{ width: 200 }}
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value as EventType | '')}
        >
          <option value="">All Event Types</option>
          <option value="system">System</option>
          <option value="evidence">Evidence</option>
          <option value="integrity">Integrity</option>
          <option value="memory_analysis">Memory Analysis</option>
          <option value="network_analysis">Network Analysis</option>
          <option value="finding">Finding</option>
        </select>

        <select 
          className="form-select form-select-sm" 
          style={{ width: 200 }}
          value={importanceFilter}
          onChange={(e) => setImportanceFilter(e.target.value as EventImportance | '')}
        >
          <option value="">All Importances</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
          <option value="informational">Informational</option>
        </select>
      </div>

      {!events || events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-title">No Events Found</div>
          <div className="empty-state-text">No timeline events match your filters.</div>
        </div>
      ) : (
        <div className="timeline-container" style={{ position: 'relative', paddingLeft: 30, borderLeft: '2px solid var(--border-color)', marginLeft: 20 }}>
          {events.map((ev) => (
            <div key={ev.id} style={{ position: 'relative', marginBottom: 24 }}>
              <div style={{
                position: 'absolute',
                left: -46,
                top: 0,
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'var(--bg-panel)',
                border: `2px solid ${getImportanceColor(ev.importance)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                zIndex: 1
              }}>
                {getEventIcon(ev.event_type)}
              </div>
              <div className="card" style={{ padding: '16px 20px', marginLeft: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <h6 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{ev.title}</h6>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {format(new Date(ev.event_time), 'MMM d, yyyy HH:mm:ss')}
                  </span>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                  {ev.description}
                </p>
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    Type: {ev.event_type.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, background: 'var(--bg-input)', border: `1px solid ${getImportanceColor(ev.importance)}`, color: getImportanceColor(ev.importance), textTransform: 'uppercase' }}>
                    {ev.importance}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
