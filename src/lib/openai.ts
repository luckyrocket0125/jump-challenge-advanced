import OpenAI from 'openai'

// Initialize OpenAI client with better error handling
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Rate limiting for OpenAI API calls
let lastEmbeddingCall = 0
const EMBEDDING_RATE_LIMIT = 1000 // 1 second between calls
let quotaExceeded = false
let lastQuotaCheck = 0
const QUOTA_CHECK_INTERVAL = 60000 // Check quota every minute

export const createEmbedding = async (text: string): Promise<number[]> => {
  // Check if API key is available
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }

  // Check if we've already hit quota limit
  if (quotaExceeded) {
    throw new Error('OpenAI quota exceeded - embeddings disabled')
  }

  // Rate limiting to avoid quota exceeded
  const now = Date.now()
  const timeSinceLastCall = now - lastEmbeddingCall
  if (timeSinceLastCall < EMBEDDING_RATE_LIMIT) {
    await new Promise(resolve => setTimeout(resolve, EMBEDDING_RATE_LIMIT - timeSinceLastCall))
  }
  lastEmbeddingCall = Date.now()

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })
    
    return response.data[0].embedding
  } catch (error: any) {
    console.error('Embedding creation error:', error)
    
    if (error.code === 'insufficient_quota' || error.status === 429) {
      quotaExceeded = true
      console.log('OpenAI quota exceeded - disabling embeddings for this session')
    } else if (error.code === 'invalid_api_key') {
      console.error('Invalid OpenAI API key')
    } else if (error.code === 'rate_limit_exceeded') {
      console.log('Rate limit exceeded, will retry later')
    }
    
    throw error
  }
}

export const isEmbeddingAvailable = (): boolean => {
  // Reset quota check periodically
  const now = Date.now()
  if (now - lastQuotaCheck > QUOTA_CHECK_INTERVAL) {
    quotaExceeded = false
    lastQuotaCheck = now
  }
  
  return !quotaExceeded && !!process.env.OPENAI_API_KEY
}

export const generateResponse = async (
  messages: Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string; tool_call_id?: string; tool_calls?: any[] }>,
  tools?: any[]
) => {
  // Check if API key is available
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages as any,
      tools,
      tool_choice: tools ? 'auto' : undefined,
      temperature: 0.7,
      max_tokens: 2000,
    })
    
    return response
  } catch (error: any) {
    console.error('OpenAI API error:', error)
    
    if (error.code === 'insufficient_quota' || error.status === 429 || error.message?.includes('quota')) {
      quotaExceeded = true
      throw new Error('OpenAI quota exceeded')
    } else if (error.code === 'invalid_api_key') {
      throw new Error('Invalid OpenAI API key')
    } else if (error.code === 'rate_limit_exceeded') {
      throw new Error('Rate limit exceeded')
    }
    
    throw error
  }
}

export const isOpenAIAvailable = (): boolean => {
  return !!process.env.OPENAI_API_KEY && !quotaExceeded
}