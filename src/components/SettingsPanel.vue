<script setup lang="ts">
import { reactive, computed, ref } from 'vue'
import { useSettingsStore, useModelOptions, type ModelOption } from '../stores/settings.ts'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete, Plus, InfoFilled } from '@element-plus/icons-vue'
import { ElTooltip } from 'element-plus'

// 定义组件的props
const props = defineProps({
  modelValue: Boolean
})

// 定义组件的emits
const emit = defineEmits(['update:modelValue'])

// 使用设置存储
const settingsStore = useSettingsStore()
const modelOptions = useModelOptions()

// 可见性计算属性，同步抽屉的可见性状态
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 设置对象，使用reactive进行响应式处理
const settings = reactive({
  isDarkMode: settingsStore.isDarkMode,
  model: settingsStore.model,
  temperature: settingsStore.temperature,
  maxTokens: settingsStore.maxTokens,
  apiKey: settingsStore.apiKey,
  streamResponse: settingsStore.streamResponse,
  topP: settingsStore.topP,
  topK: settingsStore.topK,
  frequencyPenalty: settingsStore.frequencyPenalty
})

// 新增：控制添加/编辑模型对话框的显示
const modelDialogVisible = ref(false)
const isEditing = ref(false)
const currentModel = ref<ModelOption>({
  label: '',
  value: '',
  type: 'plain'
})
const originalModelValue = ref('')

// 检查模型value是否重复
const checkModelValueExists = (value: string, excludeValue?: string) => {
  // 检查是否与默认模型重复
  const defaultModelExists = modelOptions.value
    .filter(model => !settingsStore.customModels.includes(model))
    .some(model => model.value === value)
  
  if (defaultModelExists) {
    return '模型标识与默认模型重复'
  }

  // 检查是否与其他自定义模型重复(排除当前编辑的模型)
  const customModelExists = settingsStore.customModels
    .some(model => model.value === value && model.value !== excludeValue)
  
  if (customModelExists) {
    return '模型标识已存在'
  }

  return ''
}

// 处理深色模式切换
const handleDarkModeChange = () => {
  settingsStore.toggleDarkMode()
}

// 保存设置
const handleSave = () => {
  settingsStore.updateSettings(settings)
  ElMessage.success('设置已保存')
  visible.value = false
}

// 打开添加模型对话框
const showAddModelDialog = () => {
  isEditing.value = false
  currentModel.value = {
    label: '',
    value: '',
    type: 'plain'
  }
  modelDialogVisible.value = true
}

// 打开编辑模型对话框
const showEditModelDialog = (model: ModelOption) => {
  isEditing.value = true
  currentModel.value = { ...model }
  originalModelValue.value = model.value
  modelDialogVisible.value = true
}

// 保存模型
const handleSaveModel = () => {
  if (!currentModel.value.label || !currentModel.value.value) {
    ElMessage.warning('请填写完整的模型信息')
    return
  }

  // 检查value值是否重复
  const errorMsg = checkModelValueExists(
    currentModel.value.value, 
    isEditing.value ? originalModelValue.value : undefined
  )
  
  if (errorMsg) {
    ElMessage.warning(errorMsg)
    return
  }

  if (isEditing.value) {
    settingsStore.editCustomModel(originalModelValue.value, currentModel.value)
    if (settings.model === originalModelValue.value) {
      settings.model = currentModel.value.value
    }
  } else {
    settingsStore.addCustomModel(currentModel.value)
  }

  modelDialogVisible.value = false
  ElMessage.success(isEditing.value ? '模型已更新' : '模型已添加')
}

// 删除模型
const handleDeleteModel = async (model: ModelOption) => {
  try {
    await ElMessageBox.confirm('确定要删除这个模型吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    // 删除模型
    settingsStore.removeCustomModel(model.value)
    
    // 如果删除的是当前选中的模型,切换到默认模型
    if (settings.model === model.value) {
      // 获取第一个非自定义模型作为默认模型
      const defaultModel = modelOptions.value.find(m => !settingsStore.customModels.includes(m))
      if (defaultModel) {
        settings.model = defaultModel.value
      }
    }
    
    ElMessage.success('模型已删除')
  } catch {
    // 用户取消删除
  }
}

// 获取模型类型标签文字
const getModelTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    'plain': '普通',
    'visual': '视觉',
    'text2img': '文生图'
  }
  return typeMap[type] || type
}

// 获取标签类型
const getModelTagType = (type: string) => {
  const typeMap: Record<string, '' | 'success' | 'warning' | 'info'> = {
    'plain': '',
    'visual': 'success',
    'text2img': 'warning'
  }
  return typeMap[type] || 'info'
}
</script>

