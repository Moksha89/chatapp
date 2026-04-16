import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { QRCodeSVG } from 'qrcode.react'
import { MessageCircle, Smartphone, Globe } from 'lucide-react'

type LoginMode = 'qr' | 'phone'

export default function LoginPage() {
  const { login } = useAuth()
  const [mode, setMode] = useState<LoginMode>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [qrToken, setQrToken] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined)

  // QR code polling
  useEffect(() => {
    if (mode !== 'qr') return
    
    const generateQr = async () => {
      try {
        const { token } = await api.generateQr()
        setQrToken(token)

        // Poll for scan
        pollRef.current = setInterval(async () => {
          try {
            const status = await api.checkQrStatus(token)
            if (status.status === 'authenticated' && status.accessToken && status.user) {
              clearInterval(pollRef.current)
              login(status.accessToken, status.user)
            } else if (status.status === 'expired') {
              clearInterval(pollRef.current)
              generateQr() // Regenerate
            }
          } catch {}
        }, 2000)
      } catch {
        setError('Failed to generate QR code')
      }
    }

    generateQr()
    return () => clearInterval(pollRef.current)
  }, [mode, login])

  const handleSendOtp = async () => {
    setError('')
    setLoading(true)
    try {
      await api.sendOtp(phone)
      setStep('otp')
    } catch (e: any) {
      setError(e.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setError('')
    setLoading(true)
    try {
      const deviceId = `web-${Date.now()}`
      const result = await api.verifyOtp(phone, otp, deviceId)
      login(result.accessToken, result.user)
    } catch (e: any) {
      setError(e.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ChatApp</h1>
          <p className="text-gray-500 mt-1">Sign in to start chatting</p>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 mb-6 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setMode('phone')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
              mode === 'phone' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Phone
          </button>
          <button
            onClick={() => setMode('qr')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
              mode === 'qr' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Globe className="w-4 h-4" />
            QR Code
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {mode === 'phone' ? (
          <div className="space-y-4">
            {step === 'phone' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1234567890"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                  />
                </div>
                <button
                  onClick={handleSendOtp}
                  disabled={!phone || loading}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-center text-2xl tracking-widest"
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                  />
                  <p className="text-xs text-gray-400 mt-1">OTP sent to {phone}</p>
                </div>
                <button
                  onClick={handleVerifyOtp}
                  disabled={otp.length < 6 || loading}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </button>
                <button
                  onClick={() => { setStep('phone'); setOtp('') }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  Change phone number
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-500">Scan this QR code from the ChatApp mobile app</p>
            <div className="flex justify-center py-4">
              {qrToken ? (
                <QRCodeSVG value={qrToken} size={200} />
              ) : (
                <div className="w-48 h-48 bg-gray-100 rounded-xl animate-pulse" />
              )}
            </div>
            <p className="text-xs text-gray-400">QR code refreshes automatically</p>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center mt-6">
          Dev OTP: 123456
        </p>
      </div>
    </div>
  )
}
