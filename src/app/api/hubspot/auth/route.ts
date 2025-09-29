import { NextResponse } from 'next/server'
import { getHubspotAuthUrl } from '@/lib/hubspot-oauth'

export async function GET() {
  try {
    const authUrl = getHubspotAuthUrl()
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('HubSpot auth error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate HubSpot authentication' },
      { status: 500 }
    )
  }
}