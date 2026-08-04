import React, { useEffect, useRef, useState } from 'react';
import Globe from 'globe.gl';
import { Activity } from 'lucide-react';

// Random coordinate generator
const getRandomLat = () => (Math.random() - 0.5) * 160; // Keep away from poles
const getRandomLng = () => (Math.random() - 0.5) * 360;

interface ThreatArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string[] | string;
  id: string;
}

interface ThreatPoint {
  lat: number;
  lng: number;
  size: number;
  color: string;
}

const COLORS = [
  ['#ff3333', '#ff0000'], // High risk
  ['#ff9933', '#ff6600'], // Medium risk
  ['#33ccff', '#0099ff'], // Scans
  ['#ff3399', '#cc0066'], // Malware
];

export default function LiveThreatMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeInstance = useRef<any>(null);
  const [activeAttacks, setActiveAttacks] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize the Globe
    const globe = (Globe as any)()(containerRef.current)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundColor('#00000000') // Transparent
      .showAtmosphere(true)
      .atmosphereColor('#2a4365')
      .atmosphereAltitude(0.15)
      // Arc configuration
      .arcColor('color')
      .arcDashLength(0.4)
      .arcDashGap(2)
      .arcDashInitialGap(() => Math.random() * 5)
      .arcDashAnimateTime(2000)
      .arcStroke(0.7)
      // Rings configuration (for impact)
      .ringColor('color')
      .ringMaxRadius('maxR')
      .ringPropagationSpeed('speed')
      .ringRepeatPeriod(800);

    // Set initial camera position and controls
    globe.pointOfView({ lat: 20, lng: 78, altitude: 2.2 }, 1000); // Focus near India initially
    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;
    controls.enableZoom = false; // Disable zooming to prevent layout issues

    globeInstance.current = globe;

    // Simulate incoming threats
    let arcs: ThreatArc[] = [];
    let rings: any[] = [];
    
    const threatInterval = setInterval(() => {
      // Create 1 to 3 new threats every interval
      const numThreats = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < numThreats; i++) {
        const targetLat = 22 + (Math.random() - 0.5) * 20; // Bias towards South Asia/India
        const targetLng = 78 + (Math.random() - 0.5) * 20;
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        
        const newArc = {
          id: Math.random().toString(),
          startLat: getRandomLat(),
          startLng: getRandomLng(),
          endLat: targetLat,
          endLng: targetLng,
          color: color,
        };
        
        const newRing = {
          lat: targetLat,
          lng: targetLng,
          color: color[0],
          maxR: Math.random() * 3 + 1,
          speed: Math.random() * 2 + 1,
        };

        arcs.push(newArc);
        rings.push(newRing);
      }

      // Keep only recent arcs and rings to prevent lag
      if (arcs.length > 30) arcs = arcs.slice(arcs.length - 30);
      if (rings.length > 15) rings = rings.slice(rings.length - 15);

      globe.arcsData(arcs);
      globe.ringsData(rings);
      
      setActiveAttacks(arcs.length);
    }, 1200);

    // Resize handler
    const handleResize = () => {
      if (containerRef.current && globeInstance.current) {
        globeInstance.current.width(containerRef.current.clientWidth);
        globeInstance.current.height(containerRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    // Initial size
    setTimeout(handleResize, 100);

    return () => {
      clearInterval(threatInterval);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="card" style={{ height: '500px', position: 'relative', overflow: 'hidden', padding: 0 }}>
      {/* Overlay HUD */}
      <div 
        style={{ 
          position: 'absolute', 
          top: 20, 
          left: 20, 
          zIndex: 10,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          borderRadius: 8,
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f8fafc', fontWeight: 600, fontSize: 14 }}>
          <Activity size={16} color="#ef4444" className="pulse-anim" />
          Live Global Threat Map
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          Active Vectors: <span style={{ color: '#38bdf8', fontWeight: 600, fontFamily: 'monospace' }}>{activeAttacks}</span>
        </div>
        <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
          Simulated incoming cyber intelligence feed
        </div>
      </div>
      
      {/* Legend */}
      <div 
        style={{ 
          position: 'absolute', 
          bottom: 20, 
          right: 20, 
          zIndex: 10,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 11,
          color: '#cbd5e1'
        }}
      >
        <div style={{ marginBottom: 6, fontWeight: 600, color: '#94a3b8' }}>Threat Vectors</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff3333' }} /> Critical Attack
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff9933' }} /> High Risk
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#33ccff' }} /> Port Scan
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff3399' }} /> Malware Payload
        </div>
      </div>

      <style>{`
        .pulse-anim {
          animation: pulse-red 2s infinite;
        }
        @keyframes pulse-red {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Globe Container */}
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '100%', 
          cursor: 'grab',
          background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)'
        }} 
      />
    </div>
  );
}
