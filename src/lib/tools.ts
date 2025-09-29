import { createAuthenticatedGoogleClient } from './google-oauth'
import { createHubspotClient } from './hubspot-oauth'
import { getGmailService, getCalendarService, createCalendarEvent } from './google'
import { createAuthenticatedHubspotClient, createHubspotContact, updateHubspotContact, createHubspotNote } from './hubspot'
import { prisma } from './prisma'

export const availableTools = [
  {
    type: 'function',
    function: {
      name: 'search_emails',
      description: 'Search through Gmail messages for specific content',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query for emails'
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of results to return',
            default: 10
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_contacts',
      description: 'Search through HubSpot contacts',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query for contacts'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_contact',
      description: 'Create a new contact in HubSpot',
      parameters: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description: 'Contact email address'
          },
          firstName: {
            type: 'string',
            description: 'Contact first name'
          },
          lastName: {
            type: 'string',
            description: 'Contact last name'
          },
          phone: {
            type: 'string',
            description: 'Contact phone number'
          },
          company: {
            type: 'string',
            description: 'Contact company'
          }
        },
        required: ['email']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_meeting',
      description: 'Create a new meeting in Google Calendar',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Meeting title'
          },
          description: {
            type: 'string',
            description: 'Meeting description'
          },
          startTime: {
            type: 'string',
            description: 'Meeting start time (ISO 8601 format)'
          },
          endTime: {
            type: 'string',
            description: 'Meeting end time (ISO 8601 format)'
          },
          attendees: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'List of attendee email addresses'
          },
          location: {
            type: 'string',
            description: 'Meeting location'
          }
        },
        required: ['title', 'startTime', 'endTime']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_contact_note',
      description: 'Add a note to a HubSpot contact',
      parameters: {
        type: 'object',
        properties: {
          contactId: {
            type: 'string',
            description: 'HubSpot contact ID'
          },
          note: {
            type: 'string',
            description: 'Note content'
          }
        },
        required: ['contactId', 'note']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Create a new task for the user',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Task title'
          },
          description: {
            type: 'string',
            description: 'Task description'
          },
          priority: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
            description: 'Task priority level'
          }
        },
        required: ['title']
      }
    }
  }
]

export async function executeTool(
  toolName: string,
  parameters: any,
  userId: string
): Promise<any> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) {
    throw new Error('User not found')
  }

  switch (toolName) {
    case 'search_emails':
      if (!user.accessToken) {
        throw new Error('Google access token not found')
      }
      const googleClient = createAuthenticatedGoogleClient(user.accessToken)
      const gmail = getGmailService(googleClient as any)
      // Implementation would go here
      return { message: 'Email search functionality would be implemented here' }

    case 'search_contacts':
      try {
        const hubspotClient = await createAuthenticatedHubspotClient(userId)
        const contacts = await hubspotClient.crm.contacts.searchApi.doSearch({
          query: parameters.query,
          limit: 10,
        })
        return { contacts: contacts.results || [] }
      } catch (error: any) {
        throw new Error(`HubSpot contact search failed: ${error.message}`)
      }

    case 'create_contact':
      try {
        const hubspotClient = await createAuthenticatedHubspotClient(userId)
        const contact = await createHubspotContact(hubspotClient, {
          properties: {
            email: parameters.email,
            firstname: parameters.firstName,
            lastname: parameters.lastName,
            phone: parameters.phone,
            company: parameters.company
          }
        })
        return { contact }
      } catch (error: any) {
        throw new Error(`HubSpot contact creation failed: ${error.message}`)
      }

    case 'create_meeting':
      if (!user.accessToken) {
        throw new Error('Google access token not found')
      }
      const googleClient2 = createAuthenticatedGoogleClient(user.accessToken)
      const calendar = getCalendarService(googleClient2 as any)
      const event = await createCalendarEvent(calendar, {
        summary: parameters.title,
        description: parameters.description,
        start: {
          dateTime: parameters.startTime,
          timeZone: 'UTC'
        },
        end: {
          dateTime: parameters.endTime,
          timeZone: 'UTC'
        },
        attendees: parameters.attendees?.map((email: string) => ({ email })) || [],
        location: parameters.location
      })
      return { event }

    case 'add_contact_note':
      try {
        const hubspotClient = await createAuthenticatedHubspotClient(userId)
        const note = await createHubspotNote(hubspotClient, {
          properties: {
            hs_note_body: parameters.note
          },
          associations: [
            {
              to: {
                id: parameters.contactId
              },
              types: [
                {
                  associationCategory: 'HUBSPOT_DEFINED',
                  associationTypeId: 214
                }
              ]
            }
          ]
        })
        return { note }
      } catch (error: any) {
        throw new Error(`HubSpot note creation failed: ${error.message}`)
      }

    case 'create_task':
      const task = await prisma.task.create({
        data: {
          userId,
          title: parameters.title,
          description: parameters.description,
          priority: parameters.priority || 'MEDIUM'
        }
      })
      return { task }

    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}