import { useRef, useState, useEffect, useCallback } from 'react';

interface CropOverlayProps {
  imageDataUrl: string;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function CropOverlay({ imageDataUrl, onCrop, onCancel }: CropOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [selection, setSelection] = useState<Rect | null>(null);
  const [imgRect, setImgRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const updateImgRect = () => {
      if (imgRef.current) {
        setImgRect(imgRef.current.getBoundingClientRect());
      }
    };
    const timer = setTimeout(updateImgRect, 100);
    window.addEventListener('resize', updateImgRect);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateImgRect);
    };
  }, [imageDataUrl]);

  const getRelativePos = useCallback((clientX: number, clientY: number) => {
    if (!imgRef.current) return { x: 0, y: 0 };
    const rect = imgRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(clientY - rect.top, rect.height)),
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const pos = getRelativePos(e.clientX, e.clientY);
    setStartPos(pos);
    setSelection(null);
    setIsDragging(true);
    if (imgRef.current) {
      setImgRect(imgRef.current.getBoundingClientRect());
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const pos = getRelativePos(e.clientX, e.clientY);
    setSelection({
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      width: Math.abs(pos.x - startPos.x),
      height: Math.abs(pos.y - startPos.y),
    });
  }, [isDragging, startPos, getRelativePos]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleCrop = () => {
    if (!selection || !imgRef.current) return;
    if (selection.width < 4 || selection.height < 4) return;

    const img = new Image();
    img.onload = () => {
      const displayRect = imgRef.current!.getBoundingClientRect();
      const scaleX = img.naturalWidth / displayRect.width;
      const scaleY = img.naturalHeight / displayRect.height;

      const cropX = selection.x * scaleX;
      const cropY = selection.y * scaleY;
      const cropW = selection.width * scaleX;
      const cropH = selection.height * scaleY;

      const canvas = document.createElement('canvas');
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      canvas.toBlob((blob) => {
        if (blob) onCrop(blob);
      }, 'image/png');
    };
    img.src = imageDataUrl;
  };

  const hasValidSelection = selection && selection.width > 4 && selection.height > 4;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex flex-col bg-black/90"
      style={{ cursor: isDragging ? 'crosshair' : 'default' }}
    >
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <i className="ri-screenshot-2-line text-white text-lg"></i>
          <span className="text-white text-sm font-medium">캡처할 영역을 드래그하여 선택하세요</span>
          {hasValidSelection && (
            <span className="text-gray-400 text-xs">
              {Math.round(selection!.width)} × {Math.round(selection!.height)} px
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-all cursor-pointer whitespace-nowrap"
          >
            취소
          </button>
          <button
            onClick={handleCrop}
            disabled={!hasValidSelection}
            className="px-4 py-1.5 text-sm font-medium bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-all cursor-pointer whitespace-nowrap"
          >
            <i className="ri-check-line mr-1"></i>
            캡처
          </button>
        </div>
      </div>

      {/* Image area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <div className="relative inline-block select-none">
          <img
            ref={imgRef}
            src={imageDataUrl}
            alt="screenshot"
            draggable={false}
            onMouseDown={handleMouseDown}
            className="block max-w-full max-h-[calc(100vh-120px)] object-contain"
            style={{ cursor: 'crosshair', userSelect: 'none' }}
            onLoad={() => {
              if (imgRef.current) {
                setImgRect(imgRef.current.getBoundingClientRect());
              }
            }}
          />

          {/* Dark overlay with hole */}
          {selection && selection.width > 0 && selection.height > 0 && (
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{ width: '100%', height: '100%' }}
            >
              <defs>
                <mask id="crop-mask">
                  <rect width="100%" height="100%" fill="white" />
                  <rect
                    x={selection.x}
                    y={selection.y}
                    width={selection.width}
                    height={selection.height}
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(0,0,0,0.55)"
                mask="url(#crop-mask)"
              />
              {/* Selection border */}
              <rect
                x={selection.x}
                y={selection.y}
                width={selection.width}
                height={selection.height}
                fill="none"
                stroke="#14B8A6"
                strokeWidth="1.5"
                strokeDasharray="6 3"
              />
              {/* Corner handles */}
              {[
                [selection.x, selection.y],
                [selection.x + selection.width, selection.y],
                [selection.x, selection.y + selection.height],
                [selection.x + selection.width, selection.y + selection.height],
              ].map(([cx, cy], i) => (
                <rect
                  key={i}
                  x={cx - 4}
                  y={cy - 4}
                  width={8}
                  height={8}
                  fill="#14B8A6"
                  rx={1}
                />
              ))}
              {/* Size label */}
              {selection.width > 60 && selection.height > 30 && (
                <text
                  x={selection.x + selection.width / 2}
                  y={selection.y + selection.height / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="12"
                  fontFamily="monospace"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {Math.round(selection.width)} × {Math.round(selection.height)}
                </text>
              )}
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
