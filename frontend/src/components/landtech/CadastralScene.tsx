import React from 'react';
import './landtech.css';

export interface Parcel {
  id: string;
  label: string;
  area: string;
  status: 'verified' | 'review' | 'pending';
  points: string;
  center: [number, number];
  dag?: string;
  mouza?: string;
}

export const defaultDemoParcels: Parcel[] = [
  {
    id: 'P-4520',
    label: 'Parcel P-4520 (Tejgaon)',
    area: '4.25 decimal',
    status: 'verified',
    points: '80,42 190,24 228,92 116,111',
    center: [150, 68],
    dag: '১২০৫',
    mouza: 'Tejgaon Circle',
  },
  {
    id: 'P-SMOKE-CONFLICT',
    label: 'Parcel P-103 (Conflict Zone)',
    area: '3.80 decimal',
    status: 'review',
    points: '190,24 294,42 328,106 228,92',
    center: [260, 66],
    dag: '১২৩৪',
    mouza: 'Tejgaon Circle',
  },
  {
    id: 'P-9901',
    label: 'Parcel B-204 (Dhanmondi)',
    area: '5.10 decimal',
    status: 'pending',
    points: '116,111 228,92 263,166 143,190',
    center: [190, 139],
    dag: '৫৬৭৮',
    mouza: 'Dhanmondi',
  },
  {
    id: 'P-1088',
    label: 'Parcel B-205 (Gulshan)',
    area: '4.65 decimal',
    status: 'verified',
    points: '228,92 328,106 355,172 263,166',
    center: [293, 133],
    dag: '৩৪০১',
    mouza: 'Gulshan',
  },
];

interface CadastralSceneProps {
  parcels?: Parcel[];
  selectedId: string;
  onSelect: (id: string) => void;
  scanning?: boolean;
  className?: string;
}

export const CadastralScene: React.FC<CadastralSceneProps> = ({
  parcels = defaultDemoParcels,
  selectedId,
  onSelect,
  scanning = true,
  className = '',
}) => {
  return (
    <div className={`lt-scene ${className}`} aria-label="Interactive 3D Cadastral Parcel Visualization">
      <div className="lt-scene-grid" aria-hidden="true" />
      <div className="lt-scene-orbit lt-orbit-one" aria-hidden="true" />
      <div className="lt-scene-orbit lt-orbit-two" aria-hidden="true" />
      <div className="lt-map-float-label lt-label-north">
        <span>↑</span> NORTH 3D GIS
      </div>
      <div className="lt-map-float-label lt-label-scale">CADASTRAL RADAR</div>

      <svg className="lt-parcel-svg" viewBox="0 0 400 225" role="group" aria-label="Select a cadastral parcel">
        <defs>
          <linearGradient id="ltParcelTop" x1="0" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stopColor="var(--parcel-top, #1b4432)" />
            <stop offset="100%" stopColor="var(--parcel-bottom, #10281e)" />
          </linearGradient>
          <filter id="ltGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {parcels.map((parcel, index) => {
          const selected = parcel.id === selectedId;
          const [cx, cy] = parcel.center;
          const statusColor =
            parcel.status === 'verified'
              ? 'var(--green, #10b981)'
              : parcel.status === 'review'
              ? 'var(--amber, #f59e0b)'
              : 'var(--muted-green, #64748b)';

          return (
            <g
              key={parcel.id}
              className={`lt-parcel ${selected ? 'is-selected' : ''}`}
              onClick={() => onSelect(parcel.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onSelect(parcel.id);
              }}
              role="button"
              tabIndex={0}
              aria-label={`Select ${parcel.label}`}
            >
              <polygon points={parcel.points} transform="translate(0 12)" className="lt-parcel-side" />
              <polygon
                points={parcel.points}
                fill="url(#ltParcelTop)"
                className="lt-parcel-top"
                stroke={statusColor}
                strokeWidth={selected ? 2.4 : 1.2}
              />
              <polygon points={parcel.points} className="lt-parcel-shine" />
              {selected && <polygon points={parcel.points} className="lt-parcel-highlight" filter="url(#ltGlow)" />}
              <circle cx={cx} cy={cy} r={selected ? 4.5 : 2.5} fill={statusColor} className="lt-parcel-point" />
              {selected && (
                <text x={cx} y={cy - 13} className="lt-parcel-tag">
                  {parcel.id}
                </text>
              )}
              {index === 0 && <path d="M95 50 L164 39" className="lt-survey-line" />}
            </g>
          );
        })}
      </svg>

      {scanning && <div className="lt-scan-line" aria-hidden="true" />}
      <div className="lt-map-coordinates">
        <span>23° 48' N</span>
        <span>90° 22' E</span>
      </div>
      <div className="lt-map-side-chip">
        <span className="lt-pulse-dot" />
        PARCEL LAYERS <b>04</b>
      </div>
    </div>
  );
};
