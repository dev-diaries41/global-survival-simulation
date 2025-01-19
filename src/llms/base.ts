import { GenerateJSONParams, GenerateTextFromImageParams, GenerateTextFromImagesParams, OpenaiChatParams } from "../types";


export abstract class LLMClient {
    abstract generateText(prompt: string, chatOptions: OpenaiChatParams): Promise<string|null>;
    abstract generateJson(prompt: string, chatOptions: GenerateJSONParams): Promise<Record<string, any> | null>;
    abstract generateJsonFromImg(prompt: string, chatOptions: GenerateJSONParams & GenerateTextFromImageParams): Promise<Record<string, any> | null>;
    abstract generateTextFromImage(prompt: string, chatOptions: GenerateTextFromImageParams): Promise<string|null>;
    abstract generateTextFromMutliImages(prompt: string, chatOptions: GenerateTextFromImagesParams): Promise<string>|null;
}
