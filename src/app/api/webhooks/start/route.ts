import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { webhookManager } from '@/lib/webhooks'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if database is available
    const hasDatabase = process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== ''
    if (!hasDatabase) {
      return NextResponse.json({ 
        success: true, 
        message: 'Webhook polling started (demo mode - no database)' 
      })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Start webhook polling for this user
    await webhookManager.startPolling(user.id)

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook polling started successfully' 
    })

  } catch (error) {
    console.error('Webhook start error:', error)
    return NextResponse.json(
      { error: 'Failed to start webhook polling' },
      { status: 500 }
    )
  }
}