// OpenAIClient.ts
import { OpenAI } from "openai";
import dotenv from 'dotenv';
import { LLMClient } from "./base";
import { ChatCompletionContentPartImage } from "openai/resources";
import { GenerateJSONParams, GenerateTextFromImageParams, GenerateTextFromImagesParams, OpenaiChatParams } from "../types";

dotenv.config(); 

const defaultSystemPrompt = "You are a helpful assistant."

const openaiAPIKey = process.env.OPENAI_API_KEY || '';

export class OpenAIClient extends LLMClient {
    private openai: OpenAI;

    constructor(apiKey: string = openaiAPIKey) {
        super();
        this.openai = new OpenAI({ apiKey: apiKey });
    }

    async generateText(prompt: string, chatOptions: OpenaiChatParams): Promise<string> {
        const { systemPrompt, opts, chatHistory } = chatOptions;
        const { model = "gpt-4o-2024-08-06", ...otherOpts } = opts || {};

        const response = await this.openai.chat.completions.create({
            messages: [
                { "role": "system", "content": systemPrompt || defaultSystemPrompt },
                ...chatHistory || [],
                { "role": "user", "content": prompt },
            ],
            model,
            ...otherOpts
        });

        const content = response.choices[0].message.content;
        if(typeof content === "string")throw new Error("Failed to generated text")

        return response.choices[0].message.content as string;
    }

    async generateJson(prompt: string, chatOptions: GenerateJSONParams): Promise<Record<string, any> | null> {
        const { systemPrompt, opts, responseFormat, chatHistory } = chatOptions;
        const { model = "gpt-4o-2024-08-06", ...otherOpts } = opts || {};

        const response = await this.openai.beta.chat.completions.parse({
            messages: [
                { "role": "system", "content": systemPrompt || defaultSystemPrompt },
                ...chatHistory || [],
                { "role": "user", "content": prompt },
            ],
            response_format: responseFormat,
            model,
            ...otherOpts
        });

        const parsed = response.choices[0].message.parsed;
        if(!parsed)throw new Error("Failed to generated JSON")

        return parsed;
    }

    async generateJsonFromImg(prompt: string, chatOptions: GenerateJSONParams & GenerateTextFromImageParams): Promise<any> {
        const { systemPrompt, opts, responseFormat, chatHistory, imageUrl } = chatOptions;
        const { model = "gpt-4o-2024-08-06", ...otherOpts } = opts || {};

        const response = await this.openai.beta.chat.completions.parse({
            messages: [
                { "role": "system", "content": systemPrompt || defaultSystemPrompt },
                ...chatHistory || [],
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: imageUrl, detail: 'high' } }
                    ]
                },
            ],
            response_format: responseFormat,
            model,
            ...otherOpts
        });

        const parsed = response.choices[0].message.parsed;
        if(!parsed)throw new Error("Failed to generated JSON")

        return parsed;
    }

    async generateTextFromImage(prompt: string, chatOptions: GenerateTextFromImageParams): Promise<string> {
        const { systemPrompt, opts, imageUrl, chatHistory } = chatOptions;
        const { model = "gpt-4o-2024-08-06", ...otherOpts } = opts || {};

        const response = await this.openai.chat.completions.create({
            model,
            messages: [
                { role: "system", content: systemPrompt || defaultSystemPrompt },
                ...chatHistory || [],
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: imageUrl, detail: 'high' } }
                    ]
                },
            ],
            ...otherOpts
        });

        const content = response.choices[0].message.content;
        if(typeof content !== "string")throw new Error("Failed to generated text");

        return response.choices[0].message.content as string;
        }

    async generateTextFromMutliImages(prompt: string, chatOptions: GenerateTextFromImagesParams): Promise<string> {
        const { systemPrompt, opts, imageUrls, chatHistory } = chatOptions;
        const { model = "gpt-4o-2024-08-06", ...otherOpts } = opts || {};

        const imageContent = imageUrls.map(url => ({
            type: "image_url" as "image_url", 
            image_url: { url, detail: 'high' as ChatCompletionContentPartImage.ImageURL['detail'] }
        }));

        const response = await this.openai.chat.completions.create({
            model,
            messages: [
                { role: "system", content: systemPrompt || defaultSystemPrompt },
                ...chatHistory || [],
                {
                    role: "user",
                    content: [{ type: "text" as 'text', text: prompt }, ...imageContent]
                },
            ],
            ...otherOpts
        });

        const content = response.choices[0].message.content;
        if(typeof content !== "string")throw new Error("Failed to generated text")

        return response.choices[0].message.content as string;
    }
}
