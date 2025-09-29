import { Client } from '@hubspot/api-client'

export const HUBSPOT_SCOPES = [
  // 'contacts',
  'crm.objects.contacts.read',
  'crm.objects.contacts.write',
  'crm.objects.companies.read',
  'crm.objects.companies.write',
  'crm.objects.deals.read',
  'crm.objects.deals.write',
  // 'crm.objects.notes.read',
  // 'crm.objects.notes.write',
  // 'crm.objects.tasks.read',
  // 'crm.objects.tasks.write',
]

export const getHubspotAuthUrl = () => {
  const clientId = process.env.HUBSPOT_CLIENT_ID
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/hubspot/callback`
  
  const params = new URLSearchParams({
    client_id: clientId!,
    redirect_uri: redirectUri,
    scope: HUBSPOT_SCOPES.join(' '),
    response_type: 'code',
  })
  
  return `https://app.hubspot.com/oauth/authorize?${params.toString()}`
}

export const exchangeHubspotCodeForTokens = async (code: string) => {
  const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.HUBSPOT_CLIENT_ID!,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/hubspot/callback`,
      code,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to exchange code for tokens')
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  }
}

export const refreshHubspotToken = async (refreshToken: string) => {
  const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.HUBSPOT_CLIENT_ID!,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh token')
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  }
}

export const createHubspotClient = (accessToken: string): Client => {
  return new Client({ accessToken })
}