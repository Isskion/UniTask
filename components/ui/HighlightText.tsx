"use client";

import React from 'react';

interface HighlightTextProps {
    text: string;
    highlight?: string;
}

const HighlightText: React.FC<HighlightTextProps> = ({ text, highlight }) => {
    if (!highlight || !text) return <>{text}</>;

    try {
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return (
            <>
                {parts.map((part, i) =>
                    part.toLowerCase() === highlight.toLowerCase() ? (
                        <span key={i} className="text-red-500 font-bold bg-red-500/10 rounded-sm px-0.5 -mx-0.5">{part}</span>
                    ) : (
                        part
                    )
                )}
            </>
        );
    } catch (e) {
        // Fallback in case of invalid regex characters in highlight
        return <>{text}</>;
    }
};

export default HighlightText;
