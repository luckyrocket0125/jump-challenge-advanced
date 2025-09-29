import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createHubspotClient } from '@/lib/hubspot-oauth'
import { getHubspotContactNotes, createHubspotNote } from '@/lib/hubspot'
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

    if (!user?.hubspotToken) {
      return NextResponse.json({ error: 'No HubSpot access token found' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get('contactId')
    
    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 })
    }

    const hubspotClient = createHubspotClient(user.hubspotToken)
    const notes = await getHubspotContactNotes(hubspotClient, contactId)
    
    return NextResponse.json({ notes })

  } catch (error) {
    console.error('HubSpot notes API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch HubSpot notes' },
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

    if (!user?.hubspotToken) {
      return NextResponse.json({ error: 'No HubSpot access token found' }, { status: 401 })
    }

    const noteData = await request.json()
    const hubspotClient = createHubspotClient(user.hubspotToken)

    const note = await createHubspotNote(hubspotClient, noteData)
    
    return NextResponse.json({ note })

  } catch (error) {
    console.error('HubSpot note creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create HubSpot note' },
      { status: 500 }
    )
  }
}