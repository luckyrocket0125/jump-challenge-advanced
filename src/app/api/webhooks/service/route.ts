import { NextRequest, NextResponse } from 'next/server'
import { backgroundService } from '@/lib/background-service'

export async function GET() {
  try {
    const isRunning = backgroundService.isServiceRunning()
    
    return NextResponse.json({ 
      isRunning,
      message: isRunning ? 'Background service is running' : 'Background service is stopped'
    })

  } catch (error) {
    console.error('Background service status error:', error)
    return NextResponse.json(
      { error: 'Failed to get background service status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === 'start') {
      backgroundService.start()
      return NextResponse.json({ 
        success: true, 
        message: 'Background service started' 
      })
    } else if (action === 'stop') {
      backgroundService.stop()
      return NextResponse.json({ 
        success: true, 
        message: 'Background service stopped' 
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "start" or "stop"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Background service control error:', error)
    return NextResponse.json(
      { error: 'Failed to control background service' },
      { status: 500 }
    )
  }
}