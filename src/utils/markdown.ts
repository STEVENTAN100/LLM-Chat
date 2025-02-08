import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

// 创建 markdown-it 实例
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        const highlighted = hljs.highlight(str, { 
          language: lang, 
          ignoreIllegals: true 
        }).value
        // 添加行号和语言标识
        return `<pre class="hljs"><div class="code-header">
          <span class="code-lang">${lang}</span>
        </div><code class="${lang}">${highlighted}</code></pre>`
      } catch (error) {
        // 发生错误时返回转义后的代码
        console.error(error)
        return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
      }
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
  }
})

// 导出渲染函数
export const renderMarkdown = (content: string): string => {
  return md.render(content)
} 