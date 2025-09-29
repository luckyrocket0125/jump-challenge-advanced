import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createAuthenticatedGoogleClient } from '@/lib/google-oauth'
import { getGmailService, getGmailMessages, getGmailMessage } from '@/lib/google'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user?.accessToken) {
      return NextResponse.json({ error: 'No Google access token found' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const maxResults = parseInt(searchParams.get('maxResults') || '10')
    const messageId = searchParams.get('messageId')

    const googleClient = createAuthenticatedGoogleClient(user.accessToken)
    const gmail = getGmailService(googleClient)

    if (messageId) {
      // Get specific message
      const message = await getGmailMessage(gmail, messageId)
      return NextResponse.json({ message })
    } else {
      // Get list of messages
      const messages = await getGmailMessages(gmail, query, maxResults)
      return NextResponse.json({ messages })
    }

  } catch (error) {
    console.error('Gmail API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Gmail data' },
      { status: 500 }
    )
  }
}