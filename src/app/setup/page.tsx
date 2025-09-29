'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle, Mail, Calendar, Database, Users, AlertCircle, Play, Square, Activity } from 'lucide-react'

export default function SetupPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isIngesting, setIsIngesting] = useState(false)
  const [ingestionStatus, setIngestionStatus] = useState<string>('')
  const [hubspotConnected, setHubspotConnected] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [webhookStatus, setWebhookStatus] = useState<string>('')
  const [isWebhookRunning, setIsWebhookRunning] = useState(false)
  const [backgroundServiceRunning, setBackgroundServiceRunning] = useState(false)

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    
    if (success === 'hubspot_connected') {
      setHubspotConnected(true)
      setIngestionStatus('HubSpot connected successfully!')
    } else if (error === 'hubspot_auth_failed') {
      setIngestionStatus('HubSpot connection failed. Please try again.')
    }

    // Check background service status
    checkBackgroundServiceStatus()
  }, [searchParams])

  const checkBackgroundServiceStatus = async () => {
    try {
      const response = await fetch('/api/webhooks/service')
      const result = await response.json()
      setBackgroundServiceRunning(result.isRunning)
    } catch (error) {
      console.error('Failed to check background service status:', error)
    }
  }

  const handleDataIngestion = async (type: 'gmail' | 'calendar' | 'hubspot' | 'all') => {
    setIsIngesting(true)
    setIngestionStatus(`Starting ${type} data ingestion...`)
    
    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      })

      const result = await response.json()
      
      if (result.success) {
        if (type === 'all') {
          setIngestionStatus(`Successfully ingested ${result.result.total} items from all connected sources`)
        } else {
          setIngestionStatus(`Successfully ingested ${result.result.processed} ${type} items`)
        }
      } else {
        setIngestionStatus('Ingestion failed. Please try again.')
      }
    } catch (error) {
      console.error('Ingestion error:', error)
      setIngestionStatus('Ingestion failed. Please try again.')
    } finally {
      setIsIngesting(false)
    }
  }

  const handleWebhookControl = async (action: 'start' | 'stop') => {
    setWebhookStatus(`${action === 'start' ? 'Starting' : 'Stopping'} webhook monitoring...`)
    
    try {
      const response = await fetch(`/api/webhooks/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()
      
      if (result.success) {
        setIsWebhookRunning(action === 'start')
        setWebhookStatus(result.message)
      } else {
        setWebhookStatus(`Failed to ${action} webhook monitoring`)
      }
    } catch (error) {
      console.error('Webhook control error:', error)
      setWebhookStatus(`Failed to ${action} webhook monitoring`)
    }
  }

  const handleBackgroundServiceControl = async (action: 'start' | 'stop') => {
    try {
      const response = await fetch('/api/webhooks/service', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      const result = await response.json()
      
      if (result.success) {
        setBackgroundServiceRunning(action === 'start')
        setWebhookStatus(result.message)
      } else {
        setWebhookStatus(`Failed to ${action} background service`)
      }
    } catch (error) {
      console.error('Background service control error:', error)
      setWebhookStatus(`Failed to ${action} background service`)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please sign in to continue</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Financial Advisor AI</h1>
          <p className="mt-2 text-gray-600">
            Let's set up your AI assistant by connecting your data sources
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-6">
            {/* Google Integration Status */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-6 w-6 text-green-500 mr-3" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Google Account</h3>
                  <p className="text-sm text-gray-500">Connected as {session.user?.email}</p>
                </div>
              </div>
              <div className="text-sm text-green-600 font-medium">Connected</div>
            </div>

            {/* HubSpot Integration Status */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                {hubspotConnected ? (
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-yellow-500 mr-3" />
                )}
                <div>
                  <h3 className="text-lg font-medium text-gray-900">HubSpot CRM</h3>
                  <p className="text-sm text-gray-500">
                    {hubspotConnected ? 'Connected to your HubSpot account' : 'Connect your HubSpot CRM'}
                  </p>
                </div>
              </div>
              {hubspotConnected ? (
                <div className="text-sm text-green-600 font-medium">Connected</div>
              ) : (
                <Button
                  onClick={() => window.location.href = '/api/hubspot/auth'}
                  variant="outline"
                  size="sm"
                >
                  Connect HubSpot
                </Button>
              )}
            </div>

            {/* Data Ingestion Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Import Your Data</h3>
              <p className="text-sm text-gray-600 mb-6">
                Import your Gmail emails and Google Calendar events to enable AI-powered insights and assistance.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Button
                  onClick={() => handleDataIngestion('gmail')}
                  disabled={isIngesting}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <Mail className="h-6 w-6 mb-2" />
                  <span>Import Gmail</span>
                </Button>

                <Button
                  onClick={() => handleDataIngestion('calendar')}
                  disabled={isIngesting}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <Calendar className="h-6 w-6 mb-2" />
                  <span>Import Calendar</span>
                </Button>

                <Button
                  onClick={() => handleDataIngestion('hubspot')}
                  disabled={isIngesting || !hubspotConnected}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <Users className="h-6 w-6 mb-2" />
                  <span>Import HubSpot</span>
                </Button>

                <Button
                  onClick={() => handleDataIngestion('all')}
                  disabled={isIngesting}
                  className="h-20 flex flex-col items-center justify-center bg-indigo-600 hover:bg-indigo-700"
                >
                  <Database className="h-6 w-6 mb-2" />
                  <span>Import All</span>
                </Button>
              </div>

              {ingestionStatus && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">{ingestionStatus}</p>
                </div>
              )}
            </div>

            {/* Webhook Management Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Real-time Monitoring</h3>
              <p className="text-sm text-gray-600 mb-6">
                Enable real-time monitoring of your Gmail, Calendar, and HubSpot for proactive AI assistance.
              </p>

              <div className="space-y-4">
                {/* Background Service Control */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <Activity className="h-6 w-6 text-blue-500 mr-3" />
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">Background Service</h4>
                      <p className="text-sm text-gray-500">
                        {backgroundServiceRunning ? 'Running - Processing events' : 'Stopped - No event processing'}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {backgroundServiceRunning ? (
                      <Button
                        onClick={() => handleBackgroundServiceControl('stop')}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <Square className="h-4 w-4 mr-1" />
                        Stop
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleBackgroundServiceControl('start')}
                        variant="outline"
                        size="sm"
                        className="text-green-600 border-green-300 hover:bg-green-50"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                    )}
                  </div>
                </div>

                {/* Webhook Polling Control */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <Activity className="h-6 w-6 text-purple-500 mr-3" />
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">Webhook Polling</h4>
                      <p className="text-sm text-gray-500">
                        {isWebhookRunning ? 'Active - Monitoring integrations' : 'Inactive - No monitoring'}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {isWebhookRunning ? (
                      <Button
                        onClick={() => handleWebhookControl('stop')}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <Square className="h-4 w-4 mr-1" />
                        Stop
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleWebhookControl('start')}
                        variant="outline"
                        size="sm"
                        className="text-green-600 border-green-300 hover:bg-green-50"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                    )}
                  </div>
                </div>

                {webhookStatus && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">{webhookStatus}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Continue Button */}
            <div className="border-t pt-6">
              <Button
                onClick={() => router.push('/chat')}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                Continue to AI Chat
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}