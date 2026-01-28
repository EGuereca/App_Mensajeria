import React from 'react';

const MessageBubble = ({ message, sender, isMe }) => {
    return (
        <div style={{
            display: 'flex',
            justifyContent: isMe ? 'flex-end' : 'flex-start',
            margin: '5px 0'
        }}>
            <div style={{
                maxWidth: '70%',
                padding: '10px 15px',
                borderRadius: '15px',
                backgroundColor: isMe ? '#007bff' : '#f1f0f0',
                color: isMe ? 'white' : 'black',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
                {!isMe && <div style={{ fontSize: '0.8em', marginBottom: '4px', opacity: 0.8 }}>{sender}</div>}
                <div style={{ wordBreak: 'break-word' }}>{message}</div>
            </div>
        </div>
    );
};

export default MessageBubble;
