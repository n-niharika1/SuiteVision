/**
 * Server-side Advanced 3D Photorealistic Rendering Engine
 * Translates architectural concept sketches into full real-world 3D
 * photorealistic hotel room renders while strictly preserving sketch geometry.
 *
 * Runs strictly on the server; credentials are never exposed to the client.
 */

const ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const IMAGE_MODELS = [
  "gemini-2.0-flash-exp-image-generation",
  "gemini-2.5-flash-image",
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
  imageDataUrl: string;
  processingTimeMs: number;
}

export async function generateAdvanced3DRender(
  req: AdvancedRenderRequest
): Promise<AdvancedRenderResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Advanced engine credentials are not configured on the server.");
  }

  const startTime = Date.now();

  // Extract MIME type and raw base64 payload
  const mimeMatch = req.sketchImageBase64.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
  const rawBase64 = req.sketchImageBase64.replace(/^data:image\/\w+;base64,/, "");

  const architecturalPrompt = [
    `Transform this exact architectural concept sketch into a full real-world 3D photorealistic photograph of a luxury ${req.roomCategory.replace(/-/g, " ")}.`,
    `STRICT STRUCTURAL ADHERENCE: You MUST follow the exact layout, perspective lines, camera angle, proportions, and object placements drawn in the input sketch. Keep every wall, bed, headboard, window, lamp, table, chair, and architectural boundary in the exact same position as the sketch. Do NOT invent unrelated room layouts or ignore the sketch.`,
    `REAL-WORLD 3D PHOTOREALISM: Render every object as a tangible, real-world physical 3D object with authentic natural colors, realistic surface textures (wood grain, fabric weave, polished stone, glass reflections, brushed metal), natural ambient occlusion, soft contact shadows, realistic depth of field, and physically accurate lighting.`,
    `INTERIOR DESIGN SPECIFICATION:`,
    `- Design Aesthetic: ${req.styleName} (${req.stylePrompt})`,
    `- Lighting Atmosphere: ${req.lightingMode.replace(/-/g, " ")}`,
    `- Primary Finish Material: ${req.finishMaterial.replace(/-/g, " ")}`,
    req.customPrompt ? `- Additional Designer Notes: ${req.customPrompt}` : "",
    `Output only the finished photorealistic 3D interior photograph with no sketch lines, no borders, and no text overlays.`,
  ]
    .filter(Boolean)
    .join("\n");

  let lastError: Error | null = null;

  for (const model of IMAGE_MODELS) {
    try {
      const response = await fetch(
        `${ENDPOINT_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: architecturalPrompt },
                  {
                    inlineData: {
                      mimeType,
                      data: rawBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
            },
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Engine status ${response.status}: ${errText.slice(0, 200)}`);
      }

      const data = await response.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find(
        (p: { inlineData?: { mimeType?: string; data?: string } }) =>
          p.inlineData?.data
      );

      if (!imagePart?.inlineData?.data) {
        throw new Error("No image output returned by advanced rendering engine.");
      }

      const outMime = imagePart.inlineData.mimeType || "image/png";
      return {
        imageDataUrl: `data:${outMime};base64,${imagePart.inlineData.data}`,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (err) {
      lastError = err as Error;
      console.warn(`Advanced model ${model} attempt failed:`, err);
    }
  }

  throw lastError || new Error("Advanced 3D rendering failed.");
}
