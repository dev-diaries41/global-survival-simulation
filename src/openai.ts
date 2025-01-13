import OpenAI from "openai";
import dotenv from 'dotenv'
import { ChatCompletionContentPartImage } from "openai/resources";
import { GenerateJSONParams, GenerateTextFromImageParams, GenerateTextFromImagesParams, OpenaiChatParams } from "./types";

dotenv.config()
const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});


export const defaultSystemPrompt = "You are a helpful assistant."

export async function generateText(prompt: string, chatOptions: OpenaiChatParams) {
    const {systemPrompt, opts, chatHistory} = chatOptions
    const {model= "gpt-4o-2024-08-06", ...otherOpts} = opts || {}

    const response = await openai.chat.completions.create({
        messages: [
            {"role": "system", "content": systemPrompt || defaultSystemPrompt },
            ...chatHistory || [],
            {"role": "user", "content": prompt},
        ],
        model,
        ...otherOpts
        
    });
    return response.choices[0].message.content;
}

export async function generateJSON(prompt: string, chatOptions: GenerateJSONParams) {
    const {systemPrompt, opts, responseFormat, chatHistory} = chatOptions
    const {model= "gpt-4o-2024-08-06", ...otherOpts} = opts || {}

    const response = await openai.beta.chat.completions.parse({
        messages: [
            {
                "role": "system", 
                "content": systemPrompt || defaultSystemPrompt 
            },
            ...chatHistory || [],
            {
                "role": "user", 
                "content": prompt
            },
        ],
        response_format: responseFormat,
        model,
        ...otherOpts
        
    });
    return response.choices[0].message.parsed;
}

export async function generateJsonFromImg(prompt: string, chatOptions: GenerateJSONParams & GenerateTextFromImageParams) {
    const {systemPrompt, opts, responseFormat, chatHistory, imageUrl} = chatOptions
    const {model= "gpt-4o-2024-08-06", ...otherOpts} = opts || {}

    const response = await openai.beta.chat.completions.parse({
        messages: [
            {
                "role": "system", 
                "content": systemPrompt || defaultSystemPrompt 
            },
            ...chatHistory || [],
            {
                role: "user",
                content: [
                    {type: "text", text: prompt },
                    {type: "image_url", image_url: {url: imageUrl, detail: 'high'}}
                ]},
        ],
        response_format: responseFormat,
        model,
        ...otherOpts
        
    });
    return response.choices[0].message.parsed;
}

export async function generateTextFromImage(prompt:string, chatOptions: GenerateTextFromImageParams) {
    const {systemPrompt, opts,  imageUrl, chatHistory} = chatOptions
    const {model= "gpt-4o-2024-08-06", ...otherOpts} = opts || {}
    const response = await openai.chat.completions.create({
        model,
        messages: [
            {
                role: "system", 
                content: systemPrompt|| defaultSystemPrompt
            },
            ...chatHistory || [],
            {
            role: "user",
            content: [
                {type: "text", text: prompt },
                {type: "image_url", image_url: {url: imageUrl, detail: 'high'}}
            ]},
        ],
        ...otherOpts
    });
    return response.choices[0].message.content;
}

export async function generateTextFromMutliImages(prompt:string, chatOptions: GenerateTextFromImagesParams) {
    const {systemPrompt, opts,  imageUrls, chatHistory} = chatOptions
    const {model= "gpt-4o-2024-08-06", ...otherOpts} = opts || {}

    const imageContent = imageUrls.map(url => ({type: "image_url" as  "image_url", image_url: {url, detail: 'high' as  ChatCompletionContentPartImage.ImageURL['detail']}}));
    const response = await openai.chat.completions.create({
        model,
        messages: [
            {
                role: "system", 
                content: systemPrompt|| defaultSystemPrompt
            },
            ...chatHistory || [],
            {
                role: "user",
                content: [{ type: "text" as 'text', text: prompt }, ...imageContent]
            },
        ],
        ...otherOpts
    });
    return response.choices[0].message.content;
}