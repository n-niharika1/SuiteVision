/**
 * Server-side Advanced 3D Photorealistic Rendering Engine
 * Translates architectural concept sketches into full real-world 3D
 * photorealistic hotel room renders while strictly preserving sketch geometry.
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

async function tryDirectImageGen(
  apiKey: string,
  mimeType: string,
  rawBase64: string,
  req: AdvancedRenderRequest
): Promise<string | null> {
  const directPrompt = [
    `Convert this architectural room sketch into a crisp, ultra-photorealistic 3D interior photograph of a luxury ${req.roomCategory.replace(/-/g, " ")}.`,
    `Preserve the exact 3D perspective, camera angle, wall boundaries, and exact placement of every object drawn in the sketch.`,
    `Style: ${req.styleName}. Lighting: ${req.lightingMode.replace(/-/g, " ")}. Material: ${req.finishMaterial.replace(/-/g, " ")}.`,
  ].join("\n");

  try {
    const response = await fetch(
      `${BASE_URL}/gemini-2.5-flash-image:generateContent?key=${encodeURIComponent(apiKey)}`,
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
        return `data:${outMime};base64,${imagePart.inlineData.data}`;
      }
    }
  } catch {
    // Ignore and let vision-guided diffusion handle it
  }
  return null;
}

async function extractSketchPrompt(
  apiKey: string,
  mimeType: string,
  rawBase64: string,
  req: AdvancedRenderRequest
): Promise<string | null> {
  const analyzePrompt = `You are an expert architectural visualization prompt engineer.
Look closely at the attached hand-drawn hotel room sketch. Describe EVERY object, piece of furniture, wall feature, window, lamp, plant, artwork, mirror, wardrobe, and its EXACT spatial position (left, center, right, foreground, background, above, beside) and camera perspective in the sketch.

Combine that exact spatial layout with these interior design choices:
- Room Type: ${req.roomCategory.replace(/-/g, " ")}
- Design Style: ${req.styleName} (${req.stylePrompt})
- Lighting: ${req.lightingMode.replace(/-/g, " ")}
- Main Material: ${req.finishMaterial.replace(/-/g, " ")}
${req.customPrompt ? `- Extra Notes: ${req.customPrompt}` : ""}

Write ONE single concise, vivid, ultra-photorealistic 3D interior photography prompt (max 100 words) that will generate a real-world 3D photograph strictly matching the sketch's layout and objects. Output ONLY the prompt text, no quotes or markdown.`;

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
            generationConfig: { temperature: 0.3, maxOutputTokens: 200 },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const extracted = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (extracted && extracted.length > 20) {
          return `${extracted}, photorealistic 3D architectural interior photography, real-world natural colors, warm glowing lamps, realistic wood grain, soft shadows, 8k uhd`;
        }
      }
    } catch {
      // Try next model
    }
  }
  return null;
}

async function fetchDiffusionImage(prompt: string, model: string, seed: number): Promise<string> {
  const encoded = encodeURIComponent(prompt.slice(0, 850));
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=768&model=${model}&nologo=true&seed=${seed}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch(url, { method: "GET", signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Status ${res.status}`);
    }
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      throw new Error(`Non-image response: ${contentType}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 5000) {
      throw new Error("Image too small");
    }
    return `data:${contentType};base64,${buf.toString("base64")}`;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateAdvanced3DRender(
  req: AdvancedRenderRequest
): Promise<AdvancedRenderResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  const startTime = Date.now();

  const mimeMatch = req.sketchImageBase64.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
  const rawBase64 = req.sketchImageBase64.replace(/^data:image\/\w+;base64,/, "");

  const fallbackPrompt = `${req.stylePrompt}, ${req.roomCategory.replace(/-/g, " ")}, ${req.lightingMode.replace(/-/g, " ")}, ${req.finishMaterial.replace(/-/g, " ")} finish, ${req.customPrompt || ""}, ultra-photorealistic 3D architectural interior photography, real-world natural colors, warm glowing lamps, realistic wood grain, soft shadows, 8k uhd`;

  let photorealPrompt = fallbackPrompt;

  if (apiKey) {
    // Run direct image-gen check and vision sketch analysis IN PARALLEL
    const [directImage, visionPrompt] = await Promise.all([
      tryDirectImageGen(apiKey, mimeType, rawBase64, req),
      extractSketchPrompt(apiKey, mimeType, rawBase64, req),
    ]);

    if (directImage) {
      return {
        imageDataUrl: directImage,
        processingTimeMs: Date.now() - startTime,
        mode: "direct-image",
      };
    }

    if (visionPrompt) {
      photorealPrompt = visionPrompt;
    }
  }

  // Race turbo and flux in parallel on server (whichever succeeds first wins!)
  const seed = Math.floor(Math.random() * 1000000);
  try {
    const serverImage = await Promise.any([
      fetchDiffusionImage(photorealPrompt, "turbo", seed),
      fetchDiffusionImage(photorealPrompt, "flux", seed),
    ]);
    return {
      imageDataUrl: serverImage,
      processingTimeMs: Date.now() - startTime,
      mode: "direct-image",
    };
  } catch {
    // If server-side diffusion fails (e.g. Vercel shared IP rate limit or timeout),
    // let the browser fetch the 3D photorealistic image directly with the extracted prompt
    return {
      photorealPrompt,
      processingTimeMs: Date.now() - startTime,
      mode: "client-diffusion",
    };
  }
}
