import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import katex from 'katex'
import 'highlight.js/styles/github.css'
import 'katex/dist/katex.min.css'

// 创建 markdown-it 实例
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  // breaks: false,        
  // xhtmlOut: false,      
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

// 移除列表项标签中的换行
md.renderer.rules.list_item_open = () => '<li>';

// 移除列表项之间的空白，确保结束标签紧跟内容
md.renderer.rules.list_item_close = () => '</li>';

// 移除无序列表标签中的空白
md.renderer.rules.bullet_list_open = () => '<ul>';

// 移除无序列表之间的空白
md.renderer.rules.bullet_list_close = () => '</ul>';

// 移除有序列表标签中的空白
md.renderer.rules.ordered_list_open = () => '<ol>';

// 移除有序列表之间的空白
md.renderer.rules.ordered_list_close = () => '</ol>';

// 添加 LaTeX 支持
const renderLatex = (tex: string, displayMode: boolean): string => {
  try {
    return katex.renderToString(tex, {
      displayMode: displayMode,
      throwOnError: false,
      output: 'html'
    })
  } catch (error) {
    console.error('LaTeX 渲染错误:', error)
    return tex
  }
}

// 定义公式格式正则表达式
const INLINE_MATH_RULES = [
  /\$([^$]+)\$/,           // $...$
  /\[([^\]]+)\]/,         // [...]
  /\\\((.*?)\\\)/,        // \(...\)
  /\$(.*?)\$/,             // $...$（单行）
  /\\\[([\s\S]+?)\\\]/    // \[...\]
]

const BLOCK_MATH_RULES = [
  /\$\$([\s\S]+?)\$\$/,   // $$...$$
  /\\\[([\s\S]+?)\\\]/    // \[...\]
]

// 添加行内公式支持
md.inline.ruler.before('escape', 'math_inline', (state, silent) => {
  const content = state.src.slice(state.pos)
  
  for (const rule of INLINE_MATH_RULES) {
    const match = content.match(rule)
    if (match && match.index === 0) {
      if (!silent) {
        const token = state.push('math_inline', '', 0)
        token.content = match[1].trim()
        token.markup = match[0][0] // 保存公式的起始标记
      }
      state.pos += match[0].length
      return true
    }
  }
  return false
})

// 添加块级公式支持
md.block.ruler.before('paragraph', 'math_block', (state, startLine, _endLine, silent) => {
  const content = state.src.slice(state.bMarks[startLine] + state.tShift[startLine])
  
  for (const rule of BLOCK_MATH_RULES) {
    const match = content.match(rule)
    if (match && match.index === 0) {
      if (!silent) {
        const token = state.push('math_block', '', 0)
        token.content = match[1].trim()
        token.markup = match[0].slice(0, 2) // 保存公式的起始标记
        token.map = [startLine, startLine + match[0].split('\n').length]
      }
      state.line = startLine + match[0].split('\n').length
      return true
    }
  }
  return false
})

// 渲染规则
md.renderer.rules.math_inline = (tokens, idx) => {
  return renderLatex(tokens[idx].content, false)
}

md.renderer.rules.math_block = (tokens, idx) => {
  return renderLatex(tokens[idx].content, true)
}

// 导出渲染函数
export const renderMarkdown = (content: string): string => {
  return md.render(content)
} 