import { google } from 'googleapis'

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
]

export const createGoogleOAuthClient = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL + '/api/auth/callback/google'
  )
}

export const getGoogleAuthUrl = () => {
  const oauth2Client = createGoogleOAuthClient()
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_SCOPES,
    prompt: 'consent', // Force consent screen to get refresh token
  })
}

export const exchangeCodeForTokens = async (code: string) => {
  const oauth2Client = createGoogleOAuthClient()
  
  const { tokens } = await oauth2Client.getToken(code)
  oauth2Client.setCredentials(tokens)
  
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date,
  }
}

export const refreshAccessToken = async (refreshToken: string) => {
  const oauth2Client = createGoogleOAuthClient()
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  
  const { credentials } = await oauth2Client.refreshAccessToken()
  
  return {
    accessToken: credentials.access_token,
    expiryDate: credentials.expiry_date,
  }
}

export const createAuthenticatedGoogleClient = (accessToken: string, refreshToken?: string) => {
  const oauth2Client = createGoogleOAuthClient()
  oauth2Client.setCredentials({ 
    access_token: accessToken,
    refresh_token: refreshToken 
  })
  
  // Add automatic token refresh
  if (refreshToken) {
    oauth2Client.on('tokens', (tokens) => {
      if (tokens.access_token) {
        oauth2Client.setCredentials(tokens)
      }
    })
  }
  
  return oauth2Client
}

export const refreshGoogleToken = async (refreshToken: string) => {
  const oauth2Client = createGoogleOAuthClient()
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  
  try {
    const { credentials } = await oauth2Client.refreshAccessToken()
    return {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || refreshToken,
      expiryDate: credentials.expiry_date
    }
  } catch (error) {
    console.error('Token refresh failed:', error)
    throw error
  }
}