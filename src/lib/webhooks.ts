import { prisma } from './prisma'
import { ingestGmailData, ingestCalendarData, ingestHubspotData } from './data-ingestion'

export interface WebhookEvent {
  id: string
  type: 'gmail' | 'calendar' | 'hubspot'
  userId: string
  data: any
  timestamp: Date
  processed: boolean
}

export class WebhookManager {
  private static instance: WebhookManager
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()

  static getInstance(): WebhookManager {
    if (!WebhookManager.instance) {
      WebhookManager.instance = new WebhookManager()
    }
    return WebhookManager.instance
  }

  // Start polling for a user's integrations
  async startPolling(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) return

    // Stop existing polling for this user
    this.stopPolling(userId)

    // Start Gmail polling if user has Google tokens
    if (user.accessToken) {
      this.startGmailPolling(userId, user.accessToken)
      this.startCalendarPolling(userId, user.accessToken)
    }

    // Start HubSpot polling if user has HubSpot token
    if (user.hubspotToken) {
      this.startHubspotPolling(userId, user.hubspotToken)
    }
  }

  // Stop polling for a user
  stopPolling(userId: string) {
    const gmailInterval = this.pollingIntervals.get(`gmail-${userId}`)
    const calendarInterval = this.pollingIntervals.get(`calendar-${userId}`)
    const hubspotInterval = this.pollingIntervals.get(`hubspot-${userId}`)

    if (gmailInterval) {
      clearInterval(gmailInterval)
      this.pollingIntervals.delete(`gmail-${userId}`)
    }

    if (calendarInterval) {
      clearInterval(calendarInterval)
      this.pollingIntervals.delete(`calendar-${userId}`)
    }

    if (hubspotInterval) {
      clearInterval(hubspotInterval)
      this.pollingIntervals.delete(`hubspot-${userId}`)
    }
  }

  // Gmail polling (every 5 minutes)
  private startGmailPolling(userId: string, accessToken: string) {
    const interval = setInterval(async () => {
      try {
        await this.checkGmailUpdates(userId, accessToken)
      } catch (error) {
        console.error('Gmail polling error:', error)
      }
    }, 5 * 60 * 1000) // 5 minutes

    this.pollingIntervals.set(`gmail-${userId}`, interval)
  }

  // Calendar polling (every 10 minutes)
  private startCalendarPolling(userId: string, accessToken: string) {
    const interval = setInterval(async () => {
      try {
        await this.checkCalendarUpdates(userId, accessToken)
      } catch (error) {
        console.error('Calendar polling error:', error)
      }
    }, 10 * 60 * 1000) // 10 minutes

    this.pollingIntervals.set(`calendar-${userId}`, interval)
  }

  // HubSpot polling (every 15 minutes)
  private startHubspotPolling(userId: string, hubspotToken: string) {
    const interval = setInterval(async () => {
      try {
        await this.checkHubspotUpdates(userId, hubspotToken)
      } catch (error) {
        console.error('HubSpot polling error:', error)
      }
    }, 15 * 60 * 1000) // 15 minutes

    this.pollingIntervals.set(`hubspot-${userId}`, interval)
  }

  // Check for new Gmail messages
  private async checkGmailUpdates(userId: string, accessToken: string) {
    try {
      // Get last check timestamp
      const lastCheck = await this.getLastCheckTime(userId, 'gmail')
      
      // Ingest new Gmail data
      const result = await ingestGmailData(userId, accessToken)
      
      if (result.success && result.processed > 0) {
        // Store webhook event
        await this.storeWebhookEvent({
          id: `gmail-${Date.now()}`,
          type: 'gmail',
          userId,
          data: { processed: result.processed },
          timestamp: new Date(),
          processed: false
        })

        // Update last check time
        await this.updateLastCheckTime(userId, 'gmail')
      }
    } catch (error) {
      console.error('Gmail update check failed:', error)
    }
  }

  // Check for new Calendar events
  private async checkCalendarUpdates(userId: string, accessToken: string) {
    try {
      const lastCheck = await this.getLastCheckTime(userId, 'calendar')
      
      const result = await ingestCalendarData(userId, accessToken)
      
      if (result.success && result.processed > 0) {
        await this.storeWebhookEvent({
          id: `calendar-${Date.now()}`,
          type: 'calendar',
          userId,
          data: { processed: result.processed },
          timestamp: new Date(),
          processed: false
        })

        await this.updateLastCheckTime(userId, 'calendar')
      }
    } catch (error) {
      console.error('Calendar update check failed:', error)
    }
  }

  // Check for new HubSpot data
  private async checkHubspotUpdates(userId: string, hubspotToken: string) {
    try {
      const lastCheck = await this.getLastCheckTime(userId, 'hubspot')
      
      const result = await ingestHubspotData(userId, hubspotToken)
      
      if (result.success && result.processed > 0) {
        await this.storeWebhookEvent({
          id: `hubspot-${Date.now()}`,
          type: 'hubspot',
          userId,
          data: { processed: result.processed },
          timestamp: new Date(),
          processed: false
        })

        await this.updateLastCheckTime(userId, 'hubspot')
      }
    } catch (error) {
      console.error('HubSpot update check failed:', error)
    }
  }

  // Store webhook event in database
  private async storeWebhookEvent(event: WebhookEvent) {
    try {
      const hasDatabase = process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== ''
      if (!hasDatabase || !prisma) {
        return
      }

      await prisma.webhookEvent.create({
        data: {
          id: event.id,
          type: event.type,
          userId: event.userId,
          data: event.data,
          timestamp: event.timestamp,
          processed: event.processed
        }
      })
    } catch (error) {
      console.error('Failed to store webhook event:', error)
    }
  }

  // Get last check time for a service
  private async getLastCheckTime(userId: string, service: string): Promise<Date> {
    try {
      const hasDatabase = process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== ''
      if (!hasDatabase || !prisma) {
        return new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
      }

      const lastCheck = await prisma.webhookEvent.findFirst({
        where: {
          userId,
          type: service as any
        },
        orderBy: { timestamp: 'desc' }
      })

      return lastCheck?.timestamp || new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
    } catch (error) {
      return new Date(Date.now() - 24 * 60 * 60 * 1000)
    }
  }

  // Update last check time
  private async updateLastCheckTime(userId: string, service: string) {
    // This is handled by storing the webhook event
  }

  // Process pending webhook events
  async processPendingEvents() {
    try {
      // Check if database is available
      const hasDatabase = process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== ''
      if (!hasDatabase || !prisma) {
        return
      }

      const pendingEvents = await prisma.webhookEvent.findMany({
        where: { processed: false },
        orderBy: { timestamp: 'asc' },
        take: 10
      })

      for (const event of pendingEvents) {
        await this.processWebhookEvent(event)
      }
    } catch (error) {
      console.error('Failed to process pending events:', error)
    }
  }

  // Process individual webhook event
  private async processWebhookEvent(event: any) {
    try {
      const hasDatabase = process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== ''
      if (!hasDatabase || !prisma) {
        return
      }

      // Mark as processed
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { processed: true }
      })

      // Trigger proactive actions based on event type
      await this.triggerProactiveActions(event)
    } catch (error) {
      console.error('Failed to process webhook event:', error)
    }
  }

  // Trigger proactive actions based on webhook events
  private async triggerProactiveActions(event: any) {
    try {
      const hasDatabase = process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== ''
      if (!hasDatabase || !prisma) {
        return
      }

      const user = await prisma.user.findUnique({
        where: { id: event.userId },
        include: { instructions: true }
      })

      if (!user) return

      // Check user's instructions for proactive actions
      for (const instruction of user.instructions) {
        if (this.shouldTriggerInstruction(instruction, event)) {
          await this.executeInstruction(instruction, event)
        }
      }
    } catch (error) {
      console.error('Failed to trigger proactive actions:', error)
    }
  }

  // Check if instruction should be triggered
  private shouldTriggerInstruction(instruction: any, event: any): boolean {
    // Simple rule matching - can be enhanced with more sophisticated logic
    const content = instruction.content.toLowerCase()
    
    if (event.type === 'gmail' && content.includes('email')) {
      return true
    }
    
    if (event.type === 'calendar' && content.includes('meeting')) {
      return true
    }
    
    if (event.type === 'hubspot' && content.includes('contact')) {
      return true
    }
    
    return false
  }

  // Execute instruction
  private async executeInstruction(instruction: any, event: any) {
    try {
      const hasDatabase = process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== ''
      if (!hasDatabase || !prisma) {
        return
      }

      // Create a task for the instruction
      await prisma.task.create({
        data: {
          userId: event.userId,
          title: `Proactive action: ${instruction.content}`,
          description: `Triggered by ${event.type} event`,
          status: 'PENDING',
          priority: 'MEDIUM',
          metadata: {
            instructionId: instruction.id,
            eventId: event.id,
            eventType: event.type
          }
        }
      })

      console.log(`Created proactive task for user ${event.userId}: ${instruction.content}`)
    } catch (error) {
      console.error('Failed to execute instruction:', error)
    }
  }
}

// Export singleton instance
export const webhookManager = WebhookManager.getInstance()