// 定义类型接口
interface Message {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    reasoning_content: string;
    hasImage: boolean;
    loading: boolean;
}

interface TokenUsage {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
}

interface StreamResponse {
    choices: Array<{
        delta: { content?: string; reasoning_content?: string };
    }>;
    usage?: TokenUsage;
}

export interface SyncResponse {
    choices: Array<{
        message?: { content: string; reasoning_content: string };
    }>;
    usage?: TokenUsage;
}

interface ProcessStreamOptions {
    updateMessage: (content: string, reasoning_content: string) => void;
    updateTokenCount: (usage: TokenUsage) => void;
}

interface TokenAccumulator {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

export const messageHandler = {
    formatMessage(role: 'user' | 'assistant', content: string): Message {
        const hasImage = content.includes('![') && content.includes('](data:image/')
        // const hasImage = !!content.match(/!\[.*?\]\((data:image\/(png|jpg|jpeg);base64,[^)]+)\)/g)

        return {
            id: Date.now(),
            role,
            content,
            hasImage,
            reasoning_content: '',
            loading: false,
        };
    },

    /**
     * 处理流式响应
     * @param {Response} response - 响应对象
     * @param {Object} options - 处理选项，这里传入处理消息和token使用量的回调函数
     */
    async processStreamResponse(
        response: Response,
        { updateMessage, updateTokenCount }: ProcessStreamOptions
    ): Promise<void> {
        try {
            let fullResponse = '';
            let fullReasoningResponse = '';
            const tokenAccumulator: TokenAccumulator = {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0
            };

            const reader = response.body!.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    console.log('流式响应完成');
                    updateTokenCount(tokenAccumulator);
                    break;
                }

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.includes('data: ')) {
                        const jsonStr = line.replace('data: ', '');
                        if (jsonStr === '[DONE]') {
                            console.log('流式响应完成，读取完毕');
                            continue;
                        }

                        try {
                            const jsData = JSON.parse(jsonStr) as StreamResponse;
                            if (jsData.choices[0].delta.content || jsData.choices[0].delta.reasoning_content) {
                                const content = jsData.choices[0].delta.content || '';
                                const reasoning_content = jsData.choices[0].delta.reasoning_content || '';
                                fullResponse += content;
                                fullReasoningResponse += reasoning_content;
                                updateMessage(fullResponse, fullReasoningResponse);
                            }

                            if (jsData.usage) {
                                tokenAccumulator.prompt_tokens = jsData.usage.prompt_tokens || 0;
                                tokenAccumulator.completion_tokens = jsData.usage.completion_tokens || 0;
                                tokenAccumulator.total_tokens = jsData.usage.total_tokens || 0;
                            }
                        } catch (e) {
                            console.error('解析JSON失败:', e);
                        }
                    }
                }
            }
        } catch (error) {
            if(error instanceof Error && error.name === 'AbortError') {
                console.log('流式响应被中止');
            }
            console.error('流处理错误:', error);
            throw error;
        }
    },

    async processSyncResponse(
        response: SyncResponse,
        onUpdate: (content: string, reasoning_content: string) => void
    ): Promise<{ content: string; reasoning_content: string; usage: TokenUsage | null }> {
        try {
            if (!response || !response.choices) {
                throw new Error('无效的响应格式');
            }

            const content = response.choices[0]?.message?.content || '';
            const reasoning_content = response.choices[0]?.message?.reasoning_content || '';
            onUpdate(content, reasoning_content);

            return {
                content,
                reasoning_content,
                usage: response.usage || null
            };
        } catch (error) {
            console.error('同步响应处理错误:', error);
            throw error;
        }
    }
}; 