'use client'

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const UnifluxC4PersonNode = ({ data, selected }: any) => {
    const isExternal = data.external || false;
    const bg = isExternal ? '#999999' : '#08427B';
    const border = isExternal ? '#6e6e6e' : '#052E56';
    const tag = isExternal ? 'Person [External]' : 'Person';

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0,
                filter: selected ? `drop-shadow(0 0 6px ${bg}88)` : 'none',
                cursor: data.isLocked ? 'default' : 'grab',
            }}
        >
            <Handle type="target" position={Position.Top} style={{ background: border, border: `2px solid ${border}` }} />

            {/* Person figure */}
            <svg width="48" height="52" viewBox="0 0 48 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="12" r="11" fill={bg} stroke={border} strokeWidth="2" />
                <path d="M4 48 C4 32 44 32 44 48" fill={bg} stroke={border} strokeWidth="2" strokeLinecap="round" />
            </svg>

            {/* Label box */}
            <div style={{
                background: bg,
                border: `2px solid ${border}`,
                borderRadius: 4,
                padding: '6px 10px',
                minWidth: 120,
                maxWidth: 180,
                textAlign: 'center',
                marginTop: 4,
            }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>
                    {data.label}
                </div>
                <div style={{ color: '#ffffffcc', fontSize: 10, marginTop: 2 }}>
                    [{tag}]
                </div>
                {data.description && (
                    <div style={{ color: '#ffffffaa', fontSize: 10, marginTop: 4, fontStyle: 'italic' }}>
                        {data.description}
                    </div>
                )}
            </div>

            <Handle type="source" position={Position.Bottom} style={{ background: border, border: `2px solid ${border}` }} />
            <Handle type="source" position={Position.Right} style={{ background: border, border: `2px solid ${border}` }} />
            <Handle type="target" position={Position.Left} style={{ background: border, border: `2px solid ${border}` }} />
        </div>
    );
};

export default memo(UnifluxC4PersonNode);
