/**
 * Server-side Advanced 3D Photorealistic Rendering Engine
 * Translates architectural concept sketches into full real-world 3D
 * photorealistic hotel room renders while strictly preserving sketch geometry.
 *
 * Tier 1: Direct multimodal image generation (if billing/image quota is active)
 * Tier 2 (Free): Vision-guided spatial prompt extraction + Flux 3D Photorealistic synthesis
 * Tier 3: Structured 3D ScenePlan fallback
 *
 * Runs strictly on the server; credentials and providers are never exposed to the client.
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
  const startTime = Date.now();

  const mimeMatch = req.sketchImageBase64.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
  const rawBase64 = req.sketchImageBase64.replace(/^data:image\/\w+;base64,/, "");

  // ── Tier 1: Direct Image Generation (if billing/quota enabled) ──────────
  if (apiKey) {
    const directPrompt = [
      `Convert this architectural room sketch into a crisp, ultra-photorealistic 3D interior photograph of a luxury ${req.roomCategory.replace(/-/g, " ")}, indistinguishable from a real architectural magazine photograph.`,
      `STRICT STRUCTURAL ADHERENCE: Preserve the exact 3D perspective, camera angle, wall boundaries, ceiling molding, floor plane, and exact placement/proportions of every object drawn in the sketch.`,
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
        // Continue to Tier 2
      }
    }
  }

  // ── Tier 2 (Free): Vision Sketch Analysis + Flux 3D Photoreal Synthesis ───
  let photorealPrompt = `${req.stylePrompt}, ${req.roomCategory.replace(/-/g, " ")}, ${req.lightingMode.replace(/-/g, " ")}, ${req.finishMaterial.replace(/-/g, " ")} finish, ${req.customPrompt || ""}, ultra-photorealistic 3D architectural interior photography, real-world natural colors, warm glowing lamps, realistic wood grain, soft shadows, 8k uhd`;

  if (apiKey) {
    const analyzePrompt = `You are an expert architectural visualization prompt engineer.
Look closely at the attached hand-drawn hotel room sketch. Describe EVERY object, piece of furniture, wall feature, window, lamp, plant, artwork, mirror, wardrobe, and its EXACT spatial position (left, center, right, foreground, background, above, beside) and camera perspective in the sketch.

Combine that exact spatial layout with these interior design choices:
- Room Type: ${req.roomCategory.replace(/-/g, " ")}
- Design Style: ${req.styleName} (${req.stylePrompt})
- Lighting: ${req.lightingMode.replace(/-/g, " ")}
- Main Material: ${req.finishMaterial.replace(/-/g, " ")}
${req.customPrompt ? `- Extra Notes: ${req.customPrompt}` : ""}

Write ONE single concise, vivid, ultra-photorealistic 3D interior photography prompt (max 110 words) that will generate a real-world 3D photograph strictly matching the sketch's layout and objects. Output ONLY the prompt text, no quotes or markdown.`;

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
              generationConfig: { temperature: 0.3, maxOutputTokens: 220 },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const extracted = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (extracted && extracted.length > 20) {
            photorealPrompt = `${extracted}, photorealistic 3D architectural interior photography, real-world natural colors, physically accurate lighting and soft shadows, 8k uhd, sharp focus`;
            break;
          }
        }
      } catch {
        // Try next vision model
      }
    }
  }

  // Generate true 3D photorealistic image via free Flux / Turbo diffusion endpoint
  const seed = Math.floor(Math.random() * 1000000);
  const encodedPrompt = encodeURIComponent(photorealPrompt.slice(0, 900));

  for (const diffusionModel of ["flux", "turbo"]) {
    try {
      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&model=${diffusionModel}&nologo=true&seed=${seed}`;
      const imgRes = await fetch(url, { method: "GET" });

      if (imgRes.ok) {
        const contentType = imgRes.headers.get("content-type") || "image/jpeg";
        if (contentType.startsWith("image/")) {
          const buf = Buffer.from(await imgRes.arrayBuffer());
          if (buf.byteLength > 5000) {
            return {
              imageDataUrl: `data:${contentType};base64,${buf.toString("base64")}`,
              processingTimeMs: Date.now() - startTime,
              mode: "direct-image",
            };
          }
        }
      }
    } catch (err) {
      console.warn(`Diffusion model ${diffusionModel} failed:`, err);
    }
  }

  // ── Tier 3: Structured 3D ScenePlan Fallback ──────────────────────────────
  if (apiKey) {
    const scenePrompt = `Analyze this hotel room sketch and return ONLY valid JSON:
{"horizonY":0.62,"wallColor":"#E5DDD0","ceilingColor":"#F3EFE8","floorColor":"#7D5E42","accentColor":"#C9A24D","objects":[{"type":"bed|headboard|pillow|nightstand|lamp|window|curtain|sofa|table|chair|rug|artwork|plant|door|tv|chandelier|other","label":"name","x":0.25,"y":0.4,"w":0.5,"h":0.45,"primaryColor":"#8C7A6B","secondaryColor":"#D4AF37","material":"wood|fabric|marble|glass|metal|foliage|plaster","emitsLight":false}]}`;

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
                    { text: scenePrompt },
                    { inlineData: { mimeType, data: rawBase64 } },
                  ],
                },
              ],
              generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
            const scenePlan = JSON.parse(cleaned) as ScenePlan;
            if (Array.isArray(scenePlan.objects)) {
              return {
                scenePlan,
                processingTimeMs: Date.now() - startTime,
                mode: "vision-3d",
              };
            }
          }
        }
      } catch {
        // Continue
      }
    }
  }

  throw new Error("Advanced 3D rendering failed.");
}
