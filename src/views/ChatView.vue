<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Setting } from '@element-plus/icons-vue'
import { useChatStore } from '../stores/chat.ts'
import { useSettingsStore, useModelOptions } from '../stores/settings.ts'
import { chatApi } from '../utils/api.ts'
import { messageHandler, type SyncResponse } from '../utils/messageHandler.ts'
import ChatMessage from '../components/ChatMessage.vue'
import ChatInput from '../components/ChatInput.vue'
import SettingsPanel from '../components/SettingsPanel.vue'
import SideBar from '../components/SideBar.vue'
import SearchBar from '../components/SearchBar.vue'

// 初始化聊天存储
const chatStore = useChatStore()
// 计算属性，获取消息列表和加载状态
const currentChatMessages = computed(() => chatStore.currentMessages)
const isLoading = computed(() => chatStore.isLoading)
// 设置面板显示状态
const showSettings = ref(false)
// 消息容器引用，用于滚动到底部
const messagesContainer = ref<HTMLElement | null>(null)

// 如果没有活动会话，创建一个新会话
if (!chatStore.activeConversationId) {
  chatStore.createConversation()
}

// 监听消息、对话ID变化，滚动到底部
watch(currentChatMessages, () => {
    // 涉及到页面渲染，需要使用 nextTick
    nextTick(() => {
        if (messagesContainer.value && chatStore.activeConversationId === chatStore.currentGeneratingId) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
    })
}, { deep: true })

watch(() => chatStore.activeConversationId, () => {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
    })
})

// 将文本消息转换为VLM消息，text -> VLMContentItem[]
const convertTextToMessageContent = (text: string) => {
  const content = [];  // VLMContentItem[]
  const imageRegex = /!\[.*?\]\((data:image\/(png|jpg|jpeg);base64,[^)]+)\)/g;
  let match;
  let lastIndex = 0;
  let firstTextExtracted = false; // 添加一个标志变量，用于标记是否已提取了第一段文本

  while ((match = imageRegex.exec(text)) !== null) {
    const imageUrl = match[1];
    const imageStartIndex = match.index;

    // 提取图片前的文本，确保不是空白字符
    if (imageStartIndex > lastIndex && !firstTextExtracted) {
      firstTextExtracted = true;
      const textContent = text.substring(lastIndex, imageStartIndex).trim();
      if (textContent && !/^\s*$/.test(textContent)) {
        content.push({ type: "text" as const, text: textContent });
      }
    }

    // 提取image_url(data url)
    content.push({
      type: "image_url" as const,
      image_url: { url: imageUrl },
    });

    lastIndex = imageRegex.lastIndex;
  }

  // 若没有图片，则提取整个文本
  if (!firstTextExtracted) {
    content.push({ type: "text" as const, text: text });
  }

  return content;
}

// 将普通消息列表转换为VLM消息列表
const createVLMMessage = () => {
  // 获取当前会话的所有消息
  return currentChatMessages.value.map(message => {
    // 将每条消息转换为VLM格式
    const content = !message.hasImage ? [{ type: "text" as const, text: message.content }] : convertTextToMessageContent(message.content);
    return {
      role: message.role,
      content: content
    };
  });
}

/**
 * 发送消息处理函数
 * @param {string} content 用户输入的消息内容
 */
const handleSend = async (content: string) => {
    console.log('发送消息', content)

    // if (isLoading.value) return
    // 添加用户消息和助理的空消息
    chatStore.addMessage(messageHandler.formatMessage('user', content))
    chatStore.addMessage(messageHandler.formatMessage('assistant', ''))
    chatStore.isLoading = true
    // 将当前正在生成回复的对话ID设置为活跃对话的ID
    // 这样可以追踪哪个对话正在等待AI响应
    chatStore.currentGeneratingId = chatStore.activeConversationId

    try {
        // 获取设置并发送消息
        const settingsStore = useSettingsStore()
        const modelOptions = useModelOptions()
        const modelOption = modelOptions.value.find(m => m.value === settingsStore.model)
        let response: Response | SyncResponse
        
        if (modelOption?.type === 'visual'){
            response = await chatApi.sendMessage(createVLMMessage().slice(0, -1), settingsStore.streamResponse)
        } else {
            response = await chatApi.sendMessage(
                currentChatMessages.value.slice(0, -1).map(m => ({
                    role: m.role,
                    content: m.content
                })),
                settingsStore.streamResponse
            )
        }

        // 处理流式响应或同步响应
        if (settingsStore.streamResponse) {
            // 流式处理，并更新消息和token计数
            await messageHandler.processStreamResponse(response as Response, {
                updateMessage: (content, reasoning_content) => chatStore.updateLastMessage(content, reasoning_content),
                updateTokenCount: (usage) => chatStore.updateTokenCount(usage)
            });
        } else {
            // 同步处理，并更新消息和token计数
            const result = await messageHandler.processSyncResponse(response as SyncResponse, (content, reasoning_content) => {
                chatStore.updateLastMessage(content, reasoning_content)
            });
            if (result.usage) {
                chatStore.updateTokenCount(result.usage)
            }
        }
    } catch (error) {
        console.error('发送消息失败:', error)
        chatStore.updateLastMessage('抱歉，发生了错误，请稍后重试。', '')
    } finally {
        // 重置正在生成回复的对话ID为null,表示当前没有对话在等待AI响应
        chatStore.currentGeneratingId = null
        chatStore.isLoading = false
    }

}

