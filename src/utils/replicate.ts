import dotenv from 'dotenv';
dotenv.config();
import { ReplicateConfig, ImageGenOpts, ReplicateModel, ReplicateRunParams, TranscribeOpts, UpscaleOptions, ReplicateTextOpts } from '../types';
import Replicate, { ServerSentEvent } from 'replicate';

export const defaultPromptTemplate = "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\nYou are a helpful assistant<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n";

const default_negative_prompt = "disfigured mouth, disfigured teeth, half head, half face, blury, side looking, old, wrinkle, child, no face, pencil, full body, sharp, far away, overlapping, duplication, nude, disfigured, kitsch, oversaturated, grain, low-res, Deformed, blurry, bad anatomy, poorly drawn face, mutation, mutated, extra limb, ugly, poorly drawn hands, missing limb, blurry, floating limbs, disconnected limbs, malformed hands, blur, out of focus, long body, disgusting, poorly drawn, childish, mutilated, mangled, surreal, out of frame, duplicate, 2 faces";

export const defaultImageGenOpts: ImageGenOpts= {
    cfg: 7,
    aspect_ratio: "3:2",
    output_format: "png",
    output_quality: 90,
    negative_prompt: default_negative_prompt
  }

export const defaultTranscribeOpts: TranscribeOpts = {
  model: "large-v3",
  language: "af",
  translate: false,
  temperature: 0,
  transcription: "plain text",
  suppress_tokens: "-1",
  logprob_threshold: -1,
  no_speech_threshold: 0.6,
  condition_on_previous_text: true,
  compression_ratio_threshold: 2.4,
  temperature_increment_on_fallback: 0.2
};

export const DefaultUpscaleOpts: UpscaleOptions = {face_enhance: false, scale: 4}

export const DefaultTextOpts:ReplicateTextOpts = {
  temperature: 0.2,
  max_tokens: 2000
}
export const config: ReplicateConfig = {
  api_key: process.env.REPLICATE_API_TOKEN!, 
  models: {
      text: [
          "meta/meta-llama-3-70b-instruct"
      ],
      ocr: [
          "abiruyt/text-extract-ocr:a524caeaa23495bc9edc805ab08ab5fe943afd3febed884a4f3747aa32e9cd61"
      ],
      vision: [
          "yorickvp/llava-13b:b5f6212d032508382d61ff00469ddda3e32fd8a0e75dc39d8a4191bb742157fb",
          "cuuupid/glm-4v-9b:a75c919339f65bf00afa96511af653fdbd0ec3cb0f5e6f4350809445eee0e14f"
      ],
      image: [
          "stability-ai/stable-diffusion-3",
          "black-forest-labs/flux-schnell",
          "black-forest-labs/flux-1.1-pro"
      ],
      audio:[
          "openai/whisper:4d50797290df275329f202e48c76360b3f22b08d28c196cbc54600319435f8d2"
      ],
      upscale:[
          "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003", 
      ],
      video: [
        "minimax/video-01"
    ]
  },
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function run<T>(runParams: ReplicateRunParams): Promise<T> {
  const { model, options } = runParams;
  const output = await replicate.run(model, options);
  return output as T;
}

export async function generateText( prompt: string, model: ReplicateModel = config?.models?.text?.[0]!, prompt_template: string = defaultPromptTemplate):  Promise<AsyncGenerator<ServerSentEvent, any, unknown>> {
  const input = { prompt, prompt_template };
  return replicate.stream(model, { input });
}

export async function generateImage(prompt: string, model: ReplicateModel = config?.models?.image?.[1]!, opts: ImageGenOpts = defaultImageGenOpts): Promise<string> {
  const input = { prompt, ...opts };
  const runParams = { model, options: { input } };
  const imageUrls = await run<string[]|string>(runParams);
  return Array.isArray(imageUrls)? imageUrls[0] : imageUrls;
}

export async function generateTextFromImage(prompt: string, image: string, model: ReplicateModel = config?.models?.vision?.[0]!, opts: ReplicateTextOpts = DefaultTextOpts): Promise<string> {
  const input = { prompt, image, ...opts };
  const runParams = { model, options: { input } };
  const output = await run<string[]>(runParams);
  return output.join(' ');
}

export async function generateVideo(prompt:string, first_frame_image?: string, model: ReplicateModel = config?.models?.video?.[0]!,  opts: {prompt_optimizer?: boolean} = {}) {
  const runParams = { model, options: { input: {prompt,  first_frame_image, ...opts } } };
  const output = await run(runParams);
  return output;
}

export async function transcribe(audio: string, model: ReplicateModel = config?.models?.audio?.[0]!, opts: TranscribeOpts = defaultTranscribeOpts): Promise<Record<string, any>> {
  const input = { audio, ...opts };
  const runParams = { model, options: { input } };
  const output = await run<Record<string, any>>(runParams);
  return output;
}

export async function ocr(image: string, model: ReplicateModel = config?.models?.ocr?.[0]!): Promise<string> {
  const runParams = { model, options: { input: { image } } };
  const extractedText = await run<string>(runParams);
  return extractedText.toString();
}

export async function upscale(image: string, model: ReplicateModel = config?.models?.upscale?.[0]!,  opts: UpscaleOptions = DefaultUpscaleOpts) {
  const runParams = { model, options: { input: { image, ...opts } } };
  const output = await run(runParams);
  return output;
}

export async function generateVariations(image: string, model: ReplicateModel = config?.models?.upscale?.[0]!,  opts: UpscaleOptions = DefaultUpscaleOpts) {
  const runParams = { model, options: { input: { image, ...opts } } };
  const output = await run<string[]>(runParams);
  return output;
}