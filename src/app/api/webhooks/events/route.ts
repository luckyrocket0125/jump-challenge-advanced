import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type')

    // Get webhook events for this user
    const events = await prisma.webhookEvent.findMany({
      where: {
        userId: user.id,
        ...(type && { type })
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    })

    return NextResponse.json({ events })

  } catch (error) {
    console.error('Webhook events error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch webhook events' },
      { status: 500 }
    )
  }
}