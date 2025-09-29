'use client'

import { useState } from 'react'
import ChatInterface from '@/components/chat/ChatInterface'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: any
}

export default function DemoPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Welcome to the Financial Advisor AI demo! I can help you with client management, scheduling meetings, and analyzing your data. Try asking me something like "Find meetings I had with John this month" or "Schedule a meeting with Sarah next week".',
      timestamp: new Date(),
    }
  ])
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "I'd be happy to help you with that! In a real implementation, I would search through your Gmail and calendar data to find relevant information.",
        "That's a great question! With proper OAuth setup, I could access your Google Calendar to schedule meetings and your Gmail to send emails.",
        "I can help you manage your client relationships! Once connected to HubSpot, I could create contacts, add notes, and track interactions.",
        "This is a demo response. In the full version, I would use RAG (Retrieval Augmented Generation) to search through your emails, calendar events, and CRM data to provide accurate, contextual answers.",
        "I'm designed to be proactive! I could monitor your inbox and calendar for new emails and meetings, then take appropriate actions based on your instructions."
      ]
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: randomResponse,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
        <div className="text-center">
          <p className="text-sm text-yellow-800">
            🚀 <strong>Demo Mode</strong> - This is a preview of the Financial Advisor AI interface. 
            To use real features, set up OAuth credentials in your .env.local file.
          </p>
        </div>
      </div>
      <ChatInterface
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  )
}