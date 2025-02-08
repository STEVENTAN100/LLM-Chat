import { defineStore } from 'pinia'


// 定义消息类型
interface Message {
  id: number
  timestamp: string
  role: 'user' | 'assistant'
  content: string
}

// 定义Token计数类型
interface TokenCount {
  total: number
  prompt: number
  completion: number
}

// 定义Token使用统计类型
interface TokenUsage {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

// 定义Store的状态类型
interface ChatState {
  messages: Message[]
  isLoading: boolean
  tokenCount: TokenCount
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    messages: [],
    isLoading: false,
    tokenCount: {
      total: 0,
      prompt: 0,
      completion: 0
    }
  }),

  actions: {
    addMessage(message: Omit<Message, 'id' | 'timestamp'>) {
      this.messages.push({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...message
      })
    },

    updateLastMessage(content: string) {
      if (this.messages.length > 0) {
        const lastMessage = this.messages[this.messages.length - 1]
        lastMessage.content = content
      }
    },

    updateTokenCount(usage: TokenUsage) {
      if (usage.prompt_tokens) {
        this.tokenCount.prompt += usage.prompt_tokens
      }
      if (usage.completion_tokens) {
        this.tokenCount.completion += usage.completion_tokens
      }
      if (usage.total_tokens) {
        this.tokenCount.total += usage.total_tokens
      }
    },

    clearMessages() {
      this.messages = []
    }
  },

  persist: {
    key: 'ai-chat-history',
    storage: localStorage
  },
})