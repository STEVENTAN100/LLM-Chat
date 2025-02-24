import { defineStore } from 'pinia'

// 定义模型选项类型
interface ModelOption {
    label: string
    value: string
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
    },

    // 配置持久化选项
    persist: {
        // 存储键名
        key: 'ai-chat-settings',
        // 存储方式，这里使用的是 localStorage
        storage: localStorage,
    },


})

// 导出模型选项供其他组件使用
export const modelOptions: ModelOption[] = [
    { label: 'DeepSeek-V3', value: 'deepseek-ai/DeepSeek-V3' },
    { label: 'DeepSeek-R1', value: 'deepseek-ai/DeepSeek-R1' },
    { label: 'DeepSeek-Janus-Pro-7B', value: 'deepseek-ai/Janus-Pro-7B' },
    { label: 'Qwen2.5-7B', value: 'Qwen/Qwen2.5-7B-Instruct' },
    { label: 'Qwen2.5-Coder-7B', value: 'Qwen/Qwen2.5-Coder-7B-Instruct' },
    { label: 'Qwen2-VL-72B', value: 'Qwen/Qwen2-VL-72B-Instruct' },
    { label: 'Meta-Llama-3.1-8B', value: 'meta-llama/Meta-Llama-3.1-8B-Instruct' },
]