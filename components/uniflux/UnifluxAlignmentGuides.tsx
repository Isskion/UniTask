'use client';

import React from 'react';

export interface AlignmentGuide {
    id: string;
    type: 'vertical' | 'horizontal';
    position: number; // coordinate in flow space
    start: number;    // start of the segment
    end: number;      // end of the segment
}

export interface DistanceIndicator {
    id: string;
    type: 'vertical' | 'horizontal';
    x: number;
    y: number;
    distance: number;
    label: string;
}

interface UnifluxAlignmentGuidesProps {
    guides: AlignmentGuide[];
    distances: DistanceIndicator[];
}

export default function UnifluxAlignmentGuides({ guides, distances }: UnifluxAlignmentGuidesProps) {
    return (
        <div className="absolute inset-0 pointer-events-none z-[1000]">
            <svg className="w-full h-full overflow-visible">
                {/* Lateral Guides - Localized segments */}
                {guides.map((guide) => (
                    <g key={guide.id}>
                        <line
                            x1={guide.type === 'vertical' ? guide.position : guide.start}
                            y1={guide.type === 'horizontal' ? guide.position : guide.start}
                            x2={guide.type === 'vertical' ? guide.position : guide.end}
                            y2={guide.type === 'horizontal' ? guide.position : guide.end}
                            stroke="#818cf8"
                            strokeWidth="1.5"
                            strokeDasharray="4 2"
                        />
                        {/* Small endpoint markers for a "Pro" look */}
                        <circle 
                            cx={guide.type === 'vertical' ? guide.position : guide.start} 
                            cy={guide.type === 'horizontal' ? guide.position : guide.start} 
                            r="2" fill="#818cf8" 
                        />
                        <circle 
                            cx={guide.type === 'vertical' ? guide.position : guide.end} 
                            cy={guide.type === 'horizontal' ? guide.position : guide.end} 
                            r="2" fill="#818cf8" 
                        />
                    </g>
                ))}

                {/* Distance Indicators - Figma style */}
                {distances.map((dist) => (
                    <g key={dist.id}>
                        {dist.type === 'horizontal' ? (
                            <>
                                {/* Background line */}
                                <line 
                                    x1={dist.x - dist.distance} y1={dist.y} 
                                    x2={dist.x} y2={dist.y} 
                                    stroke="#f472b6" strokeWidth="1" 
                                />
                                {/* End caps */}
                                <line x1={dist.x - dist.distance} y1={dist.y - 4} x2={dist.x - dist.distance} y2={dist.y + 4} stroke="#f472b6" strokeWidth="2" />
                                <line x1={dist.x} y1={dist.y - 4} x2={dist.x} y2={dist.y + 4} stroke="#f472b6" strokeWidth="2" />
                                {/* Distance Label Badge */}
                                <rect 
                                    x={dist.x - dist.distance / 2 - 12} y={dist.y - 18} 
                                    width="24" height="14" rx="4" 
                                    fill="#f472b6" 
                                />
                                <text 
                                    x={dist.x - dist.distance / 2} y={dist.y - 8} 
                                    textAnchor="middle" fontSize="9" fontWeight="800" fill="white"
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
                                    stroke="#f472b6" strokeWidth="1" 
                                />
                                <line x1={dist.x - 4} y1={dist.y - dist.distance} x2={dist.x + 4} y2={dist.y - dist.distance} stroke="#f472b6" strokeWidth="2" />
                                <line x1={dist.x - 4} y1={dist.y} x2={dist.x + 4} y2={dist.y} stroke="#f472b6" strokeWidth="2" />
                                <rect 
                                    x={dist.x + 6} y={dist.y - dist.distance / 2 - 7} 
                                    width="24" height="14" rx="4" 
                                    fill="#f472b6" 
                                />
                                <text 
                                    x={dist.x + 18} y={dist.y - dist.distance / 2 + 3} 
                                    textAnchor="middle" fontSize="9" fontWeight="800" fill="white"
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
