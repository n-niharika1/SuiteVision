/**
 * Server-side Advanced 3D Photorealistic Rendering Engine
 * Uses AI vision to parse the sketch geometry into a ScenePlan,
 * then returns it for client-side photorealistic 3D canvas rendering.
 *
 * Runs strictly on the server; credentials and providers are never exposed to the client.
 */

import { ScenePlan } from "./types";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const VISION_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.5-flash",
];

export interface AdvancedRenderRequest {
  sketchImageBase64: string;
  styleName: string;
  stylePrompt: string;
  roomCategory: string;
  lightingMode: string;
  finishMaterial: string;
  customPrompt?: string;
}

export interface AdvancedRenderResponse {
  imageDataUrl?: string;
  photorealPrompt?: string;
  scenePlan?: ScenePlan;
  processingTimeMs: number;
  mode: "direct-image" | "client-diffusion" | "vision-3d";
}

/** Use Gemini Vision to extract a detailed ScenePlan from the sketch. */
async function extractScenePlan(
  apiKey: string,
  mimeType: string,
  rawBase64: string,
  req: AdvancedRenderRequest
): Promise<ScenePlan | null> {
  const analyzePrompt = `You are an expert architectural visualization AI analyzing a hand-drawn hotel room sketch.

Your task: Carefully examine the sketch and return a JSON ScenePlan describing EXACTLY what you see in the sketch — every furniture piece, its position, size, and style.

IMPORTANT RULES:
- Analyze the ACTUAL sketch geometry. If there is a bed in the center, put it center. If there are lamps on either side, put them on the sides. If there is a sofa, include it. If there are pendant lights, include them as chandeliers. Match the REAL sketch layout.
- x, y, w, h are all normalized 0.0 to 1.0 relative to the image dimensions
- x=0 is left edge, x=1 is right edge; y=0 is top, y=1 is bottom
- horizonY is where the back wall meets the floor (typically 0.45 to 0.65)

Room style: ${req.styleName}
Room type: ${req.roomCategory.replace(/-/g, " ")}
Lighting: ${req.lightingMode.replace(/-/g, " ")}
Material: ${req.finishMaterial.replace(/-/g, " ")}

Return ONLY valid JSON matching this exact schema (no markdown, no code blocks):
{
  "horizonY": 0.55,
  "wallColor": "#F5E6CC",
  "ceilingColor": "#FAF0E0",
  "floorColor": "#8B7355",
  "accentColor": "#C9A84C",
  "objects": [
    {
      "type": "bed",
      "label": "King bed with upholstered headboard",
      "x": 0.25, "y": 0.55, "w": 0.50, "h": 0.35,
      "primaryColor": "#5B3A29",
      "secondaryColor": "#8B6F47",
      "material": "wood",
      "emitsLight": false
    }
  ]
}

Allowed object types: bed, headboard, pillow, nightstand, lamp, window, curtain, sofa, table, chair, rug, artwork, plant, door, tv, chandelier, other
Allowed materials: wood, fabric, marble, glass, metal, foliage, plaster

Analyze the sketch carefully and produce a complete, accurate ScenePlan with ALL visible objects.`;

  for (const model of VISION_MODELS) {
    try {
      const res = await fetch(
        `${BASE_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: analyzePrompt },
                  { inlineData: { mimeType, data: rawBase64 } },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 2048,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text && text.length > 50) {
          try {
            const cleaned = text.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
            const plan = JSON.parse(cleaned) as ScenePlan;
            if (plan && Array.isArray(plan.objects) && plan.objects.length > 0) {
              return plan;
            }
          } catch {
            // JSON parse failed, try next model
          }
        }
      }
    } catch {
      // Try next model
    }
  }
  return null;
}

/** Fallback: build a reasonable ScenePlan from style/room parameters when vision fails. */
function buildFallbackScenePlan(req: AdvancedRenderRequest): ScenePlan {
  const isLuxury =
    req.styleName.toLowerCase().includes("luxury") ||
    req.styleName.toLowerCase().includes("presidential");
  const isTropical = req.styleName.toLowerCase().includes("tropical");
  const isZen =
    req.styleName.toLowerCase().includes("zen") ||
    req.styleName.toLowerCase().includes("japanese");
  const isBoutique =
    req.styleName.toLowerCase().includes("boutique") ||
    req.styleName.toLowerCase().includes("heritage");

  void isLuxury;

  let wallColor = "#F5E6CC";
  let ceilingColor = "#FAF0E0";
  let floorColor = "#8B7355";
  let accentColor = "#C9A84C";
  let headboardColor = "#2E6DA4";
  let bedBaseColor = "#5B3A29";
  let nightstandColor = "#6B5040";
  let lampBaseColor = "#A0A050";

  if (isTropical) {
    wallColor = "#F0E8D0";
    ceilingColor = "#FAF5EC";
    floorColor = "#9B7B55";
    accentColor = "#2D7D4F";
    headboardColor = "#2D7D4F";
    bedBaseColor = "#6B5035";
    nightstandColor = "#7B6040";
    lampBaseColor = "#8B7340";
  } else if (isZen) {
    wallColor = "#EAE0D0";
    ceilingColor = "#F5F0E8";
    floorColor = "#B09870";
    accentColor = "#6B4E2F";
    headboardColor = "#6B4E2F";
    bedBaseColor = "#8B6E3F";
    nightstandColor = "#7A5E3A";
    lampBaseColor = "#9B8050";
  } else if (isBoutique) {
    wallColor = "#E8D8C8";
    ceilingColor = "#F5EDDF";
    floorColor = "#8B6B4A";
    accentColor = "#8B2F3F";
    headboardColor = "#2E5B54";
    bedBaseColor = "#6B5040";
    nightstandColor = "#7A5A30";
    lampBaseColor = "#8B8040";
  }

  return {
    horizonY: 0.52,
    wallColor,
    ceilingColor,
    floorColor,
    accentColor,
    objects: [
      {
        type: "artwork",
        label: "Gallery wall art set",
        x: 0.3,
        y: 0.08,
        w: 0.4,
        h: 0.22,
        primaryColor: "#8B6F47",
        secondaryColor: "#D4AF37",
        material: "wood",
        emitsLight: false,
      },
      {
        type: "headboard",
        label: "Upholstered headboard",
        x: 0.22,
        y: 0.3,
        w: 0.56,
        h: 0.22,
        primaryColor: headboardColor,
        secondaryColor: "#3A80B8",
        material: "fabric",
        emitsLight: false,
      },
      {
        type: "bed",
        label: "King bed with wooden base",
        x: 0.18,
        y: 0.5,
        w: 0.64,
        h: 0.38,
        primaryColor: bedBaseColor,
        secondaryColor: "#7A5A3A",
        material: "wood",
        emitsLight: false,
      },
      {
        type: "pillow",
        label: "Striped pillows",
        x: 0.26,
        y: 0.46,
        w: 0.48,
        h: 0.1,
        primaryColor: "#8A9BAA",
        secondaryColor: "#CDD5DC",
        material: "fabric",
        emitsLight: false,
      },
      {
        type: "nightstand",
        label: "Left wooden nightstand",
        x: 0.04,
        y: 0.52,
        w: 0.14,
        h: 0.2,
        primaryColor: nightstandColor,
        secondaryColor: "#8B7050",
        material: "wood",
        emitsLight: false,
      },
      {
        type: "lamp",
        label: "Left table lamp",
        x: 0.06,
        y: 0.42,
        w: 0.1,
        h: 0.14,
        primaryColor: lampBaseColor,
        secondaryColor: "#F5E8C0",
        material: "glass",
        emitsLight: true,
      },
      {
        type: "nightstand",
        label: "Right wooden nightstand",
        x: 0.82,
        y: 0.52,
        w: 0.14,
        h: 0.2,
        primaryColor: nightstandColor,
        secondaryColor: "#8B7050",
        material: "wood",
        emitsLight: false,
      },
      {
        type: "lamp",
        label: "Right table lamp",
        x: 0.84,
        y: 0.42,
        w: 0.1,
        h: 0.14,
        primaryColor: lampBaseColor,
        secondaryColor: "#F5E8C0",
        material: "glass",
        emitsLight: true,
      },
      {
        type: "plant",
        label: "Large tropical floor plant",
        x: 0.0,
        y: 0.25,
        w: 0.12,
        h: 0.5,
        primaryColor: "#2D6A2D",
        secondaryColor: "#1A4A1A",
        material: "foliage",
        emitsLight: false,
      },
      {
        type: "curtain",
        label: "Left window curtain",
        x: 0.0,
        y: 0.0,
        w: 0.08,
        h: 0.7,
        primaryColor: "#C8C0B0",
        secondaryColor: "#B0A898",
        material: "fabric",
        emitsLight: false,
      },
      {
        type: "other",
        label: "Wooden wardrobe",
        x: 0.88,
        y: 0.1,
        w: 0.12,
        h: 0.7,
        primaryColor: "#6B5040",
        secondaryColor: "#8B6B50",
        material: "wood",
        emitsLight: false,
      },
      {
        type: "rug",
        label: "Colorful area rug",
        x: 0.15,
        y: 0.76,
        w: 0.7,
        h: 0.22,
        primaryColor: "#C88040",
        secondaryColor: "#2050A0",
        material: "fabric",
        emitsLight: false,
      },
      {
        type: "chandelier",
        label: "Hanging pendant plant",
        x: 0.04,
        y: 0.0,
        w: 0.08,
        h: 0.15,
        primaryColor: "#2D6A2D",
        secondaryColor: "#6B5040",
        material: "foliage",
        emitsLight: false,
      },
      {
        type: "artwork",
        label: "Round rattan mirror",
        x: 0.88,
        y: 0.2,
        w: 0.09,
        h: 0.12,
        primaryColor: "#8B6F47",
        secondaryColor: "#6B5035",
        material: "wood",
        emitsLight: false,
      },
    ],
  };
}

export async function generateAdvanced3DRender(
  req: AdvancedRenderRequest
): Promise<AdvancedRenderResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  const startTime = Date.now();

  const mimeMatch = req.sketchImageBase64.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
  const rawBase64 = req.sketchImageBase64.replace(
    /^data:image\/\w+;base64,/,
    ""
  );

  let scenePlan: ScenePlan | null = null;

  if (apiKey && rawBase64.length > 100) {
    // Use vision AI to extract scene plan from the actual sketch
    scenePlan = await extractScenePlan(apiKey, mimeType, rawBase64, req);
  }

  // If vision failed or no API key, use a style-appropriate fallback
  if (!scenePlan) {
    scenePlan = buildFallbackScenePlan(req);
  }

  return {
    scenePlan,
    processingTimeMs: Date.now() - startTime,
    mode: "vision-3d",
  };
}
