/**
 * Server-side Advanced 3D Photorealistic Rendering Engine
 * Translates architectural concept sketches into full real-world 3D
 * photorealistic hotel room renders while strictly preserving sketch geometry.
 *
 * Tier 1: Direct multimodal image generation (if image-gen quota is active)
 * Tier 2: Vision-guided 3D architectural scene analysis + photorealistic 3D synthesis
 *
 * Runs strictly on the server; credentials are never exposed to the client.
 */

import { ScenePlan } from "./types";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const IMAGE_MODELS = [
  "gemini-3-pro-image",
  "gemini-3.1-flash-image",
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-lite-image",
];

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
  scenePlan?: ScenePlan;
  processingTimeMs: number;
  mode: "direct-image" | "vision-3d";
}

export async function generateAdvanced3DRender(
  req: AdvancedRenderRequest
): Promise<AdvancedRenderResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Server rendering key is not configured.");
  }

  const startTime = Date.now();
  const mimeMatch = req.sketchImageBase64.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
  const rawBase64 = req.sketchImageBase64.replace(/^data:image\/\w+;base64,/, "");

  // ── Tier 1: Try Direct Image Generation ──────────────────────────────────
  const directPrompt = [
    `Convert this architectural room sketch into a crisp, ultra-photorealistic 3D interior photograph of a luxury ${req.roomCategory.replace(/-/g, " ")}, indistinguishable from a real architectural magazine photograph.`,
    `STRICT STRUCTURAL ADHERENCE: Preserve the exact 3D perspective, camera angle, wall boundaries, ceiling molding, floor plane, and exact placement/proportions of every object drawn in the sketch (bed, headboard, nightstands, lamps, windows, curtains, plants, wardrobes, artwork, rugs). Do NOT move, remove, or invent major structural elements.`,
    `REAL-WORLD 3D MATERIALS & LIGHTING:`,
    `- Natural wood grain on furniture/wardrobes, tufted fabric/velvet upholstery, crisp layered bedding and pillows, textured plaster/marble walls, polished stone or hardwood flooring with subtle reflections.`,
    `- Warm glowing table lamps casting realistic soft radial light onto adjacent walls, soft contact shadows under furniture, natural ambient occlusion in corners, and crisp 3D depth.`,
    `- Aesthetic: ${req.styleName} (${req.stylePrompt})`,
    `- Lighting: ${req.lightingMode.replace(/-/g, " ")}`,
    `- Signature Material: ${req.finishMaterial.replace(/-/g, " ")}`,
    req.customPrompt ? `- Designer Notes: ${req.customPrompt}` : "",
    `Output ONLY the final photorealistic 3D interior photograph with no sketch lines, no borders, and no text.`,
  ]
    .filter(Boolean)
    .join("\n");

  for (const model of IMAGE_MODELS) {
    try {
      const response = await fetch(
        `${BASE_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: directPrompt },
                  { inlineData: { mimeType, data: rawBase64 } },
                ],
              },
            ],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const parts = data?.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find(
          (p: { inlineData?: { mimeType?: string; data?: string } }) =>
            p.inlineData?.data
        );
        if (imagePart?.inlineData?.data) {
          const outMime = imagePart.inlineData.mimeType || "image/png";
          return {
            imageDataUrl: `data:${outMime};base64,${imagePart.inlineData.data}`,
            processingTimeMs: Date.now() - startTime,
            mode: "direct-image",
          };
        }
      }
    } catch {
      // Fall through to next model or Tier 2
    }
  }

  // ── Tier 2: Vision-Guided 3D Architectural Scene Synthesis ───────────────
  const visionPrompt = `You are an expert hospitality interior architect analyzing a hand-drawn hotel room sketch.
Carefully inspect the attached sketch image and map EVERY drawn object and architectural feature to its EXACT normalized coordinates (x, y, w, h from 0.0 to 1.0, where (0,0) is top-left and (1,1) is bottom-right).

Target design specification:
- Room Category: ${req.roomCategory.replace(/-/g, " ")}
- Design Aesthetic: ${req.styleName}
- Lighting Atmosphere: ${req.lightingMode.replace(/-/g, " ")}
- Primary Finish Material: ${req.finishMaterial.replace(/-/g, " ")}
${req.customPrompt ? `- Custom Notes: ${req.customPrompt}` : ""}

Return ONLY valid JSON matching this exact schema:
{
  "horizonY": 0.62,
  "wallColor": "#E5DDD0",
  "ceilingColor": "#F3EFE8",
  "floorColor": "#7D5E42",
  "accentColor": "#C9A24D",
  "objects": [
    {
      "type": "bed|headboard|pillow|nightstand|lamp|window|curtain|sofa|table|chair|rug|artwork|plant|door|tv|chandelier|other",
      "label": "short name",
      "x": 0.25,
      "y": 0.40,
      "w": 0.50,
      "h": 0.45,
      "primaryColor": "#hex",
      "secondaryColor": "#hex",
      "material": "wood|fabric|marble|glass|metal|foliage|plaster",
      "emitsLight": false
    }
  ]
}
Choose rich, realistic, real-world interior design hex colors appropriate for "${req.styleName}" and "${req.finishMaterial.replace(/-/g, " ")}". Be accurate to what is actually drawn in the sketch.`;

  let lastError: Error | null = null;

  for (const model of VISION_MODELS) {
    try {
      const response = await fetch(
        `${BASE_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: visionPrompt },
                  { inlineData: { mimeType, data: rawBase64 } },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Vision status ${response.status}: ${errText.slice(0, 180)}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("Empty scene analysis response.");
      }

      const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
      const scenePlan = JSON.parse(cleaned) as ScenePlan;
      if (!Array.isArray(scenePlan.objects)) {
        throw new Error("Invalid scene plan format.");
      }

      return {
        scenePlan,
        processingTimeMs: Date.now() - startTime,
        mode: "vision-3d",
      };
    } catch (err) {
      lastError = err as Error;
      console.warn(`Vision model ${model} failed:`, err);
    }
  }

  throw lastError || new Error("Advanced 3D rendering failed.");
}
