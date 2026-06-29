'use client';

import { useState } from 'react';
import { useChat } from 'ai/react';
import { ChatCircleDots, X, PaperPlaneTilt, Robot } from '@phosphor-icons/react';

const INITIAL_MESSAGE = {
  id: 'init',
  role: 'assistant' as const,
  content:
    "Hi there! I'm the Chop & Drop assistant. I can help you find dishes, filter by dietary needs (vegan, gluten-free, allergen-free), or check your order status. What are you looking for?",
};

export default function AiChat() {
  const [open, setOpen] = useState(false);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    initialMessages: [INITIAL_MESSAGE],
  });

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Open AI chat assistant"
        style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--gradient-cta)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ash-white)',
          boxShadow: '0 6px 24px rgba(196,82,26,0.45)',
          zIndex: 80,
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {open ? <X size={22} weight="bold" /> : <ChatCircleDots size={24} weight="fill" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: '96px',
            right: '28px',
            width: 'min(380px, calc(100vw - 40px))',
            height: 'min(520px, calc(100vh - 140px))',
            background: 'var(--ash-white)',
            borderRadius: '20px',
            boxShadow: '0 12px 60px rgba(26,16,8,0.30)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 80,
            border: '1px solid rgba(196,82,26,0.15)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              background: 'var(--suya-smoke)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'rgba(196,82,26,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Robot size={18} style={{ color: 'var(--plantain-gold)' }} />
            </div>
            <div>
              <p style={{ color: 'var(--ash-white)', fontWeight: 700, fontSize: '14px', lineHeight: 1.2 }}>
                Chop &amp; Drop Assistant
              </p>
              <p style={{ color: 'var(--egusi-cream)', opacity: 0.55, fontSize: '11px' }}>
                Menu help · Dietary filters · Order status
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash-white)', opacity: 0.6 }}
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '82%',
                    padding: '10px 14px',
                    borderRadius:
                      m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background:
                      m.role === 'user' ? 'var(--gradient-cta)' : 'var(--egusi-cream)',
                    color: m.role === 'user' ? 'var(--ash-white)' : 'var(--suya-smoke)',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    border:
                      m.role === 'assistant'
                        ? '1px solid rgba(196,82,26,0.12)'
                        : 'none',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    padding: '10px 16px',
                    borderRadius: '16px 16px 16px 4px',
                    background: 'var(--egusi-cream)',
                    border: '1px solid rgba(196,82,26,0.12)',
                    fontSize: '20px',
                    letterSpacing: '4px',
                    color: 'var(--palm-oil)',
                  }}
                >
                  ···
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            style={{
              padding: '12px 16px',
              borderTop: '1px solid rgba(26,16,8,0.08)',
              display: 'flex',
              gap: '8px',
              background: 'white',
            }}
          >
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask about the menu..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1.5px solid rgba(26,16,8,0.12)',
                background: 'var(--egusi-cream)',
                fontSize: '14px',
                color: 'var(--suya-smoke)',
                outline: 'none',
                transition: 'border 0.2s',
              }}
              onFocus={(e) => (e.target.style.border = '1.5px solid var(--palm-oil)')}
              onBlur={(e) => (e.target.style.border = '1.5px solid rgba(26,16,8,0.12)')}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              aria-label="Send"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background:
                  input.trim() && !isLoading
                    ? 'var(--gradient-cta)'
                    : 'rgba(26,16,8,0.08)',
                border: 'none',
                cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color:
                  input.trim() && !isLoading
                    ? 'var(--ash-white)'
                    : 'rgba(26,16,8,0.3)',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <PaperPlaneTilt size={18} weight="bold" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
