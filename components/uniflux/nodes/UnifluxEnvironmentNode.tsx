'use client'

import React, { memo } from 'react';
import { NodeResizer } from '@xyflow/react';

const UnifluxEnvironmentNode = ({ data, selected }: any) => {
    const isLocked = data.isLocked || false;

    return (
        <>
            {!isLocked && (
                <NodeResizer
                    color="#94a3b8"
                    isVisible={selected}
                    minWidth={150}
                    minHeight={120}
                />
            )}
            {/* Label fixed at top — pointer-events-none so clicks pass through to contained nodes */}
            <div className="absolute top-2 left-3 right-3 pointer-events-none select-none flex items-center gap-1.5">
                <span className="font-bold text-slate-500 uppercase tracking-tighter text-[10px] bg-white/70 backdrop-blur-sm px-1.5 py-0.5 rounded border border-slate-200/60">
                    {data.label}
                </span>
                {isLocked && (
                    <span className="text-[9px] text-slate-400 bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                        Bloqueado
                    </span>
                )}
            </div>
        </>
    );
};

export default memo(UnifluxEnvironmentNode);
