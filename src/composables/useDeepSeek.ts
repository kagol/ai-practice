import { ref } from 'vue'

export function useDeepSeek() {
  const messages = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  
  // 配置（可根据需要改为 props 或环境变量）
  const BASE_URL = 'https://api.deepseek.com'
  const MODEL = 'deepseek-chat'

  // 流式调用（打字机效果，推荐）
  const chatStream = async (userMessage, onChunk) => {
    isLoading.value = true
    error.value = null
    
    messages.value.push({ role: 'user', content: userMessage })
    
    // 创建一个空的助手消息占位（用于流式更新）
    const assistantMsg = { role: 'assistant', content: '' }
    messages.value.push(assistantMsg)
    
    try {
      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          "Authorization": "Bearer sk-3d85b98733e84db38133073e4b4d8b1d"
        },
        body: JSON.stringify({
          "model": MODEL,
          "messages": messages.value.slice(0, -1),
          "stream": true
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
          console.log('line', line);
          // 跳过空行或以 "data: " 开头的 SSE 格式行
          if (!line || line.startsWith('data: ')) {
            const jsonStr = line.replace(/^data: /, '');
            if (!jsonStr) continue; // 忽略心跳或空行
            try {
              const data = JSON.parse(jsonStr);
              console.log('data===', data);
              if (data?.choices?.[0]?.delta?.content) {
                assistantMsg.content += data.choices[0].delta.content;
                // 触发 Vue 响应式更新
                messages.value = [...messages.value];
                // 外部回调（用于自动滚动等）
                if (onChunk) onChunk(data.choices[0].delta.content);
              }
            } catch (e) {
              console.error('解析流数据失败:', jsonStr);
            }
          } else {
            // 如果不是 SSE 格式，直接尝试解析
            try {
              const data = JSON.parse(line);
              console.log('data===', data);
              if (data?.choices?.[0]?.delta?.content) {
                assistantMsg.content += data.choices[0].delta.content;
                messages.value = [...messages.value];
                if (onChunk) onChunk(data.choices[0].delta.content);
              }
            } catch (e) {
              console.error('解析流数据失败:', line);
            }
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
    chatStream,
    clearHistory
  }
}
