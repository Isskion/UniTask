'use client'

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const UnifluxC4ComponentNode = ({ data, selected }: any) => {
    const bg = '#85BBF0';
    const border = '#5d9fd4';
    const textColor = '#1a3a5c';

    return (
        <div style={{
            background: bg,
            border: `2px dashed ${border}`,
            borderRadius: 6,
            padding: '10px 14px',
            minWidth: 140,
            maxWidth: 200,
            textAlign: 'center',
            boxShadow: selected ? `0 0 0 2px ${border}88` : '0 1px 4px rgba(0,0,0,0.12)',
            cursor: data.isLocked ? 'default' : 'grab',
        }}>
            <Handle type="target" position={Position.Top} style={{ background: border }} />

            <div style={{ fontSize: 18, marginBottom: 3 }}>🧩</div>
            <div style={{ color: textColor, fontWeight: 700, fontSize: 12, lineHeight: 1.3 }}>
                {data.label}
            </div>
            <div style={{ color: '#2e6da4', fontSize: 10, marginTop: 2 }}>
                [Component]
            </div>
            {data.technology && (
                <div style={{
                    color: textColor,
                    fontSize: 10,
                    marginTop: 4,
                    background: 'rgba(0,0,0,0.08)',
                    borderRadius: 3,
                    padding: '1px 6px',
                    display: 'inline-block',
                }}>
                    {data.technology}
                </div>
            )}
            {data.description && (
                <div style={{ color: '#1a3a5caa', fontSize: 10, marginTop: 5, fontStyle: 'italic' }}>
                    {data.description}
                </div>
            )}

            <Handle type="source" position={Position.Bottom} style={{ background: border }} />
            <Handle type="source" position={Position.Right} style={{ background: border }} />
            <Handle type="target" position={Position.Left} style={{ background: border }} />
        </div>
    );
};

export default memo(UnifluxC4ComponentNode);
