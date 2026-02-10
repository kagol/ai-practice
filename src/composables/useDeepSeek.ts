import { useAI } from './useAI'

export function useDeepSeek() {
  const BASE_URL = 'https://api.deepseek.com'
  const MODEL = 'deepseek-chat'
  const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY

  return useAI({
    baseUrl: BASE_URL,
    model: MODEL,
    apiKey: API_KEY,
    provider: 'deepseek'
  })
}
