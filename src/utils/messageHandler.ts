// 定义类型接口
interface Message {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    reasoning_content?: string;
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
        delta: {
            content?: string | null;
            reasoning_content?: string | null;
        };
    }>;
    usage?: TokenUsage;
}

export interface SyncResponse {
    choices: Array<{
        message?: { 
            content: string;
            reasoning_content?: string;
        };
    }>;
    usage?: TokenUsage;
}

interface ProcessStreamOptions {
    updateMessage: (content: string, reasoning_content?: string) => void;
    updateTokenCount: (usage: TokenUsage) => void;
}

interface TokenAccumulator {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

export interface SyncImageResponse {
    images: Array<{
        url: string;
    }>;
}

export const messageHandler = {
    // 格式化消息
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

    // 格式化图片消息
    formatImageMessage(role: 'user' | 'assistant', images: Array<{url: string}>): Message {
        // 将所有图片URL转换为Markdown格式
        const content = images
            .map(img => `![generated image](${img.url})`)
            .join('\n\n');
        
        return this.formatMessage(role, content)
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
        let fullResponse = '';
        let fullReasoningResponse = '';
        const tokenAccumulator: TokenAccumulator = {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0
        };

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        try {
            while (true) {
                const { done, value } = await reader.read();
                
                // 处理流结束的情况
                if (done) {
                    console.log('流式响应完成');
                    updateTokenCount(tokenAccumulator);
                    break;
                }

                // 处理数据块
                const lines = decoder.decode(value)
                    .split('\n')
                    .filter(line => line.trim() !== '')
                    .filter(line => line.startsWith('data: '));

                for (const line of lines) {
                    const jsonStr = line.replace('data: ', '');
                    if (jsonStr === '[DONE]') continue;

                    try {
                        const jsData = JSON.parse(jsonStr) as StreamResponse;
                        const delta = jsData.choices[0]?.delta;
                        
                        if (delta) {
                            let hasUpdate = false;
                            
                            // 严格检查 content
                            if (delta.content !== undefined && delta.content !== null) {
                                fullResponse += delta.content;
                                hasUpdate = true;
                            }
                            
                            // 严格检查 reasoning_content
                            if (delta.reasoning_content !== undefined && delta.reasoning_content !== null) {
                                fullReasoningResponse += delta.reasoning_content;
                                hasUpdate = true;
                            }
                            
                            // 只在有实际更新时才调用更新函数
                            if (hasUpdate) {
                                updateMessage(fullResponse, fullReasoningResponse);
                            }
                        }

                        // 更新token统计
                        if (jsData.usage) {
                            Object.assign(tokenAccumulator, {
                                prompt_tokens: jsData.usage.prompt_tokens || tokenAccumulator.prompt_tokens,
                                completion_tokens: jsData.usage.completion_tokens || tokenAccumulator.completion_tokens,
                                total_tokens: jsData.usage.total_tokens || tokenAccumulator.total_tokens
                            });
                        }
                    } catch (e) {
                        console.error('解析JSON失败:', e);
                        console.error('问题数据:', jsonStr);
                    }
                }
            }
        } catch (error) {
            // 处理中止和其他错误
            if (error instanceof Error) {
                const isAborted = error.name === 'AbortError';
                if (isAborted) {
                    console.log('流式响应被中止');
                    // 确保在中止时也更新token计数
                    updateTokenCount(tokenAccumulator);
                } else {
                    console.error('流处理错误:', error);
                }
            }
            throw error;
        } finally {
            // 确保读取器被正确关闭
            reader.releaseLock();
        }
    },

    async processSyncResponse(
        response: SyncResponse,
        onUpdate: (content: string, reasoning_content?: string) => void
    ): Promise<{ content: string; reasoning_content?: string; usage: TokenUsage | null }> {
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
    },

    async processT2IResponse(
        response: SyncImageResponse,
        onUpdate: (content: string) => void
    ): Promise<{ content: string }> {
        try {
            if (!response || !response.images || response.images.length === 0) {
                throw new Error('无效的图片生成响应');
            }

            // 使用 formatImageMessage 处理图片 URL
            const imageMessage = this.formatImageMessage('assistant', response.images);
            const content = imageMessage.content;
            
            // 更新消息内容
            onUpdate(content);

            return { content };
        } catch (error) {
            console.error('图片响应处理错误:', error);
            throw error;
        }
    }
}; 