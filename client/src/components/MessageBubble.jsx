import React from 'react';

const MessageBubble = ({ message, sender, isMe }) => {
    return (
        <div style={{
            display: 'flex',
            justifyContent: isMe ? 'flex-end' : 'flex-start',
            marginBottom: '12px',
            padding: '0 8px'
        }}>
            <div style={{
                maxWidth: '70%',
                padding: '12px 16px',
                borderRadius: isMe 
                    ? 'var(--radius-md) var(--radius-md) 4px var(--radius-md)' 
                    : 'var(--radius-md) var(--radius-md) var(--radius-md) 4px',
                backgroundColor: isMe 
                    ? 'var(--bg-tertiary)' 
                    : 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-sm)',
                border: `1px solid ${isMe ? 'var(--border-hover)' : 'var(--border-color)'}`,
                transition: 'var(--transition)',
                position: 'relative'
            }}>
                {!isMe && (
                    <div style={{ 
                        fontSize: '12px', 
                        marginBottom: '6px', 
                        color: 'var(--text-secondary)',
                        fontWeight: '500',
                        letterSpacing: '0.2px'
                    }}>
                        {sender}
                    </div>
                )}
                <div style={{ 
                    wordBreak: 'break-word',
                    fontSize: '15px',
                    lineHeight: '1.5',
                    color: 'var(--text-primary)'
                }}>
                    {message}
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;
