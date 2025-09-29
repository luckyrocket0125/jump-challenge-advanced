'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import ChatInterface from '@/components/chat/ChatInterface'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: any
}

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasData, setHasData] = useState<boolean | null>(null)

  useEffect(() => {
    if (session?.user?.email) {
      // Check if user has any data ingested
      fetch('/api/user/data-status')
        .then(res => res.json())
        .then(data => {
          setHasData(data.hasData)
          // Don't auto-redirect to setup - let user choose
        })
        .catch(() => setHasData(false))
    }
  }, [session])

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          conversationId: 'default',
        }),
      })

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'Sorry, I encountered an error.',
        timestamp: new Date(),
        metadata: data.metadata,
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Financial Advisor AI
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to access your AI assistant
            </p>
          </div>
          <div>
            <button
              onClick={() => signIn('google')}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign in with Google
            </button>
            <button
              onClick={() => {
                // Create a mock session for demo
                const mockSession = {
                  user: {
                    email: 'demo@example.com',
                    name: 'Demo User',
                    image: null
                  },
                  accessToken: 'demo-token',
                  refreshToken: 'demo-refresh'
                }
                // This is a hack for demo - in real app you'd use proper auth
                window.location.href = '/demo'
              }}
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Try Demo Mode
            </button>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">
              To use full features, set up Google OAuth credentials in .env.local
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {hasData === false && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-800">
                💡 <strong>No data imported yet</strong> - Import your Gmail, Calendar, and HubSpot data for better AI assistance
              </p>
            </div>
            <button
              onClick={() => router.push('/setup')}
              className="ml-4 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Setup Data
            </button>
          </div>
        </div>
      )}
      <ChatInterface
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  )
}