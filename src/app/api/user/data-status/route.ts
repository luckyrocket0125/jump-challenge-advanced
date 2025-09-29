import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ hasData: false, hasHubspotToken: false })
    }

    // Check if database is available
    const hasDatabase = process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== ''
    
    if (!hasDatabase) {
      return NextResponse.json({ hasData: false, hasHubspotToken: false })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ hasData: false, hasHubspotToken: false })
    }

    // Check if user has any emails, meetings, or contacts
    const [emailCount, meetingCount, contactCount] = await Promise.all([
      prisma.email.count({ where: { userId: user.id } }),
      prisma.meeting.count({ where: { userId: user.id } }),
      prisma.contact.count({ where: { userId: user.id } })
    ])

    const hasData = emailCount > 0 || meetingCount > 0 || contactCount > 0

    return NextResponse.json({ 
      hasData,
      emailCount,
      meetingCount,
      contactCount,
      hasHubspotToken: !!user.hubspotToken
    })

  } catch (error) {
    console.error('Data status check error:', error)
    // Return default values instead of error when database is not available
    return NextResponse.json({ hasData: false, hasHubspotToken: false })
  }
}