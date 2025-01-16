import { ResponseFormatJSONSchema } from "openai/resources";
import { ChatCompletionCreateParamsBase, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { WebhookEventType } from "replicate";


export type ReplicateModel = `${string}/${string}` | `${string}/${string}:${string}`;

export interface OpenAIConfig {
    api_key: string; 
    models: {
        text?: string[],
        image?: string[],
        video?: string[],
        vision?: string[]

    },
    temperature?: number,
    max_tokens?: number,
}

export interface ReplicateConfig {
    api_key: string; 
    models: {
        image?: ReplicateModel[],
        ocr?: ReplicateModel[],
        text?: ReplicateModel[],
        vision?: ReplicateModel[],
        video?: ReplicateModel[],
        audio?: ReplicateModel[],
        voice_clone?: ReplicateModel[],
        upscale?: ReplicateModel[]
    },
}

export interface AIConfig {
    openai?: OpenAIConfig;
    replicate?: ReplicateConfig;
}

export interface ReplicateRunParams {
    model: ReplicateModel;
    options: { 
        input: object; 
        wait?: { 
        interval?: number | undefined; } | undefined; 
        webhook?: string | undefined; 
        webhook_events_filter?: WebhookEventType[] | undefined; 
        signal?: AbortSignal | undefined; 
    }
}

export interface ReplicateTextOpts {
    max_tokens?: number;
    temperature?: number;
  }

export interface ImageGenOpts {
    cfg: number;
    aspect_ratio:  string;
    output_format:  string;
    output_quality: number,
    negative_prompt:  string;
  }

export interface TranscribeOpts {
    model: string;
    language: string;
    translate: boolean;
    temperature: number;
    transcription: string;
    suppress_tokens: string;
    logprob_threshold: number;
    no_speech_threshold: number;
    condition_on_previous_text: boolean;
    compression_ratio_threshold: number;
    temperature_increment_on_fallback: number;
}
  
export interface UpscaleOptions {
    scale: number,
    face_enhance: boolean
}

export  interface EventHandler {
    event: string;
    handler: (args: any) => void;
}


export type FormattedTranscriptionData = {
    id: number
    start: number,
    end: number,
    text: string
}

export interface OpenaiChatParams {
    systemPrompt?: string;
    opts?:  Omit<Partial<ChatCompletionCreateParamsBase>, 'stream'>;
    chatHistory?: ChatCompletionMessageParam[]
}

export interface GenerateTextFromImageParams extends OpenaiChatParams {
    imageUrl: string
}

export interface GenerateTextFromImagesParams extends OpenaiChatParams {
    imageUrls: string[]
}

export interface GenerateJSONParams extends  OpenaiChatParams{
    responseFormat: ResponseFormatJSONSchema;
    opts?: Omit<Partial<ChatCompletionCreateParamsBase>, 'stream'>;
}

export interface Resources {
    food: number;
    energy: number;
    water: number;
}

export type Choice = "defect" | "cooperate";

// Represents the global state of the game
export interface GlobalState {
    year: number; // round
    totalPopulation: number; 
    totalResources: Resources;
    nations: Nation[]; 
    isGlobalCollapse: boolean;
}


export type NationCategory = "low" | "medium" | "high";

export type NationState = "normal" | "struggling";

export interface Nation {
    name: string;
    resources: Resources;
    population: number;
    isCollapsed: boolean;
    category: NationCategory;
    state: NationState;
}

interface NationSummary extends Pick<Nation, "name" | "population" | "state"> {
    choice: Choice;
}

export interface Outcome {
    year: number;
    cooperations: number;
    defections: number;
    globalResources: Resources;
    globalPopulation: number;
    nations: NationSummary[];
}


export interface NationChanges extends Resources {
    population: number;
    state: string;
}

export interface SimulationOptions {
    resourceDepletionRate?: Resources
    maxYears?: number;
    contributionFactor?: number;
    defectGainFactor?: number;
    onYearOutcome?: (outcome: Outcome) => void;
  }

  export  interface DecisionResult  {
    nation: Nation;
    choice: string;
    globalChanges: Resources;
    nationChanges: Resources & {
        population: number;
        state: string;
    };
}
