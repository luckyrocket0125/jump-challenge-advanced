import { prisma } from './prisma'
import { createAuthenticatedGoogleClient } from './google-oauth'
import { getGmailService, getGmailMessages, getGmailMessage } from './google'
import { getCalendarService, getCalendarEvents } from './google'
import { createHubspotClient } from './hubspot-oauth'
import { getHubspotContacts, getHubspotContactNotes } from './hubspot'
import { createEmbedding } from './openai'

export async function ingestGmailData(userId: string, accessToken: string, refreshToken?: string) {
  try {
    const googleClient = createAuthenticatedGoogleClient(accessToken, refreshToken)
    const gmail = getGmailService(googleClient as any)

    // Get recent messages
    let messages
    try {
      messages = await getGmailMessages(gmail, '', 100)
    } catch (error: any) {
      // If API is not enabled, return mock data for development
      if (error.code === 403 && error.message?.includes('Gmail API has not been used')) {
        console.log('Gmail API not enabled, returning mock data for development')
        return { success: true, processed: 0, message: 'Gmail API not enabled. Please enable it in Google Cloud Console.' }
      }
      
      // If token is invalid and we have a refresh token, try to refresh
      if (error.code === 401 && refreshToken) {
        console.log('Access token expired, attempting to refresh...')
        const { refreshGoogleToken } = await import('./google-oauth')
        const newTokens = await refreshGoogleToken(refreshToken)
        
        // Update user with new tokens
        const { prisma } = await import('./prisma')
        await prisma.user.update({
          where: { id: userId },
          data: {
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
          }
        })
        
        // Retry with new token
        const newGoogleClient = createAuthenticatedGoogleClient(newTokens.accessToken!, newTokens.refreshToken || refreshToken || undefined)
        const newGmail = getGmailService(newGoogleClient as any)
        messages = await getGmailMessages(newGmail, '', 100)
      } else {
        throw error
      }
    }
    
    for (const messageRef of messages) {
      try {
        const message = await getGmailMessage(gmail, messageRef.id!)
        
        // Extract message data
        const headers = message.payload?.headers || []
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || ''
        const from = headers.find((h: any) => h.name === 'From')?.value || ''
        const to = headers.find((h: any) => h.name === 'To')?.value?.split(',').map((e: string) => e.trim()) || []
        const cc = headers.find((h: any) => h.name === 'Cc')?.value?.split(',').map((e: string) => e.trim()) || []
        const date = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString()
        
        // Extract body
        let body = ''
        let htmlBody = ''
        
        if (message.payload?.body?.data) {
          body = Buffer.from(message.payload.body.data, 'base64').toString()
        } else if (message.payload?.parts) {
          for (const part of message.payload.parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
              body = Buffer.from(part.body.data, 'base64').toString()
            } else if (part.mimeType === 'text/html' && part.body?.data) {
              htmlBody = Buffer.from(part.body.data, 'base64').toString()
            }
          }
        }

        // Store email in database
        const email = await prisma.email.upsert({
          where: { messageId: message.id! },
          update: {
            subject,
            from,
            to,
            cc,
            body,
            htmlBody,
            date: new Date(date),
            labels: message.labelIds || [],
          },
          create: {
            userId,
            messageId: message.id!,
            threadId: message.threadId!,
            subject,
            from,
            to,
            cc,
            body,
            htmlBody,
            date: new Date(date),
            labels: message.labelIds || [],
          }
        })

        // Create embedding for search (optional - skip if OpenAI quota exceeded)
        const content = `${subject} ${body}`.substring(0, 8000) // Limit content size
        
        try {
          const { isEmbeddingAvailable } = await import('./openai')
          
          if (isEmbeddingAvailable()) {
            const embedding = await createEmbedding(content)
            
            await prisma.vectorEmbedding.upsert({
              where: {
                id: email.id
              },
              update: {
                content,
                embedding: `[${embedding.join(',')}]`,
                metadata: {
                  type: 'email',
                  subject,
                  from,
                  date: email.date,
                }
              },
              create: {
                id: email.id,
                content,
                embedding: `[${embedding.join(',')}]`,
                metadata: {
                  type: 'email',
                  subject,
                  from,
                  date: email.date,
                },
                type: 'EMAIL',
                sourceId: email.id,
              }
            })
          } else {
            // Store without embedding
            await prisma.vectorEmbedding.upsert({
              where: {
                id: email.id
              },
              update: {
                content,
                embedding: null,
                metadata: {
                  type: 'email',
                  subject,
                  from,
                  date: email.date,
                }
              },
              create: {
                id: email.id,
                content,
                embedding: null,
                metadata: {
                  type: 'email',
                  subject,
                  from,
                  date: email.date,
                },
                type: 'EMAIL',
                sourceId: email.id,
              }
            })
          }
        } catch (embeddingError: any) {
          console.log('Embedding creation failed, storing without embedding:', embeddingError.message)
          // Store without embedding
          await prisma.vectorEmbedding.upsert({
            where: {
              id: email.id
            },
            update: {
              content,
              embedding: null,
              metadata: {
                type: 'email',
                subject,
                from,
                date: email.date,
              }
            },
            create: {
              id: email.id,
              content,
              embedding: null,
              metadata: {
                type: 'email',
                subject,
                from,
                date: email.date,
              },
              type: 'EMAIL',
              sourceId: email.id,
            }
          })
        }

      } catch (error) {
        console.error(`Error processing message ${messageRef.id}:`, error)
      }
    }

    return { success: true, processed: messages.length }
  } catch (error) {
    console.error('Gmail ingestion error:', error)
    throw error
  }
}

