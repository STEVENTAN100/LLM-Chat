<script setup lang="ts">
import { ref, computed } from 'vue'
import { Fold, Expand, Plus, Delete, Edit } from '@element-plus/icons-vue'
import { useChatStore } from '../stores/chat'
import { ElMessageBox } from 'element-plus'

const isCollapsed = ref(false)
const chatStore = useChatStore()

const conversations = computed(() => chatStore.conversations)
const activeId = computed(() => chatStore.activeConversationId)

const editingId = ref<string | null>(null)
const editTitle = ref('')

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

const createNewChat = () => {
  chatStore.createConversation()
}

const switchConversation = (id: string) => {
  chatStore.setActiveConversation(id)
}

const deleteConversation = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这个会话吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    chatStore.deleteConversation(id)
  } catch {
    // 用户取消删除操作
  }
}

const startRename = (conv: { id: string, title: string }, event: Event) => {
  event.stopPropagation()
  editingId.value = conv.id
  editTitle.value = conv.title
}

const saveRename = (conv: { id: string }) => {
  if (editTitle.value.trim()) {
    const conversation = chatStore.conversations.find(c => c.id === conv.id)
    if (conversation) {
      conversation.title = editTitle.value.trim()
    }
  }
  editingId.value = null
}

const cancelRename = () => {
  editingId.value = null
}

const handleRenameKeydown = (conv: { id: string }, event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    saveRename(conv)
  } else if (event.key === 'Escape') {
    cancelRename()
  }
}
</script>

<template>
  <div class="sidebar" :class="{ 'collapsed': isCollapsed }">
    <div class="sidebar-header">
      <el-button v-if="!isCollapsed" type="primary" @click="createNewChat">
        <el-icon><Plus /></el-icon>新建会话
      </el-button>
      <el-button v-else circle type="primary" @click="createNewChat">
        <el-icon><Plus /></el-icon>
      </el-button>
    </div>

    <div class="conversations-list">
      <div v-for="conv in conversations" 
           :key="conv.id" 
           class="conversation-item"
           :class="{ 'active': conv.id === activeId }"
           @click="switchConversation(conv.id)">
        <div v-if="editingId === conv.id" class="conversation-edit" @click.stop>
          <el-input
            v-model="editTitle"
            size="small"
            @keydown="(e: KeyboardEvent) => handleRenameKeydown(conv, e)"
            @blur="saveRename(conv)"
            ref="editInputRef"
          />
        </div>
        <div v-else class="conversation-title" :title="conv.title">
          {{ isCollapsed ? '💭' : conv.title }}
        </div>
        <div v-if="!isCollapsed" class="conversation-actions">
          <el-button 
            class="edit-btn" 
            type="primary" 
            link
            @click.stop="startRename(conv, $event)">
            <el-icon><Edit /></el-icon>
          </el-button>
          <el-button 
            class="delete-btn" 
            type="danger" 
            link
            @click.stop="deleteConversation(conv.id)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <div class="collapse-btn" @click="toggleSidebar">
      <el-icon>
        <Fold v-if="!isCollapsed" />
        <Expand v-else />
      </el-icon>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.sidebar {
  width: 260px;
  height: 100%;
  flex-shrink: 0; /* 防止侧边栏被压缩 */
  background-color: var(--bg-color);
  border-right: 1px solid var(--border-color);
  transition: all 0.3s ease;
  position: relative;
  display: flex;
  flex-direction: column;
  
  &.collapsed {
    width: 60px;
  }
}

.sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.conversation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--bg-color-secondary);
    .conversation-actions {
      opacity: 1;
    }
  }

  &.active {
    background-color: var(--el-color-primary-light-9);
  }
}

.conversation-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-edit {
  flex: 1;
  margin-right: 0.5rem;
  
  :deep(.el-input__inner) {
    height: 24px;
    line-height: 24px;
  }
}

.conversation-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.edit-btn, .delete-btn {
  padding: 2px;
  height: 20px;
  
  .el-icon {
    font-size: 14px;
  }
}

.collapse-btn {
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 60%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1;

  &:hover {
    background-color: var(--bg-color-secondary);
  }
}
</style>