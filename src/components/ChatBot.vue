<template>
  <div class="chat-container">
    <div class="messages" ref="messageContainer">
      <div 
        v-for="(msg, index) in messages" 
        :key="index"
        :class="['message', msg.role]"
      >
        <div class="avatar">{{ msg.role === 'user' ? '👤' : '🤖' }}</div>
        <div class="content">{{ msg.content }}</div>
      </div>
      
      <div v-if="isLoading" class="loading">
        <span>思考中...</span>
      </div>
    </div>

    <div class="input-area">
      <textarea 
        v-model="inputMessage" 
        @keydown.enter.prevent="sendMessage"
        placeholder="输入消息...（Shift+Enter换行）"
        :disabled="isLoading"
        rows="3"
      />
      <button @click="sendMessage" :disabled="isLoading || !inputMessage.trim()">
        {{ isLoading ? '发送中...' : '发送' }}
      </button>
    </div>
    
    <div v-if="error" class="error">❌ {{ error }}</div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'
import { useOllama } from '@/composables/useOllama'
import { useDeepSeek } from '@/composables/useDeepSeek'

const { messages, isLoading, error, chatStream, clearHistory } = useOllama() // useOllama() // useDeepSeek()
const inputMessage = ref('')
const messageContainer = ref(null)

// 自动滚动到底部
watch(messages, () => {
  nextTick(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    }
  })
}, { deep: true })

const sendMessage = async () => {
  const text = inputMessage.value.trim()
  if (!text || isLoading.value) return
  
  inputMessage.value = ''
  error.value = null
  
  // 使用流式输出
  await chatStream(text, (chunk) => {
    // 可在这里做额外处理，如保存到本地存储
    console.log('收到 chunk:', chunk)
  })
}

// 组件挂载时清空历史（可选）
// clearHistory()
</script>

<style scoped>
.chat-container {
  max-width: 800px;
  margin: 0 auto;
  height: 80vh;
  display: flex;
  flex-direction: column;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f5f5f5;
}

.message {
  display: flex;
  margin-bottom: 16px;
  gap: 12px;
}

.message.user {
  flex-direction: row-reverse;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  background: white;
  line-height: 1.6;
  white-space: pre-wrap;
}

.message.user .content {
  background: #007bff;
  color: white;
}

.input-area {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: white;
  border-top: 1px solid #e0e0e0;
}

textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  resize: none;
  font-family: inherit;
}

button {
  padding: 0 24px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: opacity 0.2s;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  color: #666;
  padding: 12px;
}

.error {
  color: #dc3545;
  padding: 12px;
  text-align: center;
  background: #f8d7da;
}
</style>
