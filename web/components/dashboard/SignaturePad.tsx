"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
}

function getClientXY(e: MouseEvent | Touch): { clientX: number; clientY: number } {
  if ("clientX" in e) return { clientX: e.clientX, clientY: e.clientY };
  return { clientX: (e as Touch).clientX, clientY: (e as Touch).clientY };
}

export default function SignaturePad({
  onSave,
  onClear,
  width = 520,
  height = 200,
  strokeColor = "#1A3D9E",
  strokeWidth = 2.5,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing   = useRef(false);
  const lastPos   = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  // ── Canvas setup ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // ── Position helper ──────────────────────────────────────────────────────
  const getPos = (e: MouseEvent | Touch): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const { clientX, clientY } = getClientXY(e);
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top)  * scaleY,
    };
  };

  // ── Draw helpers ─────────────────────────────────────────────────────────
  const startDraw = useCallback((pos: { x: number; y: number }) => {
    drawing.current = true;
    lastPos.current  = pos;
    setIsEmpty(false);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth   = strokeWidth;
      ctx.lineCap     = "round";
      ctx.lineJoin    = "round";
    }
  }, [strokeColor, strokeWidth]);

  const drawTo = useCallback((pos: { x: number; y: number }) => {
    if (!drawing.current || !lastPos.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  }, []);

  const stopDraw = useCallback(() => {
    drawing.current = false;
    lastPos.current  = null;
  }, []);

  // ── Mouse events ─────────────────────────────────────────────────────────
  const onMouseDown  = (e: React.MouseEvent<HTMLCanvasElement>) => startDraw(getPos(e.nativeEvent));
  const onMouseMove  = (e: React.MouseEvent<HTMLCanvasElement>) => drawTo(getPos(e.nativeEvent));
  const onMouseUp    = () => stopDraw();
  const onMouseLeave = () => stopDraw();

  // ── Touch events ─────────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    startDraw(getPos(e.touches[0] as unknown as Touch));
  };
  const onTouchMove  = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawTo(getPos(e.touches[0] as unknown as Touch));
  };
  const onTouchEnd   = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    stopDraw();
  };

  // ── Clear ─────────────────────────────────────────────────────────────────
  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onClear?.();
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    onSave(canvas.toDataURL("image/png"));
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Canvas */}
      <div
        className="relative rounded-xl border-2 border-dashed border-blue-300 bg-white overflow-hidden"
        style={{ cursor: "crosshair" }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ width: "100%", height: "auto", display: "block", touchAction: "none" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />

        {/* Placeholder */}
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <span className="text-sm text-gray-400 font-medium">
              Signez ici avec la souris ou votre doigt
            </span>
          </div>
        )}

        {/* Baseline */}
        <div className="absolute bottom-8 left-6 right-6 border-b border-gray-300 pointer-events-none" />
        <p className="absolute bottom-2 left-6 text-[10px] text-gray-400 pointer-events-none select-none">
          Signature
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Effacer
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isEmpty}
          className="px-5 py-2 text-sm rounded-lg bg-[#1A3D9E] text-white font-semibold hover:bg-[#153384] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ✓ Confirmer la signature
        </button>
      </div>
    </div>
  );
}
