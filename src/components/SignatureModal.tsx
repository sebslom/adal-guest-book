import React, { useRef, useState, useEffect } from 'react';
import { X, Check, RotateCcw, PenTool } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
  title?: string;
  initialValue?: string;
  lang?: 'PL' | 'ENG';
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title,
  initialValue,
  lang = 'PL',
}) => {
  const isEng = lang === 'ENG';
  const defaultTitle = isEng ? 'Tablet Signature / Sketch' : 'Podpis odręczny na tablecie';
  const displayTitle = title || defaultTitle;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(2.5);

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set high-DPI canvas
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 2;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';

    // Clear background
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (initialValue && initialValue.startsWith('data:image')) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasContent(true);
      };
      img.src = initialValue;
    } else {
      setHasContent(false);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasContent(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = strokeWidth;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasContent(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-stone-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2">
            <PenTool className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-stone-900">{displayTitle}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="relative border-2 border-dashed border-stone-300 rounded-xl overflow-hidden bg-white shadow-inner touch-none">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-56 cursor-crosshair block"
              style={{ touchAction: 'none' }}
            />
            {!hasContent && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-stone-400 text-sm">
                {isEng ? 'Sign or sketch here with stylus or finger' : 'Podpisz się palcem lub rysikiem tutaj'}
              </div>
            )}
            <div className="absolute bottom-6 left-6 right-6 border-b border-stone-200 pointer-events-none" />
          </div>

          <div className="flex items-center justify-between text-xs text-stone-500">
            <div className="flex items-center gap-2">
              <span>{isEng ? 'Pen width:' : 'Grubość pióra:'}</span>
              <button
                type="button"
                onClick={() => setStrokeWidth(1.8)}
                className={`px-2 py-1 rounded ${strokeWidth === 1.8 ? 'bg-amber-100 text-amber-800 font-semibold' : 'bg-stone-100'}`}
              >
                {isEng ? 'Thin' : 'Cienka'}
              </button>
              <button
                type="button"
                onClick={() => setStrokeWidth(2.8)}
                className={`px-2 py-1 rounded ${strokeWidth === 2.8 ? 'bg-amber-100 text-amber-800 font-semibold' : 'bg-stone-100'}`}
              >
                {isEng ? 'Medium' : 'Średnia'}
              </button>
              <button
                type="button"
                onClick={() => setStrokeWidth(4.2)}
                className={`px-2 py-1 rounded ${strokeWidth === 4.2 ? 'bg-amber-100 text-amber-800 font-semibold' : 'bg-stone-100'}`}
              >
                {isEng ? 'Thick' : 'Gruba'}
              </button>
            </div>

            <button
              type="button"
              onClick={clearCanvas}
              className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900 hover:bg-stone-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {isEng ? 'Clear' : 'Wyczyść'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-stone-50 border-t border-stone-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
          >
            {isEng ? 'Cancel' : 'Anuluj'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasContent}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            {isEng ? 'Save' : 'Zatwierdź podpis'}
          </button>
        </div>
      </div>
    </div>
  );
};