export async function ingestCalendarData(userId: string, accessToken: string, refreshToken?: string) {
  try {
    const googleClient = createAuthenticatedGoogleClient(accessToken, refreshToken)
    const calendar = getCalendarService(googleClient as any)

    // Get events from the last 30 days and next 30 days
    const timeMin = new Date()
    timeMin.setDate(timeMin.getDate() - 30)
    const timeMax = new Date()
    timeMax.setDate(timeMax.getDate() + 30)

    let events
    try {
      events = await getCalendarEvents(calendar, timeMin.toISOString(), timeMax.toISOString())
    } catch (error: any) {
      // If API is not enabled, return mock data for development
      if (error.code === 403 && error.message?.includes('Calendar API has not been used')) {
        console.log('Calendar API not enabled, returning mock data for development')
        return { success: true, processed: 0, message: 'Calendar API not enabled. Please enable it in Google Cloud Console.' }
      }
      throw error
    }
    
    for (const event of events) {
      try {
        if (!event.id || !event.start?.dateTime) continue

        const attendees = event.attendees?.map((a: any) => a.email || '') || []

        // Store meeting in database
        const meeting = await prisma.meeting.upsert({
          where: { googleId: event.id },
          update: {
            title: event.summary || 'Untitled Event',
            description: event.description || '',
            startTime: new Date(event.start.dateTime),
            endTime: new Date(event.end?.dateTime || event.start.dateTime),
            attendees,
            location: event.location || '',
            status: event.status || '',
          },
          create: {
            userId,
            googleId: event.id,
            title: event.summary || 'Untitled Event',
            description: event.description || '',
            startTime: new Date(event.start.dateTime),
            endTime: new Date(event.end?.dateTime || event.start.dateTime),
            attendees,
            location: event.location || '',
            status: event.status || '',
          }
        })

        // Create embedding for search (optional - skip if OpenAI quota exceeded)
        const content = `${meeting.title} ${meeting.description} ${attendees.join(' ')}`.substring(0, 8000)
        
        try {
          const { isEmbeddingAvailable } = await import('./openai')
          
          if (isEmbeddingAvailable()) {
            const embedding = await createEmbedding(content)
            
            await prisma.vectorEmbedding.upsert({
              where: {
                id: meeting.id
              },
              update: {
                content,
                embedding: `[${embedding.join(',')}]`,
                metadata: {
                  type: 'meeting',
                  title: meeting.title,
                  startTime: meeting.startTime,
                  attendees,
                }
              },
              create: {
                id: meeting.id,
                content,
                embedding: `[${embedding.join(',')}]`,
                metadata: {
                  type: 'meeting',
                  title: meeting.title,
                  startTime: meeting.startTime,
                  attendees,
                },
                type: 'MEETING',
                sourceId: meeting.id,
              }
            })
          } else {
            console.log('Embeddings disabled, storing meeting without embedding')
          }
        } catch (embeddingError: any) {
          console.log('Embedding creation failed for meeting:', embeddingError.message)
        }

      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error)
      }
    }

    return { success: true, processed: events.length }
  } catch (error) {
    console.error('Calendar ingestion error:', error)
    throw error
  }
}

