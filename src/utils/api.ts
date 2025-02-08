import { useSettingsStore } from '../stores/settings'

// 定义API基础URL
const API_BASE_URL = 'https://api.siliconflow.cn/v1'

// 定义消息接口
interface Message {
    role: 'user' | 'assistant'
    content: string
}

// 定义API请求负载接口
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

// 定义响应接口
interface ChatResponse {
    choices: Array<{
        message?: {
            content: string
        }
    }>
    usage?: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
    }
}

// 创建请求头
const createHeaders = (): Record<string, string> => {
    const settingsStore = useSettingsStore()
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settingsStore.apiKey}`
    }
}

export const chatApi = {
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
            tools: [{
                type: "function",
                function: {
                    description: "<string>",
                    name: "<string>",
                    parameters: {},
                    strict: true
                }
            }]
        }

        const response = await fetch(`${API_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                ...createHeaders(),
                ...(stream && { 'Accept': 'text/event-stream' })
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        if (stream) {
            return response
        }

        return await response.json()
    },

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
    },

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
} 