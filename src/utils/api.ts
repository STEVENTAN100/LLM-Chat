import { useSettingsStore } from '../stores/settings'

// 定义API基础URL
const API_BASE_URL = 'https://api.siliconflow.cn/v1'

// 定义视觉语言模型相关接口
export interface VLMContentItem {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
    };
}

// 定义消息接口
export interface Message {
    role: 'user' | 'assistant'
    content: string | VLMContentItem[]
}

// 定义LLM/VLM API请求负载接口
interface ChatPayload {
    model: string
    messages: Message[]
    temperature: number
    max_tokens: number
    stream?: boolean
    top_p?: number
    top_k?: number
    frequency_penalty?: number
    n?: number
    response_format?: {
        type: string
    }
    tools?: Array<{
        type: string
        function: {
            description: string
            name: string
            parameters: Record<string, unknown>
            strict: boolean
        }
    }>
}

// 定义LLM/VLM API响应接口
interface ChatResponse {
    choices: Array<{
        message?: {
            content: string
            reasoning_content?: string
        }
    }>
    usage?: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
    }
}

// 定义文生图 API请求负载接口
interface ImageGenerationPayload {
    model: string
    prompt: string
    image_size?: string
    num_inference_steps?: number
    seed?: number
}

// 定义文生图 API响应接口
interface ImageGenerationResponse {
    images: Array<{
        url: string
    }>
    timings: {
        inference: number
    }
    seed: number
}

// 创建请求头
const createHeaders = (): Record<string, string> => {
    const settingsStore = useSettingsStore()
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settingsStore.apiKey}`
    }
}

class ChatAPI {
    private controller: AbortController | null = null

    abortRequest() {
        if (this.controller) {
            this.controller.abort()
            this.controller = null
        }
    }

    async sendMessage(messages: Message[], stream = false): Promise<Response | ChatResponse> {
        const settingsStore = useSettingsStore()

        const payload: ChatPayload = {
            model: settingsStore.model,
            messages,
            temperature: settingsStore.temperature,
            max_tokens: settingsStore.maxTokens,
            stream,
            top_p: 0.7,
            top_k: 50,
            frequency_penalty: 0.5,
            n: 1,
            response_format: {
                type: "text"
            },
            // tools: [{
            //     type: "function",
            //     function: {
            //         description: "<string>",
            //         name: "<string>",
            //         parameters: {},
            //         strict: true
            //     }
            // }]
        }

        // 创建新的 AbortController
        this.controller = new AbortController()
        
        try {
            const response = await fetch(`${API_BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    ...createHeaders(),
                    ...(stream && { 'Accept': 'text/event-stream' }),
                },
                body: JSON.stringify(payload),
                signal: this.controller.signal
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            if (stream) {
                return response
            }

            return await response.json()
        } catch (error: unknown) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.log('请求被中止')
            }
            throw error
        }
    }

    async sendAsyncMessage(messages: Message[]): Promise<ChatResponse> {
        const settingsStore = useSettingsStore()

        const payload: Omit<ChatPayload, 'stream' | 'tools' | 'response_format'> = {
            model: settingsStore.model,
            messages,
            temperature: settingsStore.temperature,
            max_tokens: settingsStore.maxTokens
        }

        const response = await fetch(`${API_BASE_URL}/async/chat/completions`, {
            method: 'POST',
            headers: createHeaders(),
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        return await response.json()
    }

    async getAsyncResult(taskId: string): Promise<ChatResponse> {
        const response = await fetch(`${API_BASE_URL}/async-result/${taskId}`, {
            method: 'GET',
            headers: createHeaders()
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        return await response.json()
    }

    // 文生图方法
    async sendT2IMessage(prompt: string): Promise<ImageGenerationResponse> {
        const settingsStore = useSettingsStore()
        
        const payload: ImageGenerationPayload = {
            model: settingsStore.model,
            prompt: prompt,
            image_size: '1024x1024',
            num_inference_steps: 20,
            seed: Math.floor(Math.random() * 1000000)
        }

        try {
            const response = await fetch(`${API_BASE_URL}/images/generations`, {
                method: 'POST',
                headers: createHeaders(),
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            return await response.json()
        } catch (error) {
            console.error('生成图片失败:', error)
            throw error
        }
    }
}

export const chatApi = new ChatAPI() 