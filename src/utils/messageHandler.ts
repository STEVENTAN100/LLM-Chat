// 定义类型接口
interface Message {
    id: number;
    role: 'user' | 'assistant';
    content: string;
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
        delta: { content?: string; };
    }>;
    usage?: TokenUsage;
}

export interface SyncResponse {
    choices: Array<{
        message?: { content: string; };
    }>;
    usage?: TokenUsage;
}

interface ProcessStreamOptions {
    updateMessage: (content: string) => void;
    updateTokenCount: (usage: TokenUsage) => void;
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
            const reader = response.body!.getReader();
            const decoder = new TextDecoder();

            // ... existing code ...
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    console.log('流式响应完成');
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
                            if (jsData.choices[0].delta.content) {
                                const content = jsData.choices[0].delta.content;
                                fullResponse += content;
                                updateMessage(fullResponse);
                            }

                            if (jsData.usage) {
                                updateTokenCount(jsData.usage);
                            }
                        } catch (e) {
                            console.error('解析JSON失败:', e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('流处理错误:', error);
            throw error;
        }
    },

    async processSyncResponse(
        response: SyncResponse,
        onUpdate: (content: string) => void
    ): Promise<{ content: string; usage: TokenUsage | null }> {
        try {
            if (!response || !response.choices) {
                throw new Error('无效的响应格式');
            }

            const content = response.choices[0]?.message?.content || '';
            onUpdate(content);

            return {
                content,
                usage: response.usage || null
            };
        } catch (error) {
            console.error('同步响应处理错误:', error);
            throw error;
        }
    }
}; 