export type RoomStyleId =
  | "luxury-presidential"
  | "modern-minimalist"
  | "boutique-heritage"
  | "tropical-resort"
  | "executive-business"
  | "japanese-zen";

export type RoomCategory =
  | "master-suite"
  | "penthouse"
  | "deluxe-king"
  | "executive-lounge"
  | "bathroom-spa"
  | "lobby-terrace";

export type RenderLevel = "normal" | "advanced";

export type AIModelEngine =
  | "controlnet-scribble"
  | "controlnet-canny"
  | "latent-diffusion-img2img"
  | "pix2pix-gan-hybrid";

export interface StyleConfig {
  id: RoomStyleId;
  name: string;
  badge: string;
  palette: string[];
  description: string;
  basePrompt: string;
  negativePrompt: string;
  sampleRenderUrl: string;
  features: string[];
}

export interface PresetSample {
  id: string;
  title: string;
  category: RoomCategory;
  style: RoomStyleId;
  description: string;
  sketchUrl: string;
  renderedUrl: string;
  tags: string[];
  metrics: {
    inferenceTime: string;
    fidScore: number;
    clipScore: number;
    resolution: string;
  };
}

export interface GenerationParams {
  renderLevel: RenderLevel;
  style: RoomStyleId;
  roomCategory: RoomCategory;
  engine: AIModelEngine;
  guidanceScale: number;
  inferenceSteps: number;
  controlNetConditionScale: number;
  denoisingStrength: number;
  customPrompt: string;
  customNegativePrompt: string;
  lightingMode: "warm-evening" | "natural-daylight" | "golden-hour" | "moody-ambient";
  finishMaterial: "italian-marble" | "white-oak" | "brushed-brass" | "concrete-minimalist" | "matte-black";
}

export interface RenderResult {
  imageUrl: string;
  sketchUrl: string;
  params: GenerationParams;
  processingTimeMs: number;
  engineUsed: string;
  timestamp: string;
  metrics: {
    fidScore: number;
    clipScore: number;
    structuralPreservation: number; // percentage
    lightingCoherence: number;
  };
}
