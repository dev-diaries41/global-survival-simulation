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

export interface StepOutcome<T extends Record<string,any> = Record<string,any>>{
    outcome: T
}

export interface SimulationConfig {
    steps: number;
    type: SimulationType;
    openaiApiKey?: string;
    onStepComplete?: (stepOutcome: StepOutcome) => void;
}

export interface SyntheticDataConfig  {
    ignoreKeys?: string[];
    limits?: Record<string, { min: number; max: number }>;
    sampleSize?: number;
};

export interface DecisionResult<
  Entity extends Record<string, any> = Record<string, any>,
  EnvironmentChanges extends Record<string, any> = Record<string, any>,
  EntityChanges extends Record<string, any> = Record<string, any>
> {
  entity: Entity;
  decision: string;
  environmentChanges: EnvironmentChanges;
  entityChanges: EntityChanges;
}
  
export type SimulationType = "sim" | "llm";

export interface Resources {
    food: number;
    energy: number;
    water: number;
}

export type Choice = "defect" | "cooperate";


export interface SurvivalEnvironment {
    year: number;
    isGlobalCollapse: boolean;
    resourceDepletionRate: Resources
    contributionFactor: number;
    defectGainFactor: number;
    globalPopulation: number;
    globalResources: Resources,
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

export interface SurvivalStats {
    year: number;
    cooperations: number;
    defections: number;
    globalResources: Resources;
    globalPopulation: number;
    activeNations: number;
}

export interface NationChanges extends Resources {
    population: number;
    state: string;
}




  
