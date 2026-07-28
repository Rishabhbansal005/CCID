import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/api/client';
import { ReportStatusBadge } from './ReportList';

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['report', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          case:cases(id, case_number, title),
          generator:users!reports_generated_by_fkey(full_name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reportId: string) => {
      await apiClient.delete(`/reports/${reportId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports_list'] });
      queryClient.invalidateQueries({ queryKey: ['reports', 'dashboard'] });
      navigate('/reports');
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || err.message || 'Failed to delete report');
    }
  });

  const handleDownload = async () => {
    if (!report) return;
    try {
      const res = await apiClient.get(`/reports/${report.id}/download`);
      window.open(res.data.download_url, '_blank');
    } catch (err: any) {
      alert(err.response?.data?.detail || err.message || 'Failed to download report');
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to permanently delete this report? This cannot be undone.')) {
      deleteMutation.mutate(report.id);
    }
  };

  if (isLoading) return <div className="page-content"><div className="skeleton" style={{ height: 200, borderRadius: 8 }} /></div>;
  if (error || !report) return <div className="page-content"><h3>Report not found</h3></div>;

  return (
    <div className="page-content animate-in" style={{ maxWidth: 860, margin: '0 auto', padding: '40px 20px' }}>
      
      {/* Header Area */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 40 }}>
        <button 
          className="btn btn-sm" 
          style={{ 
            marginBottom: 24, 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20,
            padding: '6px 16px',
            color: 'var(--text-secondary)'
          }} 
          onClick={() => navigate('/reports')}
        >
          ← Back to Reports
        </button>
        <h1 style={{ 
          fontSize: 32, 
          fontWeight: 700, 
          letterSpacing: '-0.02em', 
          color: 'var(--text-primary)', 
          marginBottom: 8 
        }}>
          {report.title}
        </h1>
        <p style={{ 
          fontSize: 16, 
          color: 'var(--text-secondary)',
          fontWeight: 500 
        }}>
          Case {report.case?.case_number}
        </p>
      </div>

      {/* Primary Actions Area */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 48 }}>
        {report.status === 'ready' ? (
          <button 
            onClick={handleDownload}
            style={{
              background: 'var(--teal)',
              color: '#000',
              border: 'none',
              borderRadius: 24,
              padding: '12px 32px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 180, 216, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Download PDF
          </button>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '12px 32px',
            borderRadius: 24,
            fontSize: 16,
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span className="spinner" style={{ width: 16, height: 16, border: '2px solid var(--text-secondary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
            Report Generating...
          </div>
        )}

        {user?.role === 'admin' && (
          <button 
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            style={{
              background: 'rgba(220, 53, 69, 0.1)',
              color: 'var(--danger)',
              border: '1px solid rgba(220, 53, 69, 0.2)',
              borderRadius: 24,
              padding: '12px 24px',
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            Delete
          </button>
        )}
      </div>

      {/* iOS-style Grouped List for Metadata */}
      <h3 style={{ marginLeft: 16, marginBottom: 8, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>Report Details</h3>
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 20,
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        marginBottom: 32
      }}>
        
        <div style={rowStyle}>
          <span style={labelStyle}>Status</span>
          <span><ReportStatusBadge status={report.status} /></span>
        </div>
        
        <div style={dividerStyle} />
        
        <div style={rowStyle}>
          <span style={labelStyle}>Generated By</span>
          <span style={valueStyle}>{report.generator?.full_name || 'Unknown'}</span>
        </div>

        <div style={dividerStyle} />

        <div style={rowStyle}>
          <span style={labelStyle}>Generated On</span>
          <span style={valueStyle}>{format(new Date(report.created_at), 'PPP at p')}</span>
        </div>

        <div style={dividerStyle} />

        <div style={rowStyle}>
          <span style={labelStyle}>Report Type</span>
          <span style={{ ...valueStyle, textTransform: 'capitalize' }}>
            {report.report_type.replace('_', ' ')}
          </span>
        </div>

        {report.file_size && (
          <>
            <div style={dividerStyle} />
            <div style={rowStyle}>
              <span style={labelStyle}>File Size</span>
              <span style={valueStyle}>{(report.file_size / 1024).toFixed(1)} KB</span>
            </div>
          </>
        )}
      </div>

      {/* Included Sections */}
      <h3 style={{ marginLeft: 16, marginBottom: 8, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>Included Sections</h3>
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 20,
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
        {report.include_executive_summary && <SectionRow label="Executive Summary" isFirst />}
        {report.include_timeline && <SectionRow label="Timeline" />}
        {report.include_findings && <SectionRow label="Findings" />}
        {report.include_evidence_list && <SectionRow label="Evidence List" />}
        {report.include_risk_assessment && <SectionRow label="Risk Assessment" />}
      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// Styling helpers for iOS Grouped List aesthetic
const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 20px',
  background: 'transparent'
};

const labelStyle: React.CSSProperties = {
  fontSize: 16,
  color: 'var(--text-primary)',
  fontWeight: 400
};

const valueStyle: React.CSSProperties = {
  fontSize: 16,
  color: 'var(--text-secondary)',
  fontWeight: 400
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: 'rgba(255, 255, 255, 0.06)',
  marginLeft: 20
};

function SectionRow({ label, isFirst = false }: { label: string, isFirst?: boolean }) {
  return (
    <>
      {!isFirst && <div style={dividerStyle} />}
      <div style={rowStyle}>
        <span style={labelStyle}>{label}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
    </>
  );
}
