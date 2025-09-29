import { Client } from '@hubspot/api-client'
import { refreshHubspotToken } from './hubspot-oauth'
import { prisma } from './prisma'

export const createHubspotClient = (accessToken: string): Client => {
  return new Client({ accessToken })
}

export const createAuthenticatedHubspotClient = async (userId: string): Promise<Client> => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user || !user.hubspotToken) {
    throw new Error('HubSpot access token not found. Please reconnect your HubSpot account.')
  }

  try {
    // Try to create client with current token
    const client = new Client({ accessToken: user.hubspotToken })
    
    // Test the token by making a simple API call
    await client.crm.contacts.getAll(1)
    
    return client
  } catch (error: any) {
    console.log('HubSpot token expired, attempting refresh...')
    
    // If token is expired, try to refresh it
    if (user.hubspotRefreshToken) {
      try {
        const newTokens = await refreshHubspotToken(user.hubspotRefreshToken)
        
        // Update user with new tokens
        await prisma.user.update({
          where: { id: userId },
          data: {
            hubspotToken: newTokens.accessToken,
            hubspotRefreshToken: newTokens.refreshToken,
            hubspotTokenExpiresAt: new Date(Date.now() + newTokens.expiresIn * 1000)
          }
        })
        
        return new Client({ accessToken: newTokens.accessToken })
      } catch (refreshError) {
        console.error('Failed to refresh HubSpot token:', refreshError)
        throw new Error('HubSpot token expired and could not be refreshed. Please reconnect your HubSpot account.')
      }
    } else {
      throw new Error('HubSpot token expired and no refresh token available. Please reconnect your HubSpot account.')
    }
  }
}

export const getHubspotContacts = async (client: Client, limit: number = 100) => {
  const response = await client.crm.contacts.getAll(limit)
  return response.results || []
}

export const getHubspotContact = async (client: Client, contactId: string) => {
  const response = await client.crm.contacts.getById(contactId)
  return response
}

export const createHubspotContact = async (client: Client, contactData: any) => {
  const response = await client.crm.contacts.create(contactData)
  return response
}

export const updateHubspotContact = async (client: Client, contactId: string, contactData: any) => {
  const response = await client.crm.contacts.update(contactId, contactData)
  return response
}

export const searchHubspotContacts = async (client: Client, query: string) => {
  const response = await client.crm.contacts.searchApi.doSearch({
    query,
    limit: 10,
  })
  return response.results || []
}

export const getHubspotContactNotes = async (client: Client, contactId: string) => {
  const response = await client.crm.objects.notes.getPage(contactId)
  return response.results || []
}

export const createHubspotNote = async (client: Client, noteData: any) => {
  const response = await client.crm.objects.notes.create(noteData)
  return response
}