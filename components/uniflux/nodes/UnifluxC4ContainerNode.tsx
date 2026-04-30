'use client'

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ExternalLink } from 'lucide-react';

const CONTAINER_META: Record<string, { icon: string; tag: string }> = {
    C4_CONTAINER_WEB:   { icon: '🌐', tag: 'Web App' },
    C4_CONTAINER_API:   { icon: '⚙️',  tag: 'API / Backend' },
    C4_CONTAINER_DB:    { icon: '🗄️',  tag: 'Database' },
    C4_CONTAINER_QUEUE: { icon: '📨', tag: 'Message Queue' },
};

const UnifluxC4ContainerNode = ({ data, selected }: any) => {
    const meta = CONTAINER_META[data.c4Type as string] ?? { icon: '📦', tag: 'Container' };
    const bg = '#438DD5';
    const border = '#2e6da4';

    return (
        <div style={{
            background: bg,
            border: `2px solid ${border}`,
            borderRadius: 6,
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

            <div style={{ fontSize: 20, marginBottom: 4 }}>{meta.icon}</div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>
                {data.label}
            </div>
            <div style={{ color: '#ffffffcc', fontSize: 10, marginTop: 2 }}>
                [{meta.tag}]
            </div>
            {data.technology && (
                <div style={{
                    color: '#fff',
                    fontSize: 10,
                    marginTop: 4,
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 3,
                    padding: '1px 6px',
                    display: 'inline-block',
                }}>
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

export default memo(UnifluxC4ContainerNode);
