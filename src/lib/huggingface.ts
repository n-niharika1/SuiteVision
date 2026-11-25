/**
 * SuiteVision AI — Hugging Face Inference API client
 *
 * Uses image-to-image models that actually accept a source image and
 * transform it guided by a text prompt. The primary model is
 * `timbrooks/instruct-pix2pix` which modifies the input image based
 * on a text instruction — perfect for "turn this sketch into a
 * photorealistic hotel room".
 *
 * Fallback chain:
 *   1. instruct-pix2pix (best for sketch→render, keeps structure)
 *   2. stable-diffusion-xl-refiner (image refinement)
 *   3. stable-diffusion-v1-5 img2img
 */

const HF_API_URL = "https://api-inference.huggingface.co/models";

export interface GenerationOptions {
  prompt?: string;
  negativePrompt?: string;
  numInferenceSteps?: number;
  guidanceScale?: number;
  strength?: number;
  imageGuidanceScale?: number;
}

export interface GenerationResult {
  imageBlob: Blob;
  model: string;
  processingTimeMs: number;
}

/**
 * Primary: Use InstructPix2Pix for sketch-to-photoreal translation.
 * This model takes an input image + text instruction and modifies the
 * image accordingly — it preserves the spatial structure of the sketch
 * while transforming textures and materials.
 */
export async function generatePhotorealFromSketch(
  sketchImageBase64: string,
  options: GenerationOptions = {}
): Promise<GenerationResult> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey || apiKey === "your_huggingface_api_key_here") {
    throw new Error("HUGGINGFACE_API_KEY not configured");
  }

  const {
    prompt = "Transform this architectural sketch into a photorealistic luxury hotel room interior with professional lighting, premium materials, elegant furniture, 8k ultra-detailed",
    negativePrompt = "cartoon, anime, drawing, sketch lines, low quality, blurry, distorted, ugly, deformed, watermark, text",
    numInferenceSteps = 20,
    guidanceScale = 7.5,
    imageGuidanceScale = 1.5,
  } = options;

  const startTime = Date.now();

  // Strip data URL prefix to get raw base64
  const rawBase64 = sketchImageBase64.replace(/^data:image\/\w+;base64,/, "");

  // Model priority chain: each accepts image input differently
  const modelChain = [
    {
      id: "timbrooks/instruct-pix2pix",
      buildBody: () => JSON.stringify({
        inputs: rawBase64,
        parameters: {
          prompt,
          negative_prompt: negativePrompt,
          num_inference_steps: numInferenceSteps,
          guidance_scale: guidanceScale,
          image_guidance_scale: imageGuidanceScale,
        },
      }),
      contentType: "application/json",
    },
    {
      id: "stabilityai/stable-diffusion-xl-refiner-1.0",
      buildBody: () => {
        // Send image as raw binary
        return Buffer.from(rawBase64, "base64");
      },
      contentType: "application/octet-stream",
    },
  ];

  let lastError: Error | null = null;

  for (const model of modelChain) {
    try {
      const body = model.buildBody();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": model.contentType,
        "X-Wait-For-Model": "true",
      };

      // For binary uploads, add the prompt as a query parameter or header
      if (model.contentType === "application/octet-stream") {
        // Some HF models accept prompt via JSON even with binary image;
        // others need the prompt in the URL. Try JSON wrapper first.
        const jsonBody = JSON.stringify({
          inputs: rawBase64,
          parameters: {
            prompt,
            negative_prompt: negativePrompt,
            num_inference_steps: numInferenceSteps,
            guidance_scale: guidanceScale,
          },
        });

        const response = await fetch(`${HF_API_URL}/${model.id}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "X-Wait-For-Model": "true",
          },
          body: jsonBody,
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HF ${model.id} error (${response.status}): ${errText}`);
        }

        const blob = await response.blob();
        if (blob.size < 1000) {
          throw new Error(`HF ${model.id} returned suspiciously small response (${blob.size} bytes)`);
        }

        return {
          imageBlob: blob,
          model: model.id,
          processingTimeMs: Date.now() - startTime,
        };
      }

      const response = await fetch(`${HF_API_URL}/${model.id}`, {
        method: "POST",
        headers,
        body: body as string,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HF ${model.id} error (${response.status}): ${errText}`);
      }

      const blob = await response.blob();
      if (blob.size < 1000) {
        throw new Error(`HF ${model.id} returned suspiciously small response (${blob.size} bytes)`);
      }

      return {
        imageBlob: blob,
        model: model.id,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (err) {
      lastError = err as Error;
      console.warn(`Model ${model.id} failed, trying next...`, err);
      continue;
    }
  }

  throw lastError || new Error("All HuggingFace models failed to process the sketch");
}

/**
 * Fallback: Generic img2img with Stable Diffusion v1.5
 */
export async function generateWithImg2Img(
  sketchImageBase64: string,
  options: GenerationOptions = {}
): Promise<GenerationResult> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey || apiKey === "your_huggingface_api_key_here") {
    throw new Error("HUGGINGFACE_API_KEY not configured");
  }

  const startTime = Date.now();
  const model = "timbrooks/instruct-pix2pix";

  const rawBase64 = sketchImageBase64.replace(/^data:image\/\w+;base64,/, "");

  const {
    prompt = "Transform this sketch into a photorealistic luxury hotel room, professional interior photography, warm ambient lighting, premium furniture, polished surfaces, 8k ultra detailed",
    negativePrompt = "sketch, drawing, cartoon, watermark, text, blurry, low quality, rough lines",
    numInferenceSteps = 25,
    guidanceScale = 7.5,
    strength = 0.75,
  } = options;

  const response = await fetch(`${HF_API_URL}/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Wait-For-Model": "true",
    },
    body: JSON.stringify({
      inputs: rawBase64,
      parameters: {
        prompt,
        negative_prompt: negativePrompt,
        num_inference_steps: numInferenceSteps,
        guidance_scale: guidanceScale,
        image_guidance_scale: strength + 0.5,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HF API error (${response.status}): ${errText}`);
  }

  const imageBlob = await response.blob();
  return {
    imageBlob,
    model,
    processingTimeMs: Date.now() - startTime,
  };
}
