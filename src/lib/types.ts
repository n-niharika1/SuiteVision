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

export interface SceneObject {
  type:
    | "bed"
    | "headboard"
    | "pillow"
    | "nightstand"
    | "lamp"
    | "window"
    | "curtain"
    | "sofa"
    | "table"
    | "chair"
    | "rug"
    | "artwork"
    | "plant"
    | "door"
    | "tv"
    | "chandelier"
    | "other";
  label: string;
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  w: number; // normalized 0..1
  h: number; // normalized 0..1
  primaryColor: string; // hex e.g. #8B6F47
  secondaryColor: string; // hex e.g. #D4AF37
  material: "wood" | "fabric" | "marble" | "glass" | "metal" | "foliage" | "plaster";
  emitsLight?: boolean;
}

export interface ScenePlan {
  horizonY: number; // 0..1 where wall meets floor
  wallColor: string;
  ceilingColor: string;
  floorColor: string;
  accentColor: string;
  objects: SceneObject[];
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
