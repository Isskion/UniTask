'use client';

import React, { useState, useRef, useEffect, memo } from 'react';
import { Handle, Position, NodeResizer, NodeToolbar, useReactFlow } from '@xyflow/react';
import { Edit2, Trash, Copy, RotateCw, Link } from 'lucide-react';

const UnifluxTextNode = ({ id, data, selected }: any) => {
    const { updateNodeData, setNodes, setEdges } = useReactFlow();
    
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(data.label || 'Escribe un comentario...');
    const inputRef = useRef<HTMLTextAreaElement>(null);
    
    const isLocked = data.isLocked || false;

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSaveText = () => {
        setIsEditing(false);
        updateNodeData(id, { label: editText });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            handleSaveText();
        }
        if (e.key === 'Escape') {
            setIsEditing(false);
            setEditText(data.label);
        }
    };

    const deleteNode = () => {
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    };

    const duplicateNode = () => {
        setNodes((nds) => {
            const nodeToCopy = nds.find((n) => n.id === id);
            if (!nodeToCopy) return nds;
            const newId = `node-${Date.now()}`;
            const newNode = {
                ...nodeToCopy,
                id: newId,
                position: {
                    x: nodeToCopy.position.x + 40,
                    y: nodeToCopy.position.y + 40,
                },
                selected: true,
            };
            return nds.map(n => ({...n, selected: false})).concat(newNode);
        });
    };

    const handleRotate = () => {
        const currentRotation = data.rotation || 0;
        const nextRotation = (currentRotation + 90) % 360;
        updateNodeData(id, { rotation: nextRotation });
    };

    return (
        <div className="relative min-w-[150px] min-h-[50px] group">
            <NodeToolbar 
                isVisible={selected && !isLocked} 
                position={Position.Top} 
                className="flex items-center gap-1 bg-white p-1 rounded-lg shadow-xl border border-slate-200"
            >
                <button onClick={() => setIsEditing(true)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Editar texto">
                    <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={handleRotate} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Girar 90°">
                    <RotateCw className="w-4 h-4" />
                </button>
                <button onClick={duplicateNode} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Duplicar">
                    <Copy className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <button onClick={deleteNode} className="p-1.5 hover:bg-red-50 rounded text-red-500 transition-colors" title="Eliminar">
                    <Trash className="w-4 h-4" />
                </button>
            </NodeToolbar>

            {!isLocked && (
                <NodeResizer
                    isVisible={selected}
                    minWidth={100}
                    minHeight={30}
                    handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
                    onResizeEnd={(_, { width, height }) => data.onResizeStop?.(id, width, height)}
                />
            )}

            <div 
                className={`w-full h-full p-2 transition-all duration-300 ${selected ? 'ring-2 ring-blue-500/20' : ''}`}
                onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                style={{
                    fontFamily: 'Garamond, Georgia, serif',
                    fontSize: '15px',
                    color: '#334155',
                    cursor: isEditing ? 'text' : 'move',
                    transform: `rotate(${data.rotation || 0}deg)`,
                }}
            >
                {isEditing ? (
                    <textarea
                        ref={inputRef}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleSaveText}
                        className="w-full h-full bg-white/50 border border-blue-200 rounded p-1 outline-none resize-none font-inherit"
                        style={{ minHeight: '100px' }}
                    />
                ) : (
                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                        {data.label || 'Escribe un comentario...'}
                    </div>
                )}
            </div>

            {/* Connection handles: visible only when selected to allow "chaining" to other elements */}
            <Handle type="target" position={Position.Top} style={{ opacity: selected ? 0.6 : 0 }} />
            <Handle type="source" position={Position.Bottom} style={{ opacity: selected ? 0.6 : 0 }} />
            <Handle type="source" position={Position.Left} style={{ opacity: selected ? 0.6 : 0 }} />
            <Handle type="source" position={Position.Right} style={{ opacity: selected ? 0.6 : 0 }} />
        </div>
    );
};

export default memo(UnifluxTextNode);
