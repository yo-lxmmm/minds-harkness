
import React, { useMemo, useState } from 'react';
import { Interaction, InteractionType, Participant } from '../types';

interface Props {
  participants: Participant[];
  interactions: Interaction[];
  playbackIndex: number;
  filters: Set<InteractionType>;
}

const HarknessMap: React.FC<Props> = ({ participants, interactions, playbackIndex, filters }) => {
  const [hoveredInteraction, setHoveredInteraction] = useState<Interaction | null>(null);

  const viewBoxSize = 800;
  const cx = viewBoxSize / 2;
  const cy = viewBoxSize / 2;
  const rx = 320;
  const ry = 220;

  const participantPositions = useMemo(() => {
    return participants.map((p, i) => {
      const angle = (i / participants.length) * 2 * Math.PI - Math.PI / 2;
      return {
        ...p,
        x: cx + rx * Math.cos(angle),
        y: cy + ry * Math.sin(angle),
        angle
      };
    });
  }, [participants, cx, cy, rx, ry]);

  const activeInteractions = useMemo(() => {
    return interactions
      .slice(0, playbackIndex + 1)
      .filter(it => filters.has(it.type));
  }, [interactions, playbackIndex, filters]);

  const getLineStyle = (type: InteractionType) => {
    switch (type) {
      case InteractionType.OPEN_QUESTION: return { stroke: '#f43f5e', markerEnd: 'url(#circle-rose)' }; // rose-500
      case InteractionType.DIRECT_QUESTION: return { stroke: '#10b981', markerEnd: 'url(#arrow-emerald)' }; // emerald-500
      case InteractionType.OPEN_STATEMENT: return { stroke: '#fb7185', markerEnd: 'url(#dot-rose)' }; // rose-400
      case InteractionType.DIRECT_RESPONSE: return { stroke: '#0f172a', markerEnd: 'url(#arrow-slate)' }; // slate-900
      case InteractionType.FACILITATOR_META: return { stroke: '#f59e0b', markerEnd: 'url(#arrow-amber)' }; // amber-500
      default: return { stroke: '#94a3b8' };
    }
  };

  return (
    <div className="relative w-full aspect-square max-w-4xl mx-auto bg-white overflow-hidden">
      <svg viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} className="w-full h-full">
        <defs>
          <marker id="arrow-emerald" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="#10b981" />
          </marker>
          <marker id="arrow-slate" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="#0f172a" />
          </marker>
          <marker id="arrow-amber" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="#f59e0b" />
          </marker>
          <marker id="circle-rose" markerWidth="12" markerHeight="12" refX="6" refY="6" orient="auto">
            <circle cx="6" cy="6" r="3" fill="none" stroke="#f43f5e" strokeWidth="2" />
          </marker>
          <marker id="dot-rose" markerWidth="12" markerHeight="12" refX="6" refY="6" orient="auto">
            <circle cx="6" cy="6" r="3" fill="#fb7185" />
          </marker>
          
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Table Oval */}
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="#f1f5f9" strokeWidth="8" />
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="12 12" />

        {/* Center Venn */}
        <g opacity="0.05">
          <circle cx={cx - 50} cy={cy} r="80" fill="#0f172a" />
          <circle cx={cx + 50} cy={cy} r="80" fill="#f43f5e" />
        </g>
        <text x={cx - 120} y={cy} textAnchor="middle" className="text-[10px] font-black fill-slate-300 uppercase tracking-[0.3em]">Inquiry</text>
        <text x={cx + 120} y={cy} textAnchor="middle" className="text-[10px] font-black fill-slate-300 uppercase tracking-[0.3em]">Insight</text>
        
        {/* The Star at Center */}
        <path 
          d="M 400 375 L 405 390 L 420 390 L 408 400 L 413 415 L 400 405 L 387 415 L 392 400 L 380 390 L 395 390 Z" 
          fill="#fbbf24" 
          stroke="#d97706" 
          strokeWidth="1"
          filter="url(#glow)"
        />

        {/* Interaction Lines */}
        {activeInteractions.map((it, idx) => {
          const speaker = participantPositions.find(p => p.id === it.speakerId);
          if (!speaker) return null;

          let targetX = cx;
          let targetY = cy;

          if (it.recipientId && it.recipientId !== 'GROUP') {
            const recipient = participantPositions.find(p => p.id === it.recipientId);
            if (recipient) {
              targetX = recipient.x;
              targetY = recipient.y;
            }
          }

          const style = getLineStyle(it.type);
          const isHovered = hoveredInteraction?.id === it.id;
          const isLatest = idx === activeInteractions.length - 1;

          return (
            <path
              key={`${it.id}-${idx}`}
              d={`M ${speaker.x} ${speaker.y} L ${targetX} ${targetY}`}
              fill="none"
              stroke={style.stroke}
              strokeWidth={isHovered ? 6 : isLatest ? 3 : 1.5}
              strokeOpacity={isHovered ? 1 : isLatest ? 0.8 : 0.3}
              markerEnd={style.markerEnd}
              className="transition-all duration-500 cursor-pointer"
              onMouseEnter={() => setHoveredInteraction(it)}
              onMouseLeave={() => setHoveredInteraction(null)}
            />
          );
        })}

        {/* Participants */}
        {participantPositions.map((p) => (
          <g key={p.id} className="group/participant cursor-default">
            {/* Outer Ring */}
            <circle 
              cx={p.x} cy={p.y} r="32" 
              fill="white" 
              stroke={p.isFacilitator ? "#f59e0b" : "#e2e8f0"} 
              strokeWidth="2"
              className="transition-all duration-300 group-hover/participant:stroke-slate-400 group-hover/participant:r-34"
            />
            {/* Inner Circle */}
            <circle 
              cx={p.x} cy={p.y} r="26" 
              fill={p.isFacilitator ? "#fffbeb" : "#f8fafc"} 
              className="transition-all duration-300 group-hover/participant:fill-slate-50"
            />
            <text x={p.x} y={p.y + 6} textAnchor="middle" className="text-xs font-display font-black fill-slate-800 pointer-events-none uppercase">
              {p.initials.slice(0, 3)}
            </text>
            
            {/* Label */}
            <rect 
              x={p.x - 40} y={p.y + 42} width="80" height="20" rx="10" 
              fill="white" 
              className="opacity-0 group-hover/participant:opacity-100 transition-opacity duration-300 shadow-sm"
            />
            <text x={p.x} y={p.y + 55} textAnchor="middle" className="text-[9px] font-black fill-slate-400 uppercase tracking-widest pointer-events-none">
              {p.fullName.split(' ')[0]}
            </text>
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {hoveredInteraction && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[320px] glass-card p-6 rounded-3xl z-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getLineStyle(hoveredInteraction.type).stroke.includes('f43f5e') ? 'bg-rose-500' : 'bg-slate-900'}`} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {hoveredInteraction.type.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="text-[10px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">
              {participants.find(p => p.id === hoveredInteraction.speakerId)?.initials} → 
              {hoveredInteraction.recipientId === 'GROUP' ? ' Group' : 
                participants.find(p => p.id === hoveredInteraction.recipientId)?.initials || ' ?'}
            </div>
          </div>
          <p className="text-sm font-medium text-slate-800 leading-relaxed mb-3 italic">"{hoveredInteraction.text}"</p>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-[11px] text-slate-500 leading-snug">{hoveredInteraction.summary}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HarknessMap;
