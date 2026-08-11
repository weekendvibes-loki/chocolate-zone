import type { SVGProps } from 'react';

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
      <g transform="translate(400, 300)">
        <g fill="none" stroke="#F2B84B" strokeWidth={2} opacity={0.9}>
          <ellipse cx={0} cy={-25} rx={225} ry={210} transform="rotate(0, 0, -25)" />
          <ellipse cx={0} cy={-25} rx={225} ry={210} transform="rotate(30, 0, -25)" />
          <ellipse cx={0} cy={-25} rx={225} ry={210} transform="rotate(60, 0, -25)" />
          <ellipse cx={0} cy={-25} rx={225} ry={210} transform="rotate(90, 0, -25)" />
          <ellipse cx={0} cy={-25} rx={225} ry={210} transform="rotate(120, 0, -25)" />
          <ellipse cx={0} cy={-25} rx={225} ry={210} transform="rotate(150, 0, -25)" />
        </g>
        <g transform="translate(-160, -180)">
          <line x1={-30} y1={-20} x2={-55} y2={-45} stroke="#F2B84B" strokeWidth={4} strokeLinecap="round" />
          <line x1={-55} y1={-5} x2={-85} y2={-15} stroke="#F2B84B" strokeWidth={4} strokeLinecap="round" />
          <line x1={-65} y1={20} x2={-95} y2={25} stroke="#F2B84B" strokeWidth={4} strokeLinecap="round" />
        </g>
        <text
          x={0}
          y={25}
          fill="#FFF7EA"
          fontFamily="'Great Vibes', cursive, 'Brush Script MT'"
          fontSize={165}
          textAnchor="middle"
        >
          {'Chocolate'}
        </text>
        <text
          x={12}
          y={115}
          fill="#F2B84B"
          fontFamily="'Montserrat', sans-serif"
          fontSize={32}
          fontWeight={600}
          letterSpacing={22}
          textAnchor="middle"
        >
          {'ZONE'}
        </text>
      </g>
    </svg>
  );
}
