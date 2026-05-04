'use client';

import React from 'react';

export interface AlignmentGuide {
    id: string;
    type: 'vertical' | 'horizontal';
    position: number; // coordinate in flow space
}

export interface DistanceIndicator {
    id: string;
    type: 'vertical' | 'horizontal';
    x: number;
    y: number;
    distance: number;
}

interface UnifluxAlignmentGuidesProps {
    guides: AlignmentGuide[];
    distances: DistanceIndicator[];
}

export default function UnifluxAlignmentGuides({ guides, distances }: UnifluxAlignmentGuidesProps) {
    return (
        <div className="absolute inset-0 pointer-events-none z-10">
            <svg className="w-full h-full overflow-visible">
                {/* Lateral Guides */}
                {guides.map((guide) => (
                    <line
                        key={guide.id}
                        x1={guide.type === 'vertical' ? guide.position : -10000}
                        y1={guide.type === 'horizontal' ? guide.position : -10000}
                        x2={guide.type === 'vertical' ? guide.position : 10000}
                        y2={guide.type === 'horizontal' ? guide.position : 10000}
                        stroke="#6366f1"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                        className="opacity-60"
                    />
                ))}

                {/* Distance Indicators */}
                {distances.map((dist) => (
                    <g key={dist.id} className="opacity-80">
                        {dist.type === 'horizontal' ? (
                            <>
                                <line 
                                    x1={dist.x - dist.distance} y1={dist.y} 
                                    x2={dist.x} y2={dist.y} 
                                    stroke="#ec4899" strokeWidth="1.5" 
                                />
                                <line x1={dist.x - dist.distance} y1={dist.y - 4} x2={dist.x - dist.distance} y2={dist.y + 4} stroke="#ec4899" strokeWidth="1.5" />
                                <line x1={dist.x} y1={dist.y - 4} x2={dist.x} y2={dist.y + 4} stroke="#ec4899" strokeWidth="1.5" />
                                <text 
                                    x={dist.x - dist.distance / 2} y={dist.y - 6} 
                                    textAnchor="middle" fontSize="10" fontWeight="bold" fill="#ec4899"
                                    className="select-none"
                                >
                                    {Math.round(dist.distance)}
                                </text>
                            </>
                        ) : (
                            <>
                                <line 
                                    x1={dist.x} y1={dist.y - dist.distance} 
                                    x2={dist.x} y2={dist.y} 
                                    stroke="#ec4899" strokeWidth="1.5" 
                                />
                                <line x1={dist.x - 4} y1={dist.y - dist.distance} x2={dist.x + 4} y2={dist.y - dist.distance} stroke="#ec4899" strokeWidth="1.5" />
                                <line x1={dist.x - 4} y1={dist.y} x2={dist.x + 4} y2={dist.y} stroke="#ec4899" strokeWidth="1.5" />
                                <text 
                                    x={dist.x + 8} y={dist.y - dist.distance / 2} 
                                    dominantBaseline="middle" fontSize="10" fontWeight="bold" fill="#ec4899"
                                    className="select-none"
                                >
                                    {Math.round(dist.distance)}
                                </text>
                            </>
                        )}
                    </g>
                ))}
            </svg>
        </div>
    );
}
