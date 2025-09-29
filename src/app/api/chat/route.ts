import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateResponse, isOpenAIAvailable } from '@/lib/openai'
import { createContextString } from '@/lib/rag'
import { availableTools, executeTool } from '@/lib/tools'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, conversationId } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Check if database is available
    const hasDatabase = process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== ''
    const hasOpenAI = isOpenAIAvailable()
    
    if (!hasDatabase) {
      // Return a simple response when database is not available
      return NextResponse.json({
        response: "I'm in demo mode. The database is not connected, so I can't access your data or store conversations. To use full features, please set up the database connection.",
        conversationId: 'demo',
        metadata: { isDemo: true }
      })
    }

    if (!hasOpenAI) {
      // Return a response when OpenAI is not available
      return NextResponse.json({
        response: "I'm currently unable to process your request with full AI capabilities. This could be due to:\n\n• Missing or invalid OpenAI API key\n• API quota exceeded\n• Network connectivity issues\n\nPlease check your OpenAI API configuration and try again later.",
        conversationId: 'demo',
        metadata: { 
          isFallback: true, 
          reason: 'OpenAI not available',
          suggestions: [
            'Check your OPENAI_API_KEY environment variable',
            'Verify your OpenAI account has sufficient credits',
            'Try again in a few minutes'
          ]
        }
      })
    }

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name,
        }
      })
    }

    // Get or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        userId: user.id,
        id: conversationId || undefined
      }
    })

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId: user.id,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        }
      })
    }

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: message,
      }
    })

    // Get conversation history
    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 10, // Last 10 messages for context
    })

    // Convert to OpenAI format
    const openaiMessages = messages.map((msg: any) => ({
      role: msg.role.toLowerCase() as 'user' | 'assistant' | 'system',
      content: msg.content,
    }))

    // Get relevant context using RAG
    let context: string
    try {
      context = await createContextString(message, user.id, 5)
    } catch (error) {
      console.error('Context creation error:', error)
      context = ''
    }
    
    // Add system message with context
    openaiMessages.unshift({
      role: 'system',
      content: `You are an AI assistant for financial advisors. You have access to Gmail, Google Calendar, and HubSpot data. You can help with:
- Answering questions about clients and meetings
- Scheduling appointments
- Managing contacts
- Sending emails
- Looking up information from emails and CRM

Be helpful, professional, and proactive. When you need to perform actions, use the available tools.

Here is relevant context from your data:${context}`
    })

    // Generate response with tools
    let response: any
    let assistantResponse: any
    let assistantMessage: string
    let toolResults: any[] = []

    try {
      response = await generateResponse(openaiMessages, availableTools)
      assistantResponse = response.choices[0]?.message
      assistantMessage = assistantResponse?.content || 'I apologize, but I encountered an error processing your request.'
    } catch (error: any) {
      console.error('OpenAI API error:', error)
      
      let fallbackMessage = ''
      let errorReason = 'Unknown error'
      
      if (error.message?.includes('quota exceeded') || error.code === 'insufficient_quota') {
        errorReason = 'OpenAI quota exceeded'
        fallbackMessage = `I'm currently unable to process your request with full AI capabilities due to API quota limits. However, I can still help you with basic information from your data.

Your message: "${message}"

${context ? 'Here\'s what I found in your data:\n\n' + context.substring(0, 500) + '...' : 'No relevant data found in your database.'}

**To restore full AI functionality:**
• Check your OpenAI account billing and usage limits
• Add credits to your OpenAI account if needed
• Try again later once quota resets

**What I can still help with:**
• Search through your existing data
• Show recent meetings and contacts
• Basic information retrieval`
      } else if (error.message?.includes('API key') || error.code === 'invalid_api_key') {
        errorReason = 'Invalid OpenAI API key'
        fallbackMessage = `I'm unable to process your request due to an API configuration issue. Please check your OpenAI API key configuration.

Your message: "${message}"

${context ? 'Here\'s what I found in your data:\n\n' + context.substring(0, 500) + '...' : 'No relevant data found.'}`
      } else if (error.message?.includes('rate limit') || error.code === 'rate_limit_exceeded') {
        errorReason = 'Rate limit exceeded'
        fallbackMessage = `I'm currently experiencing high traffic and can't process your request right now. Please try again in a few minutes.

Your message: "${message}"

${context ? 'Here\'s what I found in your data:\n\n' + context.substring(0, 500) + '...' : 'No relevant data found.'}`
      } else {
        errorReason = 'OpenAI API error'
        fallbackMessage = `I encountered an error processing your request. Here's what I found in your data:

${context ? context.substring(0, 500) + '...' : 'No relevant data found.'}

Please try again or contact support if the issue persists.`
      }
      
      assistantMessage = fallbackMessage
      
      // Save the fallback response
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: assistantMessage,
          metadata: {
            isFallback: true,
            reason: errorReason,
            originalError: error.message
          },
        }
      })

      return NextResponse.json({
        response: assistantMessage,
        conversationId: conversation.id,
        metadata: {
          isFallback: true,
          reason: errorReason,
          suggestions: [
            'Check your OpenAI API configuration',
            'Verify your account has sufficient credits',
            'Try again in a few minutes'
          ]
        },
      })
    }

    // Handle tool calls
    if (assistantResponse?.tool_calls && assistantResponse.tool_calls.length > 0) {
      for (const toolCall of assistantResponse.tool_calls) {
        try {
          const result = await executeTool(
            (toolCall as any).function.name,
            JSON.parse((toolCall as any).function.arguments),
            user.id
          )
          toolResults.push({
            toolCallId: toolCall.id,
            name: (toolCall as any).function.name,
            result
          })
        } catch (error: any) {
          console.error('Tool execution error:', error)
          
          // Handle specific error types
          let errorMessage = error.message || 'Unknown error'
          if (error.message?.includes('token expired') || error.message?.includes('reconnect')) {
            errorMessage = `Authentication expired. Please reconnect your ${error.message.includes('HubSpot') ? 'HubSpot' : 'Google'} account in the setup page.`
          } else if (error.message?.includes('quota exceeded')) {
            errorMessage = 'API quota exceeded. Please check your account limits.'
          }
          
          toolResults.push({
            toolCallId: toolCall.id,
            name: (toolCall as any).function.name,
            error: errorMessage
          })
        }
      }

      // Generate final response with tool results
      try {
        const toolMessages = toolResults.map(result => ({
          role: 'tool' as const,
          content: JSON.stringify(result.result || { error: result.error }),
          tool_call_id: result.toolCallId
        }))

        const finalMessages = [
          ...openaiMessages,
          { role: 'assistant' as const, content: assistantMessage, tool_calls: assistantResponse.tool_calls },
          ...toolMessages
        ]

        const finalResponse = await generateResponse(finalMessages)
        assistantMessage = finalResponse.choices[0]?.message?.content || assistantMessage
      } catch (error: any) {
        if (error.code === 'insufficient_quota') {
          console.log('OpenAI quota exceeded during tool response generation')
          assistantMessage += '\n\nNote: I performed the requested actions but couldn\'t generate a detailed response due to API limitations.'
        } else {
          throw error
        }
      }
    }

    // Save assistant message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: assistantMessage,
        metadata: {
          toolCalls: assistantResponse?.tool_calls,
          toolResults
        },
      }
    })

    return NextResponse.json({
      response: assistantMessage,
      conversationId: conversation.id,
      metadata: {
        toolCalls: assistantResponse?.tool_calls,
        toolResults
      },
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}