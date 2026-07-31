import React, { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  NodeProps,
  Handle,
  Position,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GraphData } from '@/types';

/* ── Custom Node Components ── */

const EvidenceNode = ({ data }: NodeProps) => (
  <div style={{
    padding: '10px 16px', minWidth: '160px', textAlign: 'center',
    background: 'linear-gradient(135deg, #0d1f2d, #0a1a26)',
    border: '2px solid var(--teal)',
    borderRadius: '10px',
    boxShadow: '0 0 16px rgba(0,212,255,0.25)',
  }}>
    <Handle type="target" position={Position.Top} style={{ background: 'var(--teal)', width: 10, height: 10, border: '2px solid #000' }} />
    <div style={{ marginBottom: 4 }}>
      <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Evidence
      </span>
    </div>
    <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', wordBreak: 'break-all' }}>{data.label}</div>
    <Handle type="source" position={Position.Bottom} style={{ background: 'var(--teal)', width: 10, height: 10, border: '2px solid #000' }} />
  </div>
);

const IOCNode = ({ data }: NodeProps) => {
  const color = data.severity === 'critical' ? 'var(--danger)'
              : data.severity === 'high'     ? 'var(--orange)'
              : 'var(--warning)';
  const bg = data.severity === 'critical' ? 'rgba(239,68,68,0.08)'
           : data.severity === 'high'     ? 'rgba(255,107,53,0.08)'
           : 'rgba(245,158,11,0.08)';

  return (
    <div style={{
      padding: '10px 16px', minWidth: '180px', textAlign: 'center',
      background: bg,
      border: `2px solid ${color}`,
      borderRadius: '10px',
      boxShadow: `0 0 20px ${color}40`,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: color, width: 10, height: 10, border: '2px solid #000' }} />
      <div style={{ marginBottom: 4 }}>
        <span style={{ fontSize: '9px', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {data.type} (IOC)
        </span>
      </div>
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', wordBreak: 'break-all', marginBottom: data.confidence ? 6 : 0 }}>
        {data.label}
      </div>
      {data.confidence && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
          <div style={{ flex: 1, maxWidth: 80, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${data.confidence}%`, height: '100%', background: color, borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: '11px', color, fontWeight: 700 }}>{data.confidence}%</span>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 10, height: 10, border: '2px solid #000' }} />
    </div>
  );
};

const FindingNode = ({ data }: NodeProps) => (
  <div style={{
    padding: '10px 16px', minWidth: '160px', textAlign: 'center',
    background: 'rgba(239,68,68,0.12)',
    border: '2px solid var(--danger)',
    borderRadius: '10px',
    boxShadow: '0 0 20px rgba(239,68,68,0.3)',
  }}>
    <Handle type="target" position={Position.Top} style={{ background: 'var(--danger)', width: 10, height: 10, border: '2px solid #000' }} />
    <div style={{ marginBottom: 4 }}>
      <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Generated Finding
      </span>
    </div>
    <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>{data.label || 'Auto Finding'}</div>
    <Handle type="source" position={Position.Bottom} style={{ background: 'var(--danger)', width: 10, height: 10, border: '2px solid #000' }} />
  </div>
);

const nodeTypes = {
  evidenceNode: EvidenceNode,
  iocNode:      IOCNode,
  findingNode:  FindingNode,
};

/* ── Main Component ── */

interface InvestigationGraphProps {
  data: GraphData;
}

const InvestigationGraph: React.FC<InvestigationGraphProps> = ({ data }) => {

  const initialNodes = useMemo(() => {
    let ex = 80, ix = 80, fx = 80;
    const ey = 60, iy = 240, fy = 420;

    const nodes = data?.nodes || [];
    return nodes.map((node) => {
      let position = { x: 0, y: 0 };
      if (node.type === 'evidenceNode') { position = { x: ex, y: ey }; ex += 280; }
      else if (node.type === 'iocNode') { position = { x: ix, y: iy }; ix += 320; }
      else                              { position = { x: fx, y: fy }; fx += 280; }
      return { ...node, position };
    });
  }, [data?.nodes]);

  const initialEdges = useMemo(() => {
    const edges = data?.edges || [];
    return edges.map(e => ({
      ...e,
      type: 'smoothstep',
      animated: true,
      style: { strokeWidth: 2, stroke: 'rgba(0,212,255,0.5)' },
      labelStyle: { fill: '#94a3b8', fontWeight: 700, fontSize: 11 },
      labelBgStyle: { fill: '#0d1117', fillOpacity: 0.9 },
      labelBgPadding: [6, 4] as [number, number],
      labelBgBorderRadius: 4,
      markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(0,212,255,0.5)' },
    }));
  }, [data?.edges]);

  const nodes = data?.nodes || [];
  if (nodes.length === 0) {
    return (
      <div style={{
        height: '500px', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        background: 'var(--bg-input)',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.25 }}>🕸️</div>
        <p style={{ color: 'var(--text-heading)', fontWeight: 600, fontSize: '15px', margin: '0 0 6px' }}>
          No attack chains generated yet
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
          Click <strong style={{ color: 'var(--teal)' }}>▶ Run Engine</strong> above to build the graph.
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '560px', background: 'var(--bg-input)' }}>
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color="rgba(0,212,255,0.06)"
          gap={28}
          size={1}
        />
        <Controls
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        />
      </ReactFlow>
    </div>
  );
};

export default InvestigationGraph;
