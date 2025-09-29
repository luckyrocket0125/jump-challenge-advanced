import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { searchSimilarContent, getContextForQuery } from '@/lib/rag'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
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

    const { query, type, threshold, limit } = await request.json()

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    let results
    if (type === 'all' || !type) {
      // Get context for all types
      results = await getContextForQuery(query, user.id, limit || 5)
    } else {
      // Search specific type
      const searchResults = await searchSimilarContent(query, user.id, {
        threshold: threshold || 0.7,
        limit: limit || 10,
        types: [type.toUpperCase()]
      })
      results = { [type.toLowerCase()]: searchResults }
    }

    return NextResponse.json({ 
      success: true, 
      results,
      query 
    })

  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    )
  }
}