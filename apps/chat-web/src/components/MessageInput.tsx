import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Paperclip, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

interface MessageInputProps {
  onSend: (text: string, images: string[]) => void;
  disabled: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSend, disabled }) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  const handleSend = () => {
    if ((text.trim() || images.length > 0) && !disabled) {
      onSend(text, images);
      setText('');
      setImages([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setImages(prev => [...prev, reader.result as string]);
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  return (
    <div className="p-4 border-t border-border bg-background/80 backdrop-blur-sm">
      <div className="max-w-3xl mx-auto space-y-4">
        {images.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {images.map((img, i) => (
              <div key={i} className="relative group">
                <img src={img} alt="preview" className="w-20 h-20 object-cover rounded-lg border border-border" />
                <button
                  onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative flex items-end gap-2 bg-secondary/50 border border-border rounded-2xl p-2 focus-within:ring-2 ring-primary/20 transition-all">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
            accept="image/*"
            multiple
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            title={t('upload_image')}
          >
            <ImageIcon size={20} />
          </button>
          
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={t('input_placeholder')}
            rows={1}
            className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-2 text-sm max-h-[200px]"
          />

          <button
            onClick={handleSend}
            disabled={(!text.trim() && images.length === 0) || disabled}
            className={cn(
              "p-2 rounded-xl transition-all",
              (text.trim() || images.length > 0) && !disabled
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground cursor-not-allowed"
            )}
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-[10px] text-center text-muted-foreground">
          Gemma 4 E4B may provide inaccurate information. Check important info.
        </p>
      </div>
    </div>
  );
};
