import { defineStore } from 'pinia'


// 定义消息类型
interface Message {
  id: number
  timestamp: string
  role: 'user' | 'assistant'
  content: string
  reasoning_content?: string
  hasImage?: boolean
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

// 定义会话类型
interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
  tokenCount: TokenCount
}

// 定义Store的状态类型
interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null  // 当前展示会话ID
  isLoading: boolean
  currentGeneratingId: string | null  // 当前正在生成回答的会话ID
  conversationCounter: number  // 会话计数器
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    conversations: [],
    activeConversationId: null,
    isLoading: false,
    currentGeneratingId: null,
    conversationCounter: 0  
  }),

  actions: {
    // 创建新会话
    createConversation() {
      this.conversationCounter++
      const conversation: Conversation = {
        id: Date.now().toString(),
        title: `新会话 ${this.conversationCounter}`,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tokenCount: {
          total: 0,
          prompt: 0,
          completion: 0
        }
      }
      this.conversations.push(conversation)
      this.activeConversationId = conversation.id
      return conversation.id
    },

    // 切换当前会话
    setActiveConversation(id: string) {
      this.activeConversationId = id
    },

    // 删除会话
    deleteConversation(id: string) {
      const index = this.conversations.findIndex(conv => conv.id === id)
      if (index !== -1) {
        this.conversations.splice(index, 1)
        if (this.activeConversationId === id) {
          // 如果删除后没有会话，则创建新会话
          if (this.conversations.length === 0) {
            this.createConversation()
          } else {
            // 否则切换到第一个会话
            this.activeConversationId = this.conversations[0]?.id || null
          }
        }
      }
    },

    // 添加消息到当前会话
    addMessage(message: Omit<Message, 'id' | 'timestamp'>) {
      const conversation = this.conversations.find(
        conv => conv.id === this.activeConversationId
      )
      if (conversation) {
        conversation.messages.push({
          id: Date.now(),
          timestamp: new Date().toISOString(),
          ...message
        })
        conversation.updatedAt = new Date().toISOString()
      }
    },

    // 更新正在生成回答的会话的最后一条消息
    updateLastMessage(content: string, reasoning_content?: string) {
      console.log('更新正在生成回答的会话的最后一条消息')
      const conversation = this.conversations.find(
        conv => conv.id === this.currentGeneratingId
      )
      if (conversation && conversation.messages && conversation.messages.length > 0) {
        const lastMessage = conversation.messages[conversation.messages.length - 1]
        if (lastMessage) {
          lastMessage.content = content
          lastMessage.reasoning_content = reasoning_content
          conversation.updatedAt = new Date().toISOString()
        }
      }
    },

    updateTokenCount(usage: TokenUsage) {
      const conversation = this.conversations.find(
        conv => conv.id === this.activeConversationId
      )
      if (conversation) {
        if (usage.prompt_tokens) {
          conversation.tokenCount.prompt += usage.prompt_tokens
        }
        if (usage.completion_tokens) {
          conversation.tokenCount.completion += usage.completion_tokens
        }
        if (usage.total_tokens) {
          conversation.tokenCount.total += usage.total_tokens
        }
      }
    },

    // 清空当前会话消息
    clearMessages() {
      const conversation = this.conversations.find(
        conv => conv.id === this.activeConversationId
      )
      if (conversation) {
        // 清空消息的同时更新会话时间
        conversation.messages = []
        conversation.updatedAt = new Date().toISOString()
        
        // 确保会话标题保持不变
        if (!conversation.title) {
          conversation.title = '新对话'
        }
        conversation.tokenCount = {
          total: 0,
          prompt: 0,
          completion: 0
        }
      }
      
      // 触发状态更新
      this.conversations = [...this.conversations]
    }
  },

  getters: {
    // 获取当前会话
    currentConversation(): Conversation | undefined {
      return this.conversations.find(conv => conv.id === this.activeConversationId)
    },
    
    // 获取当前会话的消息
    currentMessages(): Message[] {
      return this.currentConversation?.messages || []
    },

    // 获取当前会话的 token 统计
    currentTokenCount(): { total: number; prompt: number; completion: number } {
      const conversation = this.currentConversation
      if (!conversation) {
        return { total: 0, prompt: 0, completion: 0 }
      }
      return conversation.tokenCount
    }
  },

  persist: {
    key: 'ai-chat-history',
    storage: localStorage
  },
})