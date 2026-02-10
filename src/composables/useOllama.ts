import { ref } from 'vue'
import ollama from 'ollama' // 如不用 SDK，可删除此行

export function useOllama() {
  const messages = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  
  // 配置（可根据需要改为 props 或环境变量）
  const OLLAMA_BASE_URL = 'http://localhost:11434'
  const MODEL = 'deepseek-r1:7b' // 'llama3.1' // 或 'qwen2.5:7b' 等你已下载的模型

  // 非流式调用（简单问答）
  const chat = async (userMessage) => {
    isLoading.value = true
    error.value = null
    
    // 添加用户消息到历史
    messages.value.push({ role: 'user', content: userMessage })
    
    try {
      // 方案 A：使用 ollama-js SDK
      const response = await ollama.chat({
        model: MODEL,
        messages: messages.value,
        stream: false
      })
      
      const assistantMessage = response.message.content
      messages.value.push({ role: 'assistant', content: assistantMessage })
      
      return assistantMessage
      
    } catch (err) {
      error.value = err.message
      console.error('Ollama 调用失败:', err)
    } finally {
      isLoading.value = false
    }
  }

  // 流式调用（打字机效果，推荐）
  const chatStream = async (userMessage, onChunk) => {
    isLoading.value = true
    error.value = null
    
    messages.value.push({ role: 'user', content: userMessage })
    
    // 创建一个空的助手消息占位（用于流式更新）
    const assistantMsg = { role: 'assistant', content: '' }
    messages.value.push(assistantMsg)
    
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          messages: messages.value.slice(0, -1), // 排除空的 assistant 消息
          stream: true
        })
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.trim())
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            if (data.message?.content) {
              assistantMsg.content += data.message.content
              // 触发 Vue 响应式更新
              messages.value = [...messages.value]
              // 外部回调（用于自动滚动等）
              if (onChunk) onChunk(data.message.content)
            }
          } catch (e) {
            console.error('解析流数据失败:', line)
          }
        }
      }
      
    } catch (err) {
      error.value = err.message
      // 移除失败的助手消息
      messages.value.pop()
    } finally {
      isLoading.value = false
    }
  }

  // 清空对话
  const clearHistory = () => {
    messages.value = []
  }

  return {
    messages,
    isLoading,
    error,
    chat,
    chatStream,
    clearHistory
  }
}
