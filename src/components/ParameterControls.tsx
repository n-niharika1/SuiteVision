"use client";

import { useState } from "react";
import { GenerationParams, RoomCategory, AIModelEngine, RenderLevel } from "@/lib/types";
import { Sliders, Cpu, Sun, Layers, ChevronDown, ChevronUp, Terminal, Zap, Sparkles } from "lucide-react";

interface ParameterControlsProps {
  params: GenerationParams;
  onChange: (updated: Partial<GenerationParams>) => void;
  disabled?: boolean;
}

const ROOM_CATEGORIES: { id: RoomCategory; name: string }[] = [
  { id: "master-suite", name: "Master Suite" },
  { id: "penthouse", name: "Penthouse Villa" },
  { id: "deluxe-king", name: "Deluxe King Room" },
  { id: "bathroom-spa", name: "En-suite Spa Bath" },
  { id: "executive-lounge", name: "Executive Lounge" },
  { id: "lobby-terrace", name: "Lobby & Bar" },
];

const AI_ENGINES: { id: AIModelEngine; name: string; tag: string }[] = [
  { id: "controlnet-scribble", name: "ControlNet-v1.1 Scribble", tag: "Diffusion Model (Best for Freehand)" },
  { id: "controlnet-canny", name: "ControlNet Canny Edge", tag: "Diffusion Model (Best for CAD/Ruler)" },
  { id: "latent-diffusion-img2img", name: "Stable Diffusion v1.5 img2img", tag: "High Creativity" },
  { id: "pix2pix-gan-hybrid", name: "Pix2Pix Conditional GAN", tag: "Adversarial Translation" },
];

const LIGHTING_MODES = [
  { id: "warm-evening", name: "Warm Evening LED (2700K)" },
  { id: "natural-daylight", name: "Diffuse Morning Daylight" },
  { id: "golden-hour", name: "Sunset Golden Hour" },
  { id: "moody-ambient", name: "Dramatic Architectural Cove" },
] as const;

const FINISH_MATERIALS = [
  { id: "italian-marble", name: "Bookmatched Calacatta Gold Marble" },
  { id: "white-oak", name: "Japanese White Oak Acoustic Slats" },
  { id: "brushed-brass", name: "Champagne Brushed Brass Trims" },
  { id: "concrete-minimalist", name: "Architectural Microcement" },
  { id: "matte-black", name: "Anodized Matte Black Steel" },
] as const;

export function ParameterControls({ params, onChange, disabled }: ParameterControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-4 rounded-2xl bg-slate-900/40 border border-slate-800 p-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Deep Learning & Material Controls
          </h3>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          {params.renderLevel === "advanced" ? "3D Photoreal Engine" : "Standard Pipeline"}
        </span>
      </div>

      {/* Render Level Selector: Normal vs Advanced */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
          Rendering Quality Level
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange({ renderLevel: "normal" as RenderLevel })}
            className={`p-3 rounded-xl border text-left transition-all ${
              params.renderLevel === "normal"
                ? "border-amber-500 bg-amber-500/15 ring-1 ring-amber-500/40"
                : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-blue-400" />
                Normal
              </span>
              <span className="text-[10px] font-mono text-slate-400">Instant</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Fast client-side neural stylization preserving sketch contours.
            </p>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange({ renderLevel: "advanced" as RenderLevel })}
            className={`p-3 rounded-xl border text-left transition-all ${
              params.renderLevel === "advanced"
                ? "border-amber-500 bg-amber-500/15 ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/10"
                : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Advanced
              </span>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                3D Realism
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Full real-world 3D objects, natural colors &amp; volumetric lighting.
            </p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Room Category */}
        <div>
          <label className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Room Category</span>
          </label>
          <select
            disabled={disabled}
            value={params.roomCategory}
            onChange={(e) => onChange({ roomCategory: e.target.value as RoomCategory })}
            className="w-full text-xs font-medium bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
          >
            {ROOM_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* AI Engine */}
        <div>
          <label className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Architecture Engine</span>
          </label>
          <select
            disabled={disabled}
            value={params.engine}
            onChange={(e) => onChange({ engine: e.target.value as AIModelEngine })}
            className="w-full text-xs font-medium bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 focus:outline-none focus:border-amber-500"
          >
            {AI_ENGINES.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} — {e.tag}
              </option>
            ))}
          </select>
        </div>

        {/* Lighting Mode */}
        <div>
          <label className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Photometric Illumination</span>
          </label>
          <select
            disabled={disabled}
            value={params.lightingMode}
            onChange={(e) => onChange({ lightingMode: e.target.value as any })}
            className="w-full text-xs font-medium bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
          >
            {LIGHTING_MODES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Finish Material */}
        <div>
          <label className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Signature Finish Material</span>
          </label>
          <select
            disabled={disabled}
            value={params.finishMaterial}
            onChange={(e) => onChange({ finishMaterial: e.target.value as any })}
            className="w-full text-xs font-medium bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
          >
            {FINISH_MATERIALS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Advanced Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-amber-400 pt-2 border-t border-slate-800 transition-colors"
      >
        <span className="flex items-center gap-1 font-mono">
          <Terminal className="w-3.5 h-3.5" />
          <span>Advanced Hyperparameters (Diffusion Steps, CFG, Guidance)</span>
        </span>
        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Advanced Slider Panel */}
      {showAdvanced && (
        <div className="space-y-3.5 pt-2 text-xs">
          {/* CFG Guidance Scale */}
          <div>
            <div className="flex justify-between text-slate-400 mb-1 font-mono">
              <span>Classifier-Free Guidance (CFG Scale):</span>
              <span className="text-amber-400 font-bold">{params.guidanceScale}</span>
            </div>
            <input
              type="range"
              min="3"
              max="15"
              step="0.5"
              disabled={disabled}
              value={params.guidanceScale}
              onChange={(e) => onChange({ guidanceScale: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 mt-0.5">Higher values strictly enforce prompt adherence.</p>
          </div>

          {/* Inference Steps */}
          <div>
            <div className="flex justify-between text-slate-400 mb-1 font-mono">
              <span>DDIM Denoising Steps:</span>
              <span className="text-amber-400 font-bold">{params.inferenceSteps}</span>
            </div>
            <input
              type="range"
              min="15"
              max="50"
              step="5"
              disabled={disabled}
              value={params.inferenceSteps}
              onChange={(e) => onChange({ inferenceSteps: parseInt(e.target.value) })}
              className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 mt-0.5">25-30 steps optimal for high-frequency textures.</p>
          </div>

          {/* ControlNet Conditioning Scale */}
          <div>
            <div className="flex justify-between text-slate-400 mb-1 font-mono">
              <span>ControlNet Edge Weight:</span>
              <span className="text-amber-400 font-bold">{(params.controlNetConditionScale * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="1.0"
              step="0.05"
              disabled={disabled}
              value={params.controlNetConditionScale}
              onChange={(e) => onChange({ controlNetConditionScale: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 mt-0.5">Controls strict structural retention of original sketch geometry.</p>
          </div>

          {/* Custom Prompt Override */}
          <div>
            <label className="text-slate-400 block mb-1 font-mono">Custom Prompt Augmentation:</label>
            <textarea
              rows={2}
              disabled={disabled}
              value={params.customPrompt}
              onChange={(e) => onChange({ customPrompt: e.target.value })}
              placeholder="e.g., Add floor-to-ceiling silk drapes, crystal chandelier, warm fireplace..."
              className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 resize-none font-sans"
            />
          </div>
        </div>
      )}
    </div>
  );
}
