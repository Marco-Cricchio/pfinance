import React from 'react';
import { createPortal } from 'react-dom';
import { X, Maximize2 } from 'lucide-react';
import { Button } from './button';
import { useForceResize } from '@/hooks/useForceResize';

interface FullscreenModalProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
}

export function FullscreenModal({ 
  children, 
  title, 
  description, 
  trigger,
  isOpen: controlledIsOpen,
  onClose: controlledOnClose 
}: FullscreenModalProps) {
  const [internalIsOpen, setInternalIsOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const onClose = controlledOnClose !== undefined ? controlledOnClose : () => setInternalIsOpen(false);
  const onOpen = () => controlledIsOpen === undefined ? setInternalIsOpen(true) : undefined;

  // Force resize of charts when modal opens
  useForceResize(isOpen);

  // Ensure we're on the client side
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Handle ESC key to close modal
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const defaultTrigger = (
    <Button
      variant="outline"
      size="sm"
      onClick={onOpen}
      className="ml-2"
      title="Visualizza a schermo intero"
    >
      <Maximize2 className="h-4 w-4" />
    </Button>
  );

  return (
    <>
      {trigger ? (
        <div onClick={onOpen} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        defaultTrigger
      )}

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] bg-background">
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b p-4 bg-background">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold">{title}</h2>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-10 w-10 p-0"
                title="Chiudi"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 bg-background">
              <div className="h-full w-full">
                {children}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}