import { defineStore } from 'pinia'
import { computed } from 'vue'

// 定义模型选项类型
export interface ModelOption {
    label: string
    value: string
    // 大模型类型：可选普通对话模型，视觉输入，文生图模型
    type: 'plain' | 'visual' | 'text2img'
}

// 定义设置状态接口
interface SettingsState {
    isDarkMode: boolean
    temperature: number
    maxTokens: number
    model: string
    apiKey: string
    streamResponse: boolean
    topP: number
    topK: number
    customModels: ModelOption[]
    frequencyPenalty: number
}

// 定义一个名为 'settings' 的 store
export const useSettingsStore = defineStore('settings', {
    // 定义 store 的状态
    state: (): SettingsState => ({
        isDarkMode: false,
        temperature: 0.7,
        maxTokens: 1000,
        model: 'DeepSeek-V3',
        apiKey: '',
        streamResponse: true,
        topP: 0.7,
        topK: 50,
        customModels: [],
        frequencyPenalty: 0
    }),

    // 定义 store 的动作
    actions: {
        toggleDarkMode(): void {
            this.isDarkMode = !this.isDarkMode
            // 根据当前的深色模式状态设置 HTML 元素的 data-theme 属性
            document.documentElement.setAttribute('data-theme', this.isDarkMode ? 'dark' : 'light')
        },

        updateSettings(settings: Partial<SettingsState>): void {
            // 使用 Object.assign 方法将传入的设置对象合并到当前 store 的状态中
            Object.assign(this.$state, settings)
        },

        addCustomModel(model: ModelOption): void {
            this.customModels.push(model)
        },

        removeCustomModel(value: string): void {
            const index = this.customModels.findIndex(m => m.value === value)
            if (index !== -1) {
                this.customModels.splice(index, 1)
            }
        },

        editCustomModel(value: string, updatedModel: ModelOption): void {
            const index = this.customModels.findIndex(m => m.value === value)
            if (index !== -1) {
                this.customModels[index] = updatedModel
            }
        }
    },

    // 配置持久化选项
    persist: {
        // 存储键名
        key: 'ai-chat-settings',
        // 存储方式，这里使用的是 localStorage
        storage: localStorage,
    },
})

// 将 modelOptions 改为 computed 属性
export const useModelOptions = () => {
    const store = useSettingsStore()
    return computed(() => [
        ...defaultModelOptions,
        ...store.customModels
    ])
}

// 默认模型选项
export const defaultModelOptions: ModelOption[] = [
    { label: 'DeepSeek-V3', value: 'deepseek-ai/DeepSeek-V3', type: 'plain' },
    { label: 'DeepSeek-R1', value: 'deepseek-ai/DeepSeek-R1', type: 'plain' },
    { label: 'FLUX.1-dev', value: 'black-forest-labs/FLUX.1-dev', type: 'text2img' },
    { label: 'Qwen2.5-7B', value: 'Qwen/Qwen2.5-7B-Instruct', type: 'plain' },
    { label: 'Qwen2.5-Coder-7B', value: 'Qwen/Qwen2.5-Coder-7B-Instruct', type: 'plain' },
    { label: 'Qwen2-VL-72B', value: 'Qwen/Qwen2-VL-72B-Instruct', type: 'visual' },
    { label: 'QVQ-72B-Preview', value: 'Qwen/QVQ-72B-Preview', type: 'visual' },
]