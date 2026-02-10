import { ref } from 'vue'

export type AIProvider = 'ollama' | 'deepseek' | 'openai'

export interface UseAIOptions {
  baseUrl: string
  model: string
  apiKey?: string
  provider?: AIProvider // 默认为 'ollama'
  systemPrompt?: string
}

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export function useAI(options: UseAIOptions) {
  const { baseUrl, model, apiKey, provider = 'ollama', systemPrompt } = options

  const messages = ref<Message[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 初始化系统提示词
  if (systemPrompt) {
    messages.value.push({ role: 'system', content: systemPrompt })
  }

  // 统一的请求构建
  const createRequest = () => {
    let url = baseUrl
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    let body: any = {
      model,
      stream: true,
    }

    // 根据 Provider 调整 URL 和 Body
    if (provider === 'ollama') {
      // Ollama 原生 API
      if (!url.endsWith('/api/chat')) {
        url = url.replace(/\/+$/, '') + '/api/chat'
      }
      body.messages = messages.value
    } else {
      // OpenAI / DeepSeek 标准 API
      if (!url.endsWith('/chat/completions')) {
        url = url.replace(/\/+$/, '') + '/chat/completions'
      }
      headers['Authorization'] = `Bearer ${apiKey}`
      body.messages = messages.value
    }

    return { url, headers, body }
  }

  // 统一的流解析逻辑
  const parseLine = (line: string): string | null => {
    try {
      if (!line.trim()) return null

      if (provider === 'ollama') {
        // Ollama JSON Stream 格式
        const data = JSON.parse(line)
        return data.message?.content || null
      } else {
        // OpenAI / DeepSeek SSE 格式
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim()
          if (jsonStr === '[DONE]') return null
          const data = JSON.parse(jsonStr)
          return data.choices?.[0]?.delta?.content || null
        }
      }
    } catch (e) {
      console.warn('解析流数据失败:', line)
    }
    return null
  }

  const chatStream = async (userMessage: string, onChunk?: (chunk: string) => void) => {
    isLoading.value = true
    error.value = null

    // 添加用户消息
    messages.value.push({ role: 'user', content: userMessage })

    // 创建助手消息占位
    const assistantMsg = { role: 'assistant', content: '' } as Message
    messages.value.push(assistantMsg)

    try {
      const { url, headers, body } = createRequest()

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })

      if (!response.ok) throw new Error(`HTTP ${response.status} - ${response.statusText}`)
      if (!response.body) throw new Error('Response body is empty')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          const content = parseLine(line)
          if (content) {
            assistantMsg.content += content
            // 触发 Vue 更新
            messages.value = [...messages.value]
            if (onChunk) onChunk(content)
          }
        }
      }
    } catch (err: any) {
      error.value = err.message || '请求失败'
      // 如果出错且没有生成任何内容，移除助手消息
      if (!assistantMsg.content) {
        messages.value.pop()
      }
    } finally {
      isLoading.value = false
    }
  }

  const clearHistory = () => {
    messages.value = []
    if (systemPrompt) {
      messages.value.push({ role: 'system', content: systemPrompt })
    }
  }

  return {
    messages,
    isLoading,
    error,
    chatStream,
    clearHistory
  }
}
