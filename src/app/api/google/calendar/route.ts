import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createAuthenticatedGoogleClient } from '@/lib/google-oauth'
import { getCalendarService, getCalendarEvents, createCalendarEvent } from '@/lib/google'
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
    const timeMin = searchParams.get('timeMin')
    const timeMax = searchParams.get('timeMax')

    const googleClient = createAuthenticatedGoogleClient(user.accessToken)
    const calendar = getCalendarService(googleClient)

    const events = await getCalendarEvents(calendar, timeMin || undefined, timeMax || undefined)
    
    return NextResponse.json({ events })

  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const eventData = await request.json()

    const googleClient = createAuthenticatedGoogleClient(user.accessToken)
    const calendar = getCalendarService(googleClient)

    const event = await createCalendarEvent(calendar, eventData)
    
    return NextResponse.json({ event })

  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json(
      { error: 'Failed to create calendar event' },
      { status: 500 }
    )
  }
}