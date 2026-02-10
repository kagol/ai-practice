import { useAI } from './useAI'

export function useOllama() {
  const BASE_URL = 'http://localhost:11434'
  const MODEL = 'deepseek-r1:7b' // 你可以根据需要修改默认模型

  return useAI({
    baseUrl: BASE_URL,
    model: MODEL,
    provider: 'ollama'
  })
}
