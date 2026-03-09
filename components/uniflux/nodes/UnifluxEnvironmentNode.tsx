'use client'

import React, { memo } from 'react';
import { NodeResizer } from '@xyflow/react';
import { Lock, Unlock } from 'lucide-react';

const UnifluxEnvironmentNode = ({ data, selected, id }: any) => {
    const isLocked = data.isLocked || false;

    const toggleLock = (e: React.MouseEvent) => {
        e.stopPropagation();
        // This will be handled via data update in the workspace
        if (data.onToggleLock) {
            data.onToggleLock(id, !isLocked);
        }
    };

    return (
        <>
            {!isLocked && (
                <NodeResizer
                    color="#94a3b8"
                    isVisible={selected}
                    minWidth={100}
                    minHeight={100}
                />
            )}
            <div className="p-3 flex items-center justify-between pointer-events-none">
                <div className="font-bold text-slate-500 uppercase tracking-tighter text-xs">
                    {data.label}
                </div>
                <button
                    onClick={toggleLock}
                    className="pointer-events-auto p-1 hover:bg-slate-200 rounded transition-colors text-slate-400 hover:text-slate-600"
                    title={isLocked ? "Desbloquear Entorno" : "Bloquear Entorno"}
                >
                    {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
            </div>
        </>
    );
};

export default memo(UnifluxEnvironmentNode);
