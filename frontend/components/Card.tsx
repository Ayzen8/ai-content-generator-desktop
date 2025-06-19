import React from 'react';

interface CardProps {
    title: string;
    children: React.ReactNode;
    className?: string;
    loading?: boolean;
}

const Card: React.FC<CardProps> = ({ title, children, className = '', loading = false }) => {
    return (
        <div className={`card ${className} ${loading ? 'loading' : ''}`}>
            <div className="card-header">
                <h3>{title}</h3>
            </div>
            <div className="card-content">
                {loading ? (
                    <div className="loading-spinner">Loading...</div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
};

export default Card;