<template>
  <!-- 设置抽屉组件，用于展示和编辑应用设置 -->
  <el-drawer style="background-color: var(--bg-color);" v-model="visible" title="设置" direction="rtl" size="380px">
    <div class="settings-container">
      <!-- 使用element-plus的表单组件来展示和编辑设置 -->
      <el-form :model="settings" label-width="120px">
        <!-- 深色模式切换 -->
        <el-form-item label="深色模式">
          <el-switch v-model="settings.isDarkMode" @change="handleDarkModeChange" />
        </el-form-item>

        <!-- 模型选择 -->
        <el-form-item label="模型">
          <div class="model-selection">
            <el-select 
              v-model="settings.model" 
              class="w-full"
              :popper-class="'model-select-dropdown'"
            >
              <el-option
                v-for="model in modelOptions"
                :key="model.value"
                :label="`${getModelTypeLabel(model.type)} | ${model.label}`"
                :value="model.value"
              >
                <div class="model-option">
                  <div class="model-info">
                    <el-tag 
                      size="small" 
                      :type="getModelTagType(model.type)"
                      class="model-type-tag"
                    >
                      {{ getModelTypeLabel(model.type) }}
                    </el-tag>
                    <span>{{ model.label }}</span>
                  </div>
                  <div v-if="settingsStore.customModels.includes(model)" class="model-actions">
                    <el-button link type="primary" @click.stop="showEditModelDialog(model)">
                      <el-icon><Edit /></el-icon>
                    </el-button>
                    <el-button link type="danger" @click.stop="handleDeleteModel(model)">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>
              </el-option>
            </el-select>
          </div>
          <div class="add-model-button">
            <el-button type="primary" link @click="showAddModelDialog">
              <el-icon><Plus /></el-icon>
              添加模型
            </el-button>
          </div>
        </el-form-item>

        <!-- Temperature设置 -->
        <el-form-item label="Temperature">
          <el-slider v-model="settings.temperature" :min="0" :max="1" :step="0.1" show-input />
        </el-form-item>

        <!-- 最大Token设置 -->
        <el-form-item label="最大Token">
          <el-input-number v-model="settings.maxTokens" :min="1" :max="4096" :step="1" />
        </el-form-item>

        <!-- API Key输入 -->
        <el-form-item label="API Key">
          <el-input v-model="settings.apiKey" type="password" show-password placeholder="请输入API Key" />
        </el-form-item>

        <!-- 流式响应切换 -->
        <el-form-item>
          <template #label>
            流式响应
            <el-tooltip
              content="开启后将实时显示AI回复"
              placement="top"
            >
              <el-icon class="info-icon"><InfoFilled /></el-icon>
            </el-tooltip>
          </template>
          <el-switch v-model="settings.streamResponse" />
        </el-form-item>

        <!-- Top P -->
        <el-form-item label="Top P">
          <el-slider v-model="settings.topP" :min="0" :max="1" :step="0.1" show-input />
        </el-form-item>

        <!-- Top K -->
        <el-form-item label="Top K">
          <el-input-number v-model="settings.topK" :min="1" :max="100" :step="1" />
        </el-form-item>

        <!-- Frequency Penalty -->
        <el-form-item>
          <template #label>
            重复惩罚
            <el-tooltip
              content="控制模型重复使用相同词语的倾向，值越大越不倾向重复"
              placement="top"
            >
              <el-icon class="info-icon"><InfoFilled /></el-icon>
            </el-tooltip>
          </template>
          <el-slider 
            v-model="settings.frequencyPenalty" 
            :min="-2" 
            :max="2" 
            :step="0.1" 
            show-input
          />
        </el-form-item>
      </el-form>

      <!-- 保存设置按钮 -->
      <div class="settings-footer">
        <el-button type="primary" @click="handleSave">保存设置</el-button>
      </div>
    </div>

    <!-- 添加/编辑模型对话框 -->
    <el-dialog
      :title="isEditing ? '编辑模型' : '添加模型'"
      v-model="modelDialogVisible"
      width="500px"
    >
      <el-form :model="currentModel" label-width="100px">
        <el-form-item label="模型名称">
          <el-input v-model="currentModel.label" placeholder="请输入模型名称" />
        </el-form-item>
        <el-form-item label="模型标识">
          <el-input v-model="currentModel.value" placeholder="请输入模型标识" />
        </el-form-item>
        <el-form-item label="模型类型">
          <el-select v-model="currentModel.type">
            <el-option label="普通对话" value="plain" />
            <el-option label="视觉模型" value="visual" />
            <el-option label="文生图" value="text2img" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="modelDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveModel">确定</el-button>
      </template>
    </el-dialog>
  </el-drawer>
</template>

<style lang="scss" scoped>
:deep(.model-select-dropdown) {
  .el-select-dropdown__item {
    padding: 0 12px;
  }
}

// 设置页面样式
.settings-container {
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

// 保存按钮布局
.settings-footer {
  margin-top: auto;
  padding-top: 1rem;
  text-align: right;
}

// 全宽样式，用于表单项
.w-full {
  width: 100%;
}

// 表单项提示样式
.form-item-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.model-selection {
  width: 100%;
}

.add-model-button {
  margin-top: 8px;
}

.model-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.model-actions {
  display: flex;
  gap: 4px;
}

.info-icon {
  margin-left: 4px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  cursor: help;
}

.model-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-type-tag {
  font-size: 12px;
  padding: 0 4px;
  height: 20px;
  line-height: 18px;
}
</style>