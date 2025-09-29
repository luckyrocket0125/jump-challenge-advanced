import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

export const createGoogleClient = (accessToken: string, refreshToken?: string): OAuth2Client => {
  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/api/auth/callback/google'
  )
  
  client.setCredentials({ 
    access_token: accessToken,
    refresh_token: refreshToken 
  })
  
  return client
}

export const getGmailService = (client: OAuth2Client) => {
  return google.gmail({ version: 'v1', auth: client as any })
}

export const getCalendarService = (client: OAuth2Client) => {
  return google.calendar({ version: 'v3', auth: client as any })
}

export const getGmailMessages = async (gmail: any, query: string = '', maxResults: number = 10) => {
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults,
  })
  
  return response.data.messages || []
}

export const getGmailMessage = async (gmail: any, messageId: string) => {
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  })
  
  return response.data
}

export const getCalendarEvents = async (calendar: any, timeMin?: string, timeMax?: string) => {
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: timeMin || new Date().toISOString(),
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
  })
  
  return response.data.items || []
}

export const createCalendarEvent = async (calendar: any, event: any) => {
  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
  })
  
  return response.data
}