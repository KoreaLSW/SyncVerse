// syncverse/app/components/ChatInput.tsx
'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
    onSendMessage: (message: string) => void;
}

export function ChatInput({ onSendMessage }: ChatInputProps) {
    const [message, setMessage] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null); // 🚀 input에서 textarea로 변경

    const handleSend = () => {
        if (message.trim()) {
            onSendMessage(message);
            setMessage('');
            textareaRef.current?.blur();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter') {
            if (!e.shiftKey) {
                // 🚀 Shift 없이 Enter만 누르면 전송
                e.preventDefault();
                handleSend();
            }
            // 🚀 Shift + Enter는 기본 동작인 '줄바꿈'이 적용됨
        }
    };

    // 'Enter' 키로 포커스 주기 로직은 동일하게 유지 (textareaRef로 이름만 변경)
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (
                e.key === 'Enter' &&
                document.activeElement !== textareaRef.current
            ) {
                e.preventDefault();
                textareaRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    return (
        <div className='w-full'>
            <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='메시지를 입력하세요... (Shift+Enter 줄바꿈)'
                rows={1}
                className='w-full bg-black/40 backdrop-blur-md text-white border border-white/20 px-4 py-3 rounded-2xl shadow-2xl focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm placeholder:text-white/40 resize-none overflow-hidden'
                style={{ minHeight: '46px' }}
                maxLength={100}
            />
        </div>
    );
}
