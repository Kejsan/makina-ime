import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

export const Card = ({ children, className = '' }: CardProps) => {
    return (
        <div className={`bg-surface border border-border rounded-xl p-6 shadow-xl backdrop-blur-sm ${className}`}>
            {children}
        </div>
    );
};
