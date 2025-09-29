import { google } from 'googleapis'

export const createGoogleClient = (accessToken: string, refreshToken?: string) => {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL + '/api/auth/callback/google'
  )
  
  client.setCredentials({ 
    access_token: accessToken,
    refresh_token: refreshToken 
  })
  
  return client
}

export const getGmailService = (client: any) => {
  return google.gmail({ version: 'v1', auth: client })
}

export const getCalendarService = (client: any) => {
  return google.calendar({ version: 'v3', auth: client })
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