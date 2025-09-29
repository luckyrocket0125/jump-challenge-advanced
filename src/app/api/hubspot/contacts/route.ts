import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createHubspotClient } from '@/lib/hubspot-oauth'
import { getHubspotContacts, getHubspotContact, createHubspotContact, updateHubspotContact, searchHubspotContacts } from '@/lib/hubspot'
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
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '100')

    const hubspotClient = createHubspotClient(user.hubspotToken)

    if (contactId) {
      // Get specific contact
      const contact = await getHubspotContact(hubspotClient, contactId)
      return NextResponse.json({ contact })
    } else if (query) {
      // Search contacts
      const contacts = await searchHubspotContacts(hubspotClient, query)
      return NextResponse.json({ contacts })
    } else {
      // Get all contacts
      const contacts = await getHubspotContacts(hubspotClient, limit)
      return NextResponse.json({ contacts })
    }

  } catch (error) {
    console.error('HubSpot contacts API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch HubSpot contacts' },
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

    const contactData = await request.json()
    const hubspotClient = createHubspotClient(user.hubspotToken)

    const contact = await createHubspotContact(hubspotClient, contactData)
    
    return NextResponse.json({ contact })

  } catch (error) {
    console.error('HubSpot contact creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create HubSpot contact' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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

    const contactData = await request.json()
    const hubspotClient = createHubspotClient(user.hubspotToken)

    const contact = await updateHubspotContact(hubspotClient, contactId, contactData)
    
    return NextResponse.json({ contact })

  } catch (error) {
    console.error('HubSpot contact update error:', error)
    return NextResponse.json(
      { error: 'Failed to update HubSpot contact' },
      { status: 500 }
    )
  }
}