/**
 * 清除消息处理函数
 */
const handleClear = () => {
    chatStore.clearMessages()
}

// 处理消息更新
const handleMessageUpdate = async (updatedMessage: { id: number; content: string }) => {

    const index = chatStore.currentMessages.findIndex(m => m.id === updatedMessage.id)
    if (index !== -1) {
        // 删除当前消息及其后的助手回复
        chatStore.currentMessages.splice(index, 2)
        // 重新发送更新后的消息
        await handleSend(updatedMessage.content)
    }
}

// 处理消息删除
const handleMessageDelete = (message: { id: number }) => {
    const index = chatStore.currentMessages.findIndex(m => m.id === message.id)
    if (index !== -1) {
        // 删除该消息及其后的助手回复
        chatStore.currentMessages.splice(index, 2)
    }
}
// 处理重新生成
const handleRegenerate = async (message: { id: number; timestamp: string; role: "user" | "assistant"; content: string; reasoning_content: string }) => {
    console.log(message)
    console.log(chatStore.currentMessages)

    const index = chatStore.currentMessages.findIndex(m => m.id === message.id && m.role === "assistant")
    console.log(index)
    if (index !== -1 && index > 0) {
        // 获取上一条用户消息
        const userMessage = chatStore.currentMessages[index - 1]
        // 删除当前的AI回复,但是删了后再发送的时候，userMessage不会指向当前这个
        chatStore.currentMessages.splice(index - 1, 2)
        // 重新发送请求前应该检查 isLoading 状态
        if (isLoading.value) return

        chatStore.isLoading = true
        try {
            console.log(userMessage.content)
            // 重新发送请求
            await handleSend(userMessage.content)
        } catch (error) {
            console.error('重新生成失败:', error)
            // 恢复原来的消息
            chatStore.currentMessages.splice(index, 0, message)
        } finally {
            chatStore.isLoading = false
        }
    }
}

// 添加暂停处理函数
const handleStop = () => {
    // 中止当前的请求
    chatApi.abortRequest()
    // 重置状态
    chatStore.currentGeneratingId = null
    chatStore.isLoading = false
}
</script>

<template>
    <div class="app-container">
        <!-- 侧边栏 -->
        <side-bar />

        <!-- 聊天容器 -->
        <div class="chat-container">
            <!-- 聊天头部，包含标题和设置按钮 -->
            <div class="chat-header">
                <h1>LLM Chat</h1>
                <search-bar />
                <el-button circle :icon="Setting" @click="showSettings = true" />
            </div>

            <!-- 消息容器，显示对话消息 -->
            <div class="messages-container" ref="messagesContainer">
                <template v-if="currentChatMessages.length">
                    <chat-message v-for="message in currentChatMessages" :key="message.id" :message="message"
                        @update="handleMessageUpdate" @delete="handleMessageDelete"
                        @regenerate="handleRegenerate" />
                </template>
                <div v-else class="empty-state">
                    <el-empty description="开始对话吧" />
                </div>
            </div>

            <!-- 聊天输入框 -->
            <chat-input :loading="isLoading" :generating="chatStore.currentGeneratingId !== null"
                @send="handleSend" @clear="handleClear" @stop="handleStop" 
            />

            <!-- 设置面板 -->
            <settings-panel v-model="showSettings" />
        </div>
    </div>
</template>

<style lang="scss" scoped>
.app-container {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* 定义聊天容器的样式，占据整个视口高度，使用flex布局以支持列方向的布局 */
.chat-container {
    flex: 1;
    min-width: 0; /* 防止内容溢出 */
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden; /* 控制溢出 */
}

/* 设置聊天头部的样式，包括对齐方式和背景色等 */
.chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background-color: var(--bg-color);
    border-bottom: 1px solid var(--border-color);

    /* 设置聊天头部标题的样式，无默认间距，自定义字体大小和颜色 */
    h1 {
        margin: 0;
        font-size: 1.5rem;
        color: var(--text-color-primary);
    }
}

/* 定义消息容器的样式，占据剩余空间，支持滚动，自定义背景色 */
.messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    background-color: var(--bg-color-secondary);
}

/* 设置空状态时的样式，占据全部高度，居中对齐内容 */
.empty-state {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>