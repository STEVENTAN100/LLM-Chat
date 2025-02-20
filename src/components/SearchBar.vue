<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { Search, ChatRound } from '@element-plus/icons-vue'
import { useChatStore } from '../stores/chat'
import { chatApi } from '../utils/api'
import { messageHandler } from '../utils/messageHandler'


// 从 store 获取聊天历史
const chatStore = useChatStore()

const search = ref("")
const show = ref(false)
const isAsking = ref(false)
const streamResponse = ref("")
const searchInput = ref<InstanceType<typeof HTMLInputElement> | null>(null)

// 计算属性：根据搜索关键词过滤历史记录
const filteredHistory = computed(() => {
  if (!search.value) return []
  
  // 从当前活跃对话中搜索
  return chatStore.currentMessages
    .filter(msg => msg.role === 'user' && 
      msg.content.toLowerCase().includes(search.value.toLowerCase()))
    .map(msg => ({
      content: msg.content,
      id: msg.id
    }))
    .slice(0, 5)
})

// 处理搜索
const handleSearch = (e: Event) => {
  e.preventDefault()
  if (!search.value.trim() && !streamResponse.value) {
    show.value = false // 搜索框为空且没有AI回答时关闭下拉框
    return
  }
  show.value = true
}

// 处理点击搜索框
const handleSearchClick = (e: Event) => {
  e.stopPropagation()
  if (!search.value.trim() && !streamResponse.value) return // 搜索框为空且没有AI回答时不显示下拉框
  show.value = !show.value
}

// 处理点击搜索项
const handleSelect = (item: { content: string; id: number }) => {
  search.value = item.content
  show.value = false
  
  // 查找并滚动到对应消息
  nextTick(() => {
    const messageElement = document.querySelector(`[data-message-id="${item.id}"]`)
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth' })
      // 添加临时高亮效果
      messageElement.classList.add('highlight')
      setTimeout(() => {
        messageElement.classList.remove('highlight')
      }, 2000)
    }
  })
}

// 处理提问
const handleAsk = async () => {
  if (!search.value.trim() || isAsking.value) return
  
  // 无论是否有搜索结果，都显示对话框
  show.value = true
  isAsking.value = true
  streamResponse.value = ""
  
  try {
    const response = await chatApi.sendMessage([
      { role: 'user', content: search.value }
    ], true)
    
    await messageHandler.processStreamResponse(response as Response, {
      updateMessage: (content) => {
        show.value = true // 确保在更新内容时对话框保持显示
        streamResponse.value = content
      },
      updateTokenCount: () => {}
    })
    
  } catch (error) {
    console.error('提问失败:', error)
    streamResponse.value = '抱歉，发生了错误，请稍后重试。'
  } finally {
    isAsking.value = false
  }
}

// 点击外部关闭下拉框
document.documentElement.addEventListener('click', (e) => {
  const target = e.target as HTMLElement
  // 如果点击的是搜索框、对话框或提问按钮，不关闭
  if (target.closest('.search-container') || target.closest('.ask-button')) return
  
  // 只隐藏下拉框，不清除回答内容
  show.value = false
})

// 处理快捷键
const handleShortcut = (e: KeyboardEvent) => {
  // 检查是否按下 Ctrl+K (Windows) 或 Cmd+K (Mac)
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault() // 阻止默认行为
    searchInput.value?.focus() // 聚焦搜索框
    show.value = true // 显示下拉框
  }
}

// 组件挂载时添加事件监听
onMounted(() => {
  document.addEventListener('keydown', handleShortcut)
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('keydown', handleShortcut)
})

// 监听搜索内容变化
watch(search, (newValue, oldValue) => {
  if (newValue !== oldValue) {
    streamResponse.value = "" // 清空 AI 回答
  }
})
</script>

<template>
  <div class="search-container">
    <el-form class="search-form" @submit.prevent>
      <el-form-item>
        <el-input 
          ref="searchInput"
          v-model="search"
          placeholder="搜索历史问题 (Ctrl+K)" 
          :prefix-icon="Search"
          @click="handleSearchClick"
          @keyup.enter="handleSearch"
        >
          <template #append>
            <el-button 
              type="primary"
              :icon="ChatRound"
              :loading="isAsking"
              @click="handleAsk"
              title="向 AI 提问"
              class="ask-button custom-primary"
            />
          </template>
        </el-input>
      </el-form-item>
    </el-form>
    
    <ul v-show="show && (filteredHistory.length > 0 || streamResponse)" 
        class="dropdown-list">
      <li v-if="streamResponse" class="preview-item">
        <div class="flex items-start gap-2">
          <el-avatar 
            :icon="ChatRound"
            class="assistant-avatar"
            :size="24"
          />
          <div class="preview-content">{{ streamResponse }}</div>
        </div>
      </li>
      <div v-if="streamResponse && filteredHistory.length > 0" class="divider" />
      
      <template v-for="(item, index) in filteredHistory" :key="item.id">
        <li class="search-item" @click="handleSelect(item)">
          <span class="text-sm">{{ item.content }}</span>
        </li>
        <div v-if="index < filteredHistory.length - 1" class="divider" />
      </template>
    </ul>
  </div>
</template>

<style scoped>
.search-container {
  position: relative;
  width: 100%;
  max-width: 320px; /* 缩小最大宽度 */
}

.search-form {
  width: 100%;
}

.dropdown-list {
  position: absolute;
  margin: 0;
  padding: 0.5rem 0;
  list-style: none;
  background: white;
  border-radius: 0.375rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  width: 100%; /* 使用相对宽度 */
  max-height: 300px;
  overflow-y: auto;
  z-index: 10;
}

.search-item {
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.search-item:hover {
  background-color: var(--bg-color-secondary);
}

.preview-item {
  padding: 0.75rem 1rem;
  background-color: var(--bg-color-secondary);
}

.preview-content {
  flex: 1;
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.assistant-avatar {
  background-color: var(--success-color);
}

.divider {
  height: 1px;
  background-color: #eee;
}

:deep(.el-input-group__append) {
  padding: 0;
  border: none;
  background: none;
}

:deep(.ask-button.custom-primary) {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  margin: -1px -1px -1px 0;
  height: calc(100% + 2px);
  background-color: #409EFF !important;
  border-color: #409EFF !important;
  color: white !important;
}

:deep(.ask-button.custom-primary:hover) {
  background-color: #66b1ff !important;
  border-color: #66b1ff !important;
  color: white !important;
}

:deep(.ask-button.custom-primary:active) {
  background-color: #3a8ee6 !important;
  border-color: #3a8ee6 !important;
  color: white !important;
}

:deep(.highlight) {
  background-color: rgba(255, 255, 0, 0.2);
  transition: background-color 0.5s ease;
}
</style>
