import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { exchangeHubspotCodeForTokens } from '@/lib/hubspot-oauth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('HubSpot OAuth error:', error)
      return NextResponse.redirect(new URL('/setup?error=hubspot_auth_failed', request.url))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/setup?error=no_code', request.url))
    }

    // Exchange code for tokens
    const tokens = await exchangeHubspotCodeForTokens(code)

    // Update user with HubSpot tokens
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        hubspotToken: tokens.accessToken,
        hubspotRefreshToken: tokens.refreshToken,
        hubspotTokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      }
    })

    return NextResponse.redirect(new URL('/setup?success=hubspot_connected', request.url))

  } catch (error) {
    console.error('HubSpot callback error:', error)
    return NextResponse.redirect(new URL('/setup?error=hubspot_callback_failed', request.url))
  }
}