export async function ingestHubspotData(userId: string, accessToken: string) {
  try {
    const hubspotClient = createHubspotClient(accessToken)

    // Get all contacts
    const contacts = await getHubspotContacts(hubspotClient, 100)
    
    for (const contact of contacts) {
      try {
        if (!contact.id) continue

        // Store contact in database
        const dbContact = await prisma.contact.upsert({
          where: { hubspotId: contact.id },
          update: {
            email: contact.properties?.email || '',
            firstName: contact.properties?.firstname || '',
            lastName: contact.properties?.lastname || '',
            phone: contact.properties?.phone || '',
            company: contact.properties?.company || '',
            notes: contact.properties?.notes_last_contacted || '',
            properties: contact.properties,
          },
          create: {
            userId,
            hubspotId: contact.id,
            email: contact.properties?.email || '',
            firstName: contact.properties?.firstname || '',
            lastName: contact.properties?.lastname || '',
            phone: contact.properties?.phone || '',
            company: contact.properties?.company || '',
            notes: contact.properties?.notes_last_contacted || '',
            properties: contact.properties,
          }
        })

        // Get contact notes
        try {
          const notes = await getHubspotContactNotes(hubspotClient, contact.id)
          
          for (const note of notes as any[]) {
            if (!note.id) continue

            // Create embedding for note content
            const content = `${note.properties?.hs_note_body || ''}`.substring(0, 8000)
            if (content.trim()) {
              try {
                const { isEmbeddingAvailable } = await import('./openai')
                
                if (isEmbeddingAvailable()) {
                  const embedding = await createEmbedding(content)
                  
                  await prisma.vectorEmbedding.upsert({
                    where: {
                      id: note.id
                    },
                    update: {
                      content,
                      embedding: `[${embedding.join(',')}]`,
                      metadata: {
                        type: 'note',
                        contactId: contact.id,
                        contactName: `${dbContact.firstName} ${dbContact.lastName}`.trim(),
                        createdAt: note.properties?.createdate,
                      }
                    },
                    create: {
                      id: note.id,
                      content,
                      embedding: `[${embedding.join(',')}]`,
                      metadata: {
                        type: 'note',
                        contactId: contact.id,
                        contactName: `${dbContact.firstName} ${dbContact.lastName}`.trim(),
                        createdAt: note.properties?.createdate,
                      },
                      type: 'NOTE',
                      sourceId: note.id,
                    }
                  })
                } else {
                  console.log('Embeddings disabled, storing note without embedding')
                }
              } catch (embeddingError: any) {
                console.log('Embedding creation failed for note:', embeddingError.message)
              }
            }
          }
        } catch (noteError) {
          console.error(`Error processing notes for contact ${contact.id}:`, noteError)
        }

        // Create embedding for contact
        const contactContent = `${dbContact.firstName} ${dbContact.lastName} ${dbContact.email} ${dbContact.company} ${dbContact.notes}`.substring(0, 8000)
        
        try {
          const { isEmbeddingAvailable } = await import('./openai')
          
          if (isEmbeddingAvailable()) {
            const contactEmbedding = await createEmbedding(contactContent)
            
            await prisma.vectorEmbedding.upsert({
              where: {
                id: dbContact.id
              },
              update: {
                content: contactContent,
                embedding: `[${contactEmbedding.join(',')}]`,
                metadata: {
                  type: 'contact',
                  email: dbContact.email,
                  company: dbContact.company,
                  phone: dbContact.phone,
                }
              },
              create: {
                id: dbContact.id,
                content: contactContent,
                embedding: `[${contactEmbedding.join(',')}]`,
                metadata: {
                  type: 'contact',
                  email: dbContact.email,
                  company: dbContact.company,
                  phone: dbContact.phone,
                },
                type: 'CONTACT',
                sourceId: dbContact.id,
              }
            })
          } else {
            console.log('Embeddings disabled, storing contact without embedding')
          }
        } catch (embeddingError: any) {
          console.log('Embedding creation failed for contact:', embeddingError.message)
        }

      } catch (error) {
        console.error(`Error processing contact ${contact.id}:`, error)
      }
    }

    return { success: true, processed: contacts.length }
  } catch (error) {
    console.error('HubSpot ingestion error:', error)
    throw error
  }
}