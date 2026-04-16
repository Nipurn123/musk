import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, ScreenShare, ScreenShareOff, PhoneOff, X, Loader2, Volume2, Sparkles, Waves } from 'lucide-react'
import { Room, RoomEvent } from 'livekit-client'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

const API_URL = typeof window !== 'undefined' ? window.location.origin : ''

function AudioVisualizer({ isActive }: { isActive: boolean }) {
  return (
    <div className="flex items-center justify-center gap-0.5 h-6">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={twMerge(
            'w-1 rounded-full transition-all duration-150',
            isActive 
              ? 'bg-gradient-to-t from-primary to-accent animate-pulse' 
              : 'bg-textMuted/30'
          )}
          style={{
            height: isActive ? `${Math.random() * 16 + 8}px` : '4px',
            animationDelay: `${i * 100}ms`,
            animationDuration: '0.4s',
          }}
        />
      ))}
    </div>
  )
}

export function AIAssistantButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [isMuted, setIsMuted] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  const roomRef = useRef<Room | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const speakingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const startSession = useCallback(async () => {
    try {
      setStatus('connecting')
      setError(null)

      let res = await fetch(`${API_URL}/api/ai-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      })

      if (!res.ok) {
        await new Promise(resolve => setTimeout(resolve, 3000))
        res = await fetch(`${API_URL}/api/ai-assistant`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start' }),
        })
      }

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to create session')
      }

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      })

      room.on(RoomEvent.Connected, () => {
        console.log('Connected to room')
        setStatus('connected')
        setIsSpeaking(true)
        speakingIntervalRef.current = setInterval(() => {
          setIsSpeaking(Math.random() > 0.3)
        }, 500)
      })

      room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        console.log('Connection quality:', quality, participant?.identity)
      })

      room.on(RoomEvent.SignalConnected, () => {
        console.log('Signal connected')
      })

      room.on(RoomEvent.Reconnecting, () => {
        console.log('Reconnecting...')
        setError('Connection lost, reconnecting...')
      })

      room.on(RoomEvent.Reconnected, () => {
        console.log('Reconnected!')
        setError(null)
      })

      room.on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from room')
        setStatus('idle')
        setIsScreenSharing(false)
        setIsMuted(false)
        setIsSpeaking(false)
        if (speakingIntervalRef.current) {
          clearInterval(speakingIntervalRef.current)
        }
      })

      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === 'audio' && participant.identity !== room.localParticipant.identity) {
          console.log('Audio track from:', participant.identity)
          
          if (audioRef.current) {
            audioRef.current.remove()
          }
          
          const audioElement = track.attach() as HTMLAudioElement
          audioRef.current = audioElement
          document.body.appendChild(audioElement)
          audioElement.play().catch(console.error)
        }
      })

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((el: HTMLMediaElement) => el.remove())
      })

      room.on(RoomEvent.DataReceived, (payload, participant) => {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload))
          console.log('Received data from agent:', data)
          
          if (data.type === 'set_prompt') {
            window.dispatchEvent(new CustomEvent('ai:set-prompt', { 
              detail: { prompt: data.prompt } 
            }))
          } else if (data.type === 'submit_prompt') {
            window.dispatchEvent(new CustomEvent('ai:submit-prompt'))
          }
        } catch (err) {
          console.error('Failed to parse data:', err)
        }
      })

      await room.connect(data.url, data.token)
      console.log('Room connected successfully!')
      
      roomRef.current = room
      setRoomId(data.roomId)

      await room.localParticipant.setMicrophoneEnabled(true)
      setIsMuted(false)

      console.log('Microphone enabled')

    } catch (err) {
      console.error('Failed to start session:', err)
      setError(err instanceof Error ? err.message : 'Connection failed')
      setStatus('error')
    }
  }, [])

  const stopSession = useCallback(async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect()
      roomRef.current = null
    }

    if (audioRef.current) {
      audioRef.current.remove()
      audioRef.current = null
    }

    if (roomId) {
      await fetch(`${API_URL}/api/ai-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop', roomId }),
      })
    }

    setStatus('idle')
    setRoomId(null)
    setIsScreenSharing(false)
    setIsMuted(false)
    setError(null)
    setIsSpeaking(false)
    if (speakingIntervalRef.current) {
      clearInterval(speakingIntervalRef.current)
    }
  }, [roomId])

  const toggleMute = async () => {
    if (!roomRef.current) return
    const newMuted = !isMuted
    await roomRef.current.localParticipant.setMicrophoneEnabled(!newMuted)
    setIsMuted(newMuted)
  }

  const toggleScreenShare = async () => {
    if (!roomRef.current) return
    await roomRef.current.localParticipant.setScreenShareEnabled(!isScreenSharing)
    setIsScreenSharing(!isScreenSharing)
  }

  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect()
      }
      if (speakingIntervalRef.current) {
        clearInterval(speakingIntervalRef.current)
      }
    }
  }, [])

  const cn = (...args: unknown[]) => twMerge(clsx(args))

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed z-[9999] w-16 h-16 rounded-full',
          'bottom-8 right-8',
          'flex items-center justify-center',
          'transition-all duration-500 ease-out',
          'group relative overflow-hidden',
          status === 'connected' 
            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30' 
            : status === 'connecting'
            ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30'
            : 'bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40',
          'hover:scale-110 active:scale-95',
          isOpen && 'opacity-0 scale-75 pointer-events-none'
        )}
      >
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className={cn(
          'absolute inset-0 rounded-full opacity-0',
          status === 'connected' && 'animate-pulse bg-emerald-400/30',
          status === 'connecting' && 'animate-pulse bg-amber-400/30'
        )} />
        
        {status === 'connecting' ? (
          <Loader2 className="w-7 h-7 text-white animate-spin relative z-10" />
        ) : status === 'connected' ? (
          <div className="relative z-10 flex items-center gap-1">
            <Waves className="w-7 h-7 text-white" />
          </div>
        ) : (
          <Mic className="w-7 h-7 text-white relative z-10" />
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div 
          className={cn(
            'fixed z-[9998] w-[360px]',
            'bottom-24 right-6',
            'rounded-3xl overflow-hidden',
            'animate-scale-in origin-bottom-right',
            'shadow-2xl shadow-black/50'
          )}
        >
          {/* Glassmorphic background */}
          <div className="absolute inset-0 bg-surface/95 backdrop-blur-xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="absolute inset-0 border border-white/10 rounded-3xl" />
          
          {/* Content */}
          <div className="relative">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className={cn(
                  'relative w-12 h-12 rounded-2xl flex items-center justify-center',
                  'transition-all duration-500',
                  status === 'connected' 
                    ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20' 
                    : status === 'connecting'
                    ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20'
                    : 'bg-gradient-to-br from-primary/20 to-accent/20'
                )}>
                  {status === 'connected' ? (
                    <>
                      <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 animate-ping" />
                      <Volume2 className="w-6 h-6 text-emerald-400 relative z-10" />
                    </>
                  ) : status === 'connecting' ? (
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                  ) : (
                    <Sparkles className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-base font-semibold text-textPrimary">AI Assistant</p>
                  <p className="text-sm text-textMuted">
                    {status === 'connected' 
                      ? 'Listening...' 
                      : status === 'connecting'
                      ? 'Connecting...'
                      : 'Ready to help'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2.5 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <X className="w-5 h-5 text-textMuted group-hover:text-textPrimary transition-colors" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-5">
              {error && (
                <div className="p-4 bg-error/10 border border-error/20 rounded-2xl">
                  <p className="text-sm text-error">{error}</p>
                </div>
              )}

              {status === 'idle' && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Mic className="w-10 h-10 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-base text-textPrimary font-medium">Start Voice Session</p>
                    <p className="text-sm text-textMuted max-w-[280px] mx-auto">
                      Talk to your AI assistant. Share your screen for visual context.
                    </p>
                  </div>
                  <button
                    onClick={startSession}
                    className={cn(
                      'w-full py-4 rounded-2xl font-semibold text-white',
                      'bg-gradient-to-r from-primary to-accent',
                      'hover:opacity-90 transition-all duration-300',
                      'active:scale-[0.98]',
                      'shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30'
                    )}
                  >
                    Start Voice Assistant
                  </button>
                </div>
              )}

              {status === 'connecting' && (
                <div className="text-center py-10 space-y-4">
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
                    <div className="absolute inset-2 rounded-full bg-amber-500/30 animate-pulse" />
                    <div className="relative w-full h-full rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-base text-textPrimary font-medium">Connecting...</p>
                    <p className="text-sm text-textMuted">Setting up your AI assistant</p>
                  </div>
                </div>
              )}

              {status === 'connected' && (
                <>
                  {/* Audio Visualizer */}
                  <div className="flex flex-col items-center py-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-3 h-3 rounded-full transition-colors duration-300',
                        isSpeaking ? 'bg-emerald-400 animate-pulse' : 'bg-textMuted/30'
                      )} />
                      <AudioVisualizer isActive={isSpeaking && !isMuted} />
                      <div className={cn(
                        'w-3 h-3 rounded-full transition-colors duration-300',
                        isSpeaking ? 'bg-emerald-400 animate-pulse' : 'bg-textMuted/30'
                      )} />
                    </div>
                    <p className="text-sm text-textMuted">
                      {isMuted ? 'Microphone muted' : 'Speak naturally to interact'}
                    </p>
                  </div>

                  {/* Status badges */}
                  <div className="flex items-center gap-2 justify-center">
                    <div className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300',
                      isScreenSharing 
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-white/5 text-textMuted border border-white/10'
                    )}>
                      {isScreenSharing ? (
                        <ScreenShare className="w-4 h-4" />
                      ) : (
                        <ScreenShareOff className="w-4 h-4" />
                      )}
                      Screen
                    </div>
                    <div className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300',
                      !isMuted 
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-white/5 text-textMuted border border-white/10'
                    )}>
                      {!isMuted ? (
                        <Mic className="w-4 h-4" />
                      ) : (
                        <MicOff className="w-4 h-4" />
                      )}
                      Mic
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-4 pt-2">
                    <button
                      onClick={toggleScreenShare}
                      className={cn(
                        'w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300',
                        isScreenSharing 
                          ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-white/5 hover:bg-white/10 text-textMuted border border-white/10'
                      )}
                    >
                      {isScreenSharing ? <ScreenShare className="w-6 h-6" /> : <ScreenShareOff className="w-6 h-6" />}
                    </button>
                    
                    <button
                      onClick={stopSession}
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white flex items-center justify-center transition-all duration-300 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 active:scale-95"
                    >
                      <PhoneOff className="w-7 h-7" />
                    </button>

                    <button
                      onClick={toggleMute}
                      className={cn(
                        'w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300',
                        !isMuted 
                          ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-error/15 hover:bg-error/25 text-error border border-error/30'
                      )}
                    >
                      {!isMuted ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                    </button>
                  </div>

                  <p className="text-xs text-center text-textMuted/60 pt-1">
                    AI can see your screen when shared
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
