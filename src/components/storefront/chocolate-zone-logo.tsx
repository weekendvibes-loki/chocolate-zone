import type { SVGProps } from 'react';

const brandStyles = `
.brand-title {
  font-family: 'Great Vibes', cursive, 'Brush Script MT';
  font-size: 165px;
  fill: #4a2910;
  text-anchor: middle;
}

.brand-subtitle {
  font-family: 'Montserrat', sans-serif;
  font-size: 32px;
  font-weight: 600;
  letter-spacing: 22px;
  fill: #4a2910;
  text-anchor: middle;
}

.gold-ring {
  fill: none;
  stroke: #b58645;
}

.accent-burst {
  fill: none;
  stroke: #4a2910;
  stroke-width: 4;
  stroke-linecap: round;
}
`;

export function ChocolateZoneLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 600"
      width="100%"
      height="100%"
      role="img"
      aria-label="Chocolate Zone"
      {...props}
    >
      <defs>
        <style>{brandStyles}</style>
      </defs>
      <rect width={800} height={600} fill="none" />
      <g transform="translate(400, 300)">
        <g className="gold-ring" strokeWidth={2} opacity={0.9}>
          <ellipse cx={0} cy={-25} rx={225} ry={210} transform="rotate(0, 0, -25)" />
          <ellipse cx={0} cy={-25} rx={225} ry={210} transform="rotate(30, 0, -25)" />
          <ellipse cx={0} cy={-25} rx={225} ry={210} transform="rotate(60, 0, -25)" />
          <ellipse cx={0} cy={-25} rx={225} ry={210} transform="rotate(90, 0, -25)" />
          <ellipse cx={0} cy={-25} rx={225} ry={210} transform="rotate(120, 0, -25)" />
          <ellipse cx={0} cy={-25} rx={225} ry={210} transform="rotate(150, 0, -25)" />
        </g>
        <g transform="translate(-160, -180)">
          <line x1={-30} y1={-20} x2={-55} y2={-45} className="accent-burst" />
          <line x1={-55} y1={-5} x2={-85} y2={-15} className="accent-burst" />
          <line x1={-65} y1={20} x2={-95} y2={25} className="accent-burst" />
        </g>
        <text x={0} y={25} className="brand-title">
          {'Chocolate'}
        </text>
        <text x={12} y={115} className="brand-subtitle">
          {'ZONE'}
        </text>
      </g>
    </svg>
  );
}
