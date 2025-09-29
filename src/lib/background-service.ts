import { webhookManager } from './webhooks'

class BackgroundService {
  private static instance: BackgroundService
  private isRunning = false
  private processInterval: NodeJS.Timeout | null = null

  static getInstance(): BackgroundService {
    if (!BackgroundService.instance) {
      BackgroundService.instance = new BackgroundService()
    }
    return BackgroundService.instance
  }

  start() {
    if (this.isRunning) return

    this.isRunning = true
    console.log('🚀 Starting background service...')

    // Process pending webhook events every 30 seconds
    this.processInterval = setInterval(async () => {
      try {
        await webhookManager.processPendingEvents()
      } catch (error) {
        console.error('Background service error:', error)
      }
    }, 30 * 1000) // 30 seconds

    console.log('✅ Background service started')
  }

  stop() {
    if (!this.isRunning) return

    this.isRunning = false
    
    if (this.processInterval) {
      clearInterval(this.processInterval)
      this.processInterval = null
    }

    console.log('🛑 Background service stopped')
  }

  isServiceRunning(): boolean {
    return this.isRunning
  }
}

export const backgroundService = BackgroundService.getInstance()