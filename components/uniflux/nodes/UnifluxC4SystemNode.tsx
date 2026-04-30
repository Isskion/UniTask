'use client'

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ExternalLink } from 'lucide-react';

const UnifluxC4SystemNode = ({ data, selected }: any) => {
    const isExternal = data.external || false;
    const bg = isExternal ? '#999999' : '#1168BD';
    const border = isExternal ? '#6e6e6e' : '#0b4884';
    const tag = isExternal ? 'Software System [External]' : 'Software System';

    return (
        <div style={{
            background: bg,
            border: `2px solid ${border}`,
            borderRadius: 8,
            padding: '10px 14px',
            minWidth: 150,
            maxWidth: 220,
            textAlign: 'center',
            boxShadow: selected ? `0 0 0 2px ${bg}88, 0 4px 16px ${bg}44` : '0 2px 8px rgba(0,0,0,0.18)',
            cursor: data.isLocked ? 'default' : 'grab',
            position: 'relative',
        }}>
            {/* V9: Navigation Link */}
            {data.targetFlowId && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (data.onNavigate) data.onNavigate(data.targetFlowId, data.targetNodeId);
                    }}
                    className="absolute -top-3 -right-3 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-50 border-2 border-white"
                    title="Ver flujo relacionado"
                >
                    <ExternalLink className="w-4 h-4" />
                </button>
            )}
            <Handle type="target" position={Position.Top} style={{ background: border }} />

            {/* System icon */}
            <div style={{ fontSize: 22, marginBottom: 4 }}>🖥️</div>

            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>
                {data.label}
            </div>
            <div style={{ color: '#ffffffcc', fontSize: 10, marginTop: 2 }}>
                [{tag}]
            </div>
            {data.technology && (
                <div style={{ color: '#ffffffcc', fontSize: 10, marginTop: 3 }}>
                    {data.technology}
                </div>
            )}
            {data.description && (
                <div style={{ color: '#ffffffaa', fontSize: 10, marginTop: 5, fontStyle: 'italic' }}>
                    {data.description}
                </div>
            )}

            <Handle type="source" position={Position.Bottom} style={{ background: border }} />
            <Handle type="source" position={Position.Right} style={{ background: border }} />
            <Handle type="target" position={Position.Left} style={{ background: border }} />
        </div>
    );
};

export default memo(UnifluxC4SystemNode);
