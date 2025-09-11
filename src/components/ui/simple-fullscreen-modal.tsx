'use client';

import React, { useState, useEffect } from 'react';
import { X, Maximize2 } from 'lucide-react';

interface SimpleFullscreenModalProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export function SimpleFullscreenModal({ children, title, description }: SimpleFullscreenModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showContent, setShowContent] = useState(false);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Force resize when modal opens with multiple attempts
  useEffect(() => {
    if (isOpen) {
      setShowContent(false);
      const forceResize = () => {
        window.dispatchEvent(new Event('resize'));
        window.requestAnimationFrame(() => {
          window.dispatchEvent(new Event('resize'));
        });
      };
      
      // Multiple resize attempts with increasing delays
      const timers = [
        setTimeout(() => {
          setShowContent(true);
          forceResize();
        }, 50),
        setTimeout(forceResize, 150),
        setTimeout(forceResize, 300),
        setTimeout(forceResize, 500),
        setTimeout(forceResize, 1000),
      ];
      
      return () => timers.forEach(clearTimeout);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
        title="Visualizza a schermo intero"
      >
        <Maximize2 className="h-4 w-4" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            backgroundColor: 'white',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: 'white',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', margin: 0 }}>
                {title}
              </h2>
              {description && (
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.375rem',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
              }}
              title="Chiudi"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div
            style={{
              flex: 1,
              padding: '1.5rem',
              backgroundColor: 'white',
              overflow: 'auto',
              position: 'relative',
            }}
          >
            {showContent ? (
              <div style={{ height: '100%', width: '100%' }}>
                {children}
              </div>
            ) : (
              <div
                style={{
                  height: '100%',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.125rem',
                  color: '#6b7280',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: '2rem',
                      height: '2rem',
                      border: '2px solid #e5e7eb',
                      borderTop: '2px solid #3b82f6',
                      borderRadius: '50%',
                      margin: '0 auto 1rem auto',
                    }}
                  ></div>
                  Caricamento grafico...
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}