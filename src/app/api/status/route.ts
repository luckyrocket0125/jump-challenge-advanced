import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOpenAIAvailable } from '@/lib/openai'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check OpenAI status
    const openaiStatus = {
      available: isOpenAIAvailable(),
      hasApiKey: !!process.env.OPENAI_API_KEY,
      quotaExceeded: !isOpenAIAvailable() && !!process.env.OPENAI_API_KEY
    }

    // Check Google OAuth status
    const googleStatus = {
      connected: !!user.accessToken,
      hasRefreshToken: !!user.refreshToken
    }

    // Check HubSpot OAuth status
    const hubspotStatus = {
      connected: !!user.hubspotToken,
      hasRefreshToken: !!user.hubspotRefreshToken,
      tokenExpiresAt: user.hubspotTokenExpiresAt,
      isExpired: user.hubspotTokenExpiresAt ? new Date() > user.hubspotTokenExpiresAt : false
    }

    // Check database status
    const dbStatus = {
      connected: true,
      hasData: {
        conversations: await prisma.conversation.count({ where: { userId: user.id } }),
        messages: await prisma.message.count({ 
          where: { 
            conversation: { userId: user.id } 
          } 
        }),
        contacts: await prisma.contact.count({ where: { userId: user.id } }),
        meetings: await prisma.meeting.count({ where: { userId: user.id } }),
        emails: await prisma.email.count({ where: { userId: user.id } })
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      services: {
        openai: openaiStatus,
        google: googleStatus,
        hubspot: hubspotStatus,
        database: dbStatus
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}