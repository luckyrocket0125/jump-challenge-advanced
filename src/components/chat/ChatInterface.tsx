'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Mic, X, ChevronDown } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useRouter } from 'next/navigation';

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: any
}

interface ChatInterfaceProps {
  messages: Message[]
  onSendMessage: (message: string) => void
  isLoading: boolean
}

export default function ChatInterface({ messages, onSendMessage, isLoading }: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const router = useRouter()


  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  const displayMessages = messages

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-6">
          <h1 className="text-2xl font-bold text-black">Ask Anything</h1>
          <div className="flex space-x-0">
            <button className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-700 rounded">
              Chat
            </button>
            <button className="px-3 py-1 text-sm font-medium text-gray-500">
              History
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-1 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
            <Plus className="h-4 w-4" />
            <span>New thread</span>
          </button>
          <button onClick={() => router.push('/setup')} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Context Bar */}
      <div className="px-6 py-3 border-b border-gray-200">
        <div className="text-center">
          <span className="text-sm text-gray-600">Context set to all meetings</span>
        </div>
        <div className="text-center">
          <span className="text-xs text-gray-400">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-6 py-4" ref={scrollAreaRef}>
        <div className="space-y-6 max-w-4xl mx-auto">
          {displayMessages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">Welcome to your AI Assistant</div>
              <div className="text-gray-400 text-sm">Ask me anything about your meetings, contacts, or schedule</div>
            </div>
          ) : (
            displayMessages.map((message) => (
            <div key={message.id} className="space-y-4">
              {message.role === 'assistant' && (
                <div className="text-black">
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              )}
              
              {message.role === 'user' && (
                <div className="flex justify-end">
                  <div className="bg-gray-100 rounded-lg px-4 py-3 max-w-md">
                    <p className="text-gray-900">
                      {message.metadata?.hasHighlights ? (
                        <span>
                          Find meetings I've had with{' '}
                          {message.metadata.highlights.map((highlight: any, index: number) => (
                            <span key={index}>
                              <span className="inline-flex items-center space-x-1 bg-blue-100 px-2 py-1 rounded">
                                <Avatar className="h-4 w-4">
                                  <AvatarImage src={highlight.avatar} />
                                  <AvatarFallback>{highlight.name[0]}</AvatarFallback>
                                </Avatar>
                                <span className="text-blue-800 font-medium">{highlight.name}</span>
                              </span>
                              {index < message.metadata.highlights.length - 1 ? ' and ' : ''}
                            </span>
                          ))}{' '}
                          this month
                        </span>
                      ) : (
                        message.content
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Meeting Cards */}
              {message.metadata?.hasMeetings && (
                <div className="space-y-4">
                  {message.metadata.meetings.map((dateGroup: any, dateIndex: number) => (
                    <div key={dateIndex} className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-700">{dateGroup.date}</h3>
                      {dateGroup.meetings.map((meeting: any, meetingIndex: number) => (
                        <div key={meetingIndex} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm text-gray-500 mb-1">{meeting.time}</p>
                              <h4 className="font-semibold text-gray-900 mb-2">{meeting.title}</h4>
                              <div className="flex -space-x-2">
                                {meeting.attendees.map((attendee: any, attendeeIndex: number) => (
                                  <Avatar key={attendeeIndex} className="h-8 w-8 border-2 border-white">
                                    <AvatarImage src={attendee.avatar} />
                                    <AvatarFallback className="text-xs">{attendee.name[0]}</AvatarFallback>
                                  </Avatar>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
          )}
          
          {isLoading && (
            <div className="text-black">
              <div className="flex items-center space-x-2">
                <span>Thinking</span>
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="px-6 py-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex items-center space-x-3">
          <button type="button" className="p-2 hover:bg-gray-100 rounded-full">
            <Plus className="h-5 w-5 text-gray-500" />
          </button>
          
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your meetings..."
              className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>
          
          <button type="button" className="flex items-center space-x-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <span>All meetings</span>
            <ChevronDown className="h-4 w-4" />
          </button>
          
          <div className="flex items-center space-x-2">
            <button type="button" className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600">
              <div className="w-4 h-4 bg-white rounded-sm"></div>
            </button>
            <button type="button" className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600">
              <div className="w-4 h-4 bg-white rounded-sm"></div>
            </button>
            <button type="button" className="p-2 hover:bg-gray-100 rounded-full">
              <Mic className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}