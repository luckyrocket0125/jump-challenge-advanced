import { prisma } from './prisma'
import { createEmbedding } from './openai'

export interface SearchResult {
  id: string
  content: string
  metadata: any
  type: string
  similarity: number
}

export async function searchSimilarContent(
  query: string,
  userId: string,
  options: {
    threshold?: number
    limit?: number
    types?: string[]
  } = {}
): Promise<SearchResult[]> {
  try {
    const { threshold = 0.7, limit = 10, types = ['EMAIL', 'CONTACT', 'MEETING', 'NOTE'] } = options

    // Check if embeddings are available
    const { isEmbeddingAvailable } = await import('./openai')
    
    if (!isEmbeddingAvailable()) {
      console.log('Embeddings disabled, using text search')
      return await fallbackTextSearch(query, userId, options)
    }

    // Try to create embedding for the query
    let queryEmbedding: number[]
    try {
      queryEmbedding = await createEmbedding(query)
    } catch (error: any) {
      console.log('Embedding creation failed, falling back to text search:', error.message)
      return await fallbackTextSearch(query, userId, options)
    }

    const embeddingString = `[${queryEmbedding.join(',')}]`

    // Build the type filter
    const typeFilter = types.map(type => `'${type}'`).join(',')

    // Execute semantic search with better error handling
    try {
      const results = await prisma.$queryRaw`
        SELECT 
          ve.id,
          ve.content,
          ve.metadata,
          ve.type,
          (1 - (ve.embedding <=> ${embeddingString}::vector)) as similarity
        FROM "VectorEmbedding" ve
        WHERE ve.type IN (${typeFilter})
          AND ve.embedding IS NOT NULL
          AND (1 - (ve.embedding <=> ${embeddingString}::vector)) > ${threshold}
        ORDER BY ve.embedding <=> ${embeddingString}::vector
        LIMIT ${limit}
      `

      return results as SearchResult[]
    } catch (dbError: any) {
      console.error('Database query error:', dbError)
      // If vector search fails, fall back to text search
      return await fallbackTextSearch(query, userId, options)
    }
  } catch (error) {
    console.error('RAG search error:', error)
    // Fallback to text search if semantic search fails
    return await fallbackTextSearch(query, userId, options)
  }
}

// Fallback text search when embeddings are not available
async function fallbackTextSearch(
  query: string,
  userId: string,
  options: {
    threshold?: number
    limit?: number
    types?: string[]
  } = {}
): Promise<SearchResult[]> {
  try {
    const { limit = 10, types = ['EMAIL', 'CONTACT', 'MEETING', 'NOTE'] } = options
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2)

    if (searchTerms.length === 0) {
      // If no meaningful search terms, return recent items
      const results = await prisma.vectorEmbedding.findMany({
        where: {
          type: {
            in: types as any[]
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      })

      return results.map((result: any) => ({
        id: result.id,
        content: result.content,
        metadata: result.metadata,
        type: result.type,
        similarity: 0.3
      }))
    }

    // Use Prisma query instead of raw SQL to avoid enum issues
    const results = await prisma.vectorEmbedding.findMany({
      where: {
        type: {
          in: types as any[]
        },
        OR: searchTerms.map(term => ({
          content: {
            contains: term,
            mode: 'insensitive' as const
          }
        }))
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    // Convert to SearchResult format with better similarity scoring
    return results.map((result: any) => {
      const contentLower = result.content.toLowerCase()
      const matchingTerms = searchTerms.filter(term => contentLower.includes(term))
      const similarity = Math.min(0.9, 0.3 + (matchingTerms.length / searchTerms.length) * 0.6)
      
      return {
        id: result.id,
        content: result.content,
        metadata: result.metadata,
        type: result.type,
        similarity
      }
    })
  } catch (error) {
    console.error('Fallback text search error:', error)
    return []
  }
}

export async function searchEmails(
  query: string,
  userId: string,
  options: { threshold?: number; limit?: number } = {}
): Promise<SearchResult[]> {
  return searchSimilarContent(query, userId, {
    ...options,
    types: ['EMAIL']
  })
}

export async function searchContacts(
  query: string,
  userId: string,
  options: { threshold?: number; limit?: number } = {}
): Promise<SearchResult[]> {
  // Try embeddings first
  const embeddingResults = await searchSimilarContent(query, userId, {
    ...options,
    types: ['CONTACT']
  })

  // If no results from embeddings, search directly in Contact table
  if (embeddingResults.length === 0) {
    try {
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2)
      
      const contacts = await prisma.contact.findMany({
        where: {
          userId: userId,
          OR: searchTerms.flatMap(term => [
            {
              firstName: {
                contains: term,
                mode: 'insensitive' as const
              }
            },
            {
              lastName: {
                contains: term,
                mode: 'insensitive' as const
              }
            },
            {
              email: {
                contains: term,
                mode: 'insensitive' as const
              }
            },
            {
              company: {
                contains: term,
                mode: 'insensitive' as const
              }
            }
          ])
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: options.limit || 10
      })

      // Convert contacts to SearchResult format
      const contactResults = contacts.map((contact: any) => ({
        id: contact.id,
        content: `${contact.firstName} ${contact.lastName} ${contact.email} ${contact.company}`.trim(),
        metadata: {
          type: 'contact',
          firstName: contact.firstName,
          // lastName: contact.lastName,
          email: contact.email,
          // company: contact.company,
          // phone: contact.phone
        },
        type: 'CONTACT',
        similarity: 0.8
      }))

      return contactResults
    } catch (error) {
      console.error('Direct contact search error:', error)
    }
  }

  return embeddingResults
}

export async function searchMeetings(
  query: string,
  userId: string,
  options: { threshold?: number; limit?: number } = {}
): Promise<SearchResult[]> {
  // Try embeddings first
  const embeddingResults = await searchSimilarContent(query, userId, {
    ...options,
    types: ['MEETING']
  })

  // If no results from embeddings, search directly in Meeting table
  if (embeddingResults.length === 0) {
    try {
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2)
      
      const meetings = await prisma.meeting.findMany({
        where: {
          userId: userId,
          OR: searchTerms.flatMap(term => [
            {
              title: {
                contains: term,
                mode: 'insensitive' as const
              }
            },
            {
              description: {
                contains: term,
                mode: 'insensitive' as const
              }
            },
            {
              attendees: {
                has: term
              }
            }
          ])
        },
        orderBy: {
          startTime: 'desc'
        },
        take: options.limit || 10
      })

      // Convert meetings to SearchResult format
      const meetingResults = meetings.map((meeting: any) => ({
        id: meeting.id,
        content: `${meeting.title} ${meeting.description}`.trim(),
        metadata: {
          type: 'meeting',
          title: meeting.title,
          startTime: meeting.startTime,
          attendees: meeting.attendees,
          location: meeting.location,
          status: meeting.status
        },
        type: 'MEETING',
        similarity: 0.8
      }))

      return meetingResults
    } catch (error) {
      console.error('Direct meeting search error:', error)
    }
  }

  return embeddingResults
}

export async function searchNotes(
  query: string,
  userId: string,
  options: { threshold?: number; limit?: number } = {}
): Promise<SearchResult[]> {
  return searchSimilarContent(query, userId, {
    ...options,
    types: ['NOTE']
  })
}

export async function getContextForQuery(
  query: string,
  userId: string,
  maxResults: number = 5
): Promise<{
  emails: SearchResult[]
  contacts: SearchResult[]
  meetings: SearchResult[]
  notes: SearchResult[]
}> {
  const [emails, contacts, meetings, notes] = await Promise.all([
    searchEmails(query, userId, { limit: maxResults }),
    searchContacts(query, userId, { limit: maxResults }),
    searchMeetings(query, userId, { limit: maxResults }),
    searchNotes(query, userId, { limit: maxResults })
  ])

  return { emails, contacts, meetings, notes }
}

export async function createContextString(
  query: string,
  userId: string,
  maxResults: number = 5
): Promise<string> {
  const context = await getContextForQuery(query, userId, maxResults)
  
  let contextString = ''
  
  if (context.emails.length > 0) {
    contextString += '\n\n## Relevant Emails:\n'
    context.emails.forEach((email, index) => {
      contextString += `${index + 1}. ${email.metadata?.subject || 'No subject'} (${email.metadata?.from})\n`
      contextString += `   ${email.content.substring(0, 200)}...\n`
    })
  }
  
  if (context.contacts.length > 0) {
    contextString += '\n\n## Relevant Contacts:\n'
    context.contacts.forEach((contact, index) => {
      contextString += `${index + 1}. ${contact.metadata?.firstName} ${contact.metadata?.lastName} (${contact.metadata?.email})\n`
      contextString += `   Company: ${contact.metadata?.company || 'N/A'}\n`
      contextString += `   ${contact.content.substring(0, 200)}...\n`
    })
  }
  
  if (context.meetings.length > 0) {
    contextString += '\n\n## Relevant Meetings:\n'
    context.meetings.forEach((meeting, index) => {
      contextString += `${index + 1}. ${meeting.metadata?.title} (${new Date(meeting.metadata?.startTime).toLocaleDateString()})\n`
      contextString += `   Attendees: ${meeting.metadata?.attendees?.join(', ') || 'N/A'}\n`
      contextString += `   ${meeting.content.substring(0, 200)}...\n`
    })
  }
  
  if (context.notes.length > 0) {
    contextString += '\n\n## Relevant Notes:\n'
    context.notes.forEach((note, index) => {
      contextString += `${index + 1}. Note for ${note.metadata?.contactName} (${new Date(note.metadata?.createdAt).toLocaleDateString()})\n`
      contextString += `   ${note.content.substring(0, 200)}...\n`
    })
  }
  
  return contextString
}