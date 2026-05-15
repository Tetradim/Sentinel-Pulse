// ── Tunnel SVG backgrounds per card state ────────────────────────────────────
export function TunnelSVG({ color }: { color: 'gold' | 'red' | 'amber' | 'blue' }) {
  const configs = {
    gold:  { core: '#c87808', mid: '#8a5005', glow: '#ffd060', line: 'rgba(200,140,8,0.5)',  frame: 'rgba(220,160,10,0.45)' },
    red:   { core: '#a01018', mid: '#600808', glow: '#ff6070', line: 'rgba(192,40,46,0.5)',  frame: 'rgba(220,50,60,0.45)'  },
    amber: { core: '#b87808', mid: '#704805', glow: '#e0a820', line: 'rgba(190,130,8,0.45)', frame: 'rgba(210,150,10,0.4)'  },
    blue:  { core: '#1840a0', mid: '#0c2060', glow: '#6090e0', line: 'rgba(77,130,220,0.45)',frame: 'rgba(100,150,240,0.4)' },
  };
  const c = configs[color];
  const id = `tg-${color}`;
  const id2 = `tg2-${color}`;
  return (
    <svg viewBox="0 0 200 215" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%' }}>
      <defs>
        <radialGradient id={id} cx="50%" cy="50%" r="55%">
          <stop offset="0%"   stopColor={c.core} stopOpacity="0.9" />
          <stop offset="30%"  stopColor={c.mid}  stopOpacity="0.7" />
          <stop offset="70%"  stopColor="#2a1802" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#050204" stopOpacity="0.9" />
        </radialGradient>
        <radialGradient id={id2} cx="50%" cy="50%" r="28%">
          <stop offset="0%"   stopColor={c.glow} stopOpacity="0.7" />
          <stop offset="100%" stopColor={c.core} stopOpacity="0"   />
        </radialGradient>
      </defs>
      <rect width="200" height="215" fill="#050204" />
      <rect width="200" height="215" fill={`url(#${id})`} />
      {/* Corridor lines */}
      {[[100,107,0,0],[100,107,200,0],[100,107,0,215],[100,107,200,215],
        [100,107,0,107],[100,107,200,107],[100,107,100,0],[100,107,100,215]
      ].map(([x1,y1,x2,y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i < 4 ? c.line : c.line.replace('0.5','0.32')} strokeWidth={i < 4 ? 1 : 0.8} />
      ))}
      {/* Nested square frames */}
      {[[70,77,60,60],[50,57,100,100],[30,37,140,140],[10,17,180,180]].map(([x,y,w,h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill="none" stroke={c.frame} strokeWidth={i === 0 ? 1 : 0.8} strokeOpacity={1 - i * 0.2} />
      ))}
      {/* Bright center */}
      <rect width="200" height="215" fill={`url(#${id2})`} />
      {/* Corner tech marks */}
      <rect x="0"   y="0"   width="18" height="2" fill={c.frame} />
      <rect x="0"   y="0"   width="2"  height="18" fill={c.frame} />
      <rect x="182" y="0"   width="18" height="2" fill={c.frame} />
      <rect x="198" y="0"   width="2"  height="18" fill={c.frame} />
      {/* Readability overlay */}
      <rect width="200" height="215" fill="rgba(4,2,8,0.38)" />
    </svg>
  );
}
