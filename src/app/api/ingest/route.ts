import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ingestGmailData, ingestCalendarData, ingestHubspotData } from '@/lib/data-ingestion'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if database is available
    const hasDatabase = process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== ''
    
    let user = null
    if (hasDatabase) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })

      // Create user if they don't exist
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: session.user.email,
            name: session.user.name,
          }
        })
      }
    }

    const { type } = await request.json()

    // Get tokens from database first, fallback to session (JWT)
    const accessToken = user?.accessToken || (session as any).accessToken
    const refreshToken = user?.refreshToken || (session as any).refreshToken
    const hubspotToken = user?.hubspotToken

    // If no database or no user, return demo mode response
    if (!hasDatabase || !user) {
      return NextResponse.json({ 
        success: true, 
        result: { 
          message: 'Demo mode - data ingestion simulated',
          processed: 0,
          type: type
        }
      })
    }

    let result
    if (type === 'gmail') {
      if (!accessToken) {
        return NextResponse.json({ error: 'No Google access token found. Please sign in with Google first.' }, { status: 401 })
      }
      result = await ingestGmailData(user.id, accessToken, refreshToken)
    } else if (type === 'calendar') {
      if (!accessToken) {
        return NextResponse.json({ error: 'No Google access token found. Please sign in with Google first.' }, { status: 401 })
      }
      result = await ingestCalendarData(user.id, accessToken, refreshToken)
    } else if (type === 'hubspot') {
      if (!hubspotToken) {
        return NextResponse.json({ error: 'No HubSpot access token found. Please connect HubSpot first.' }, { status: 401 })
      }
      result = await ingestHubspotData(user.id, hubspotToken)
    } else if (type === 'all') {
      const results: any = {}
      let total = 0

      if (accessToken) {
        results.gmail = await ingestGmailData(user.id, accessToken, refreshToken)
        results.calendar = await ingestCalendarData(user.id, accessToken, refreshToken)
        total += results.gmail.processed + results.calendar.processed
      }

      if (hubspotToken) {
        results.hubspot = await ingestHubspotData(user.id, hubspotToken)
        total += results.hubspot.processed
      }

      result = { ...results, total }
    } else {
      return NextResponse.json({ error: 'Invalid type. Use gmail, calendar, hubspot, or all' }, { status: 400 })
    }

    return NextResponse.json({ success: true, result })

  } catch (error) {
    console.error('Data ingestion error:', error)
    return NextResponse.json(
      { error: 'Failed to ingest data' },
      { status: 500 }
    )
  }
}