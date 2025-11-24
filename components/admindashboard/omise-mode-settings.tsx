"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Key, TestTube, Zap, AlertTriangle, CheckCircle2 } from "lucide-react"

export function OmiseModeSettings() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)
  const [currentMode, setCurrentMode] = useState<'test' | 'live'>('test')
  const [hasTestKeys, setHasTestKeys] = useState(false)
  const [hasLiveKeys, setHasLiveKeys] = useState(false)
  
  // Test keys
  const [testPublicKey, setTestPublicKey] = useState('')
  const [testSecretKey, setTestSecretKey] = useState('')
  
  // Live keys
  const [livePublicKey, setLivePublicKey] = useState('')
  const [liveSecretKey, setLiveSecretKey] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/omise-mode')
      if (res.ok) {
        const data = await res.json()
        setCurrentMode(data.mode || 'test')
        setHasTestKeys(data.hasTestKeys || false)
        setHasLiveKeys(data.hasLiveKeys || false)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const switchMode = async (mode: 'test' | 'live') => {
    if (mode === 'live' && !hasLiveKeys && !livePublicKey) {
      toast({
        title: "ไม่สามารถเปลี่ยนเป็น Live Mode ได้",
        description: "กรุณากรอก Live API Keys ก่อน",
        variant: "destructive",
      })
      return
    }

    try {
      setSwitching(true)
      
      const payload: any = { mode }
      
      // Include keys if provided
      if (testPublicKey || testSecretKey) {
        payload.keys = payload.keys || {}
        payload.keys.test = {
          publicKey: testPublicKey,
          secretKey: testSecretKey,
        }
      }
      
      if (livePublicKey || liveSecretKey) {
        payload.keys = payload.keys || {}
        payload.keys.live = {
          publicKey: livePublicKey,
          secretKey: liveSecretKey,
        }
      }

      const res = await fetch('/api/admin/omise-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast({
          title: `✅ เปลี่ยนเป็น ${mode === 'test' ? 'Test' : 'Live'} Mode แล้ว`,
          description: mode === 'live' 
            ? '⚠️ ตอนนี้ใช้เงินจริง! กรุณาระมัดระวังในการทำธุรกรรม' 
            : 'ใช้สำหรับทดสอบระบบ ไม่มีการหักเงินจริง',
        })
        setCurrentMode(mode)
        setTestPublicKey('')
        setTestSecretKey('')
        setLivePublicKey('')
        setLiveSecretKey('')
        loadSettings()
      } else {
        const error = await res.json()
        toast({
          title: "เกิดข้อผิดพลาด",
          description: error.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setSwitching(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Current Mode */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Omise Payment Mode</CardTitle>
              <CardDescription>สลับระหว่าง Test Mode และ Live Mode</CardDescription>
            </div>
            <Badge 
              variant={currentMode === 'live' ? 'destructive' : 'secondary'}
              className="text-lg px-4 py-2"
            >
              {currentMode === 'test' ? (
                <><TestTube className="h-4 w-4 mr-2" /> Test Mode</>
              ) : (
                <><Zap className="h-4 w-4 mr-2" /> Live Mode</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Warning */}
          {currentMode === 'live' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">⚠️ Live Mode เปิดอยู่</p>
                  <p className="text-sm text-red-700 mt-1">
                    ระบบกำลังใช้เงินจริง! ธุรกรรมทั้งหมดจะมีการหักเงินจริง
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mode Selection */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Test Mode */}
            <Card className={currentMode === 'test' ? 'border-blue-500 border-2' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Test Mode
                  {currentMode === 'test' && (
                    <Badge variant="default" className="ml-2">Active</Badge>
                  )}
                </CardTitle>
                <CardDescription>สำหรับทดสอบระบบ ไม่มีการหักเงินจริง</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasTestKeys ? (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>มี Test Keys แล้ว</span>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label>Test Public Key</Label>
                      <Input
                        type="password"
                        placeholder="pkey_test_..."
                        value={testPublicKey}
                        onChange={(e) => setTestPublicKey(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Test Secret Key</Label>
                      <Input
                        type="password"
                        placeholder="skey_test_..."
                        value={testSecretKey}
                        onChange={(e) => setTestSecretKey(e.target.value)}
                      />
                    </div>
                  </>
                )}
                <Button
                  className="w-full"
                  variant={currentMode === 'test' ? 'outline' : 'default'}
                  onClick={() => switchMode('test')}
                  disabled={switching || currentMode === 'test'}
                >
                  {switching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {currentMode === 'test' ? 'กำลังใช้งาน' : 'เปลี่ยนเป็น Test Mode'}
                </Button>
              </CardContent>
            </Card>

            {/* Live Mode */}
            <Card className={currentMode === 'live' ? 'border-red-500 border-2' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-red-600" />
                  Live Mode
                  {currentMode === 'live' && (
                    <Badge variant="destructive" className="ml-2">Active</Badge>
                  )}
                </CardTitle>
                <CardDescription>ใช้เงินจริง! ต้องระมัดระวัง</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasLiveKeys ? (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>มี Live Keys แล้ว</span>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label>Live Public Key</Label>
                      <Input
                        type="password"
                        placeholder="pkey_..."
                        value={livePublicKey}
                        onChange={(e) => setLivePublicKey(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Live Secret Key</Label>
                      <Input
                        type="password"
                        placeholder="skey_..."
                        value={liveSecretKey}
                        onChange={(e) => setLiveSecretKey(e.target.value)}
                      />
                    </div>
                  </>
                )}
                <Button
                  className="w-full bg-red-600 hover:bg-red-700"
                  variant={currentMode === 'live' ? 'outline' : 'default'}
                  onClick={() => switchMode('live')}
                  disabled={switching || currentMode === 'live' || (!hasLiveKeys && !livePublicKey)}
                >
                  {switching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {currentMode === 'live' ? 'กำลังใช้งาน' : 'เปลี่ยนเป็น Live Mode'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="font-semibold text-blue-900 mb-2">📌 ข้อมูลสำคัญ:</p>
            <ul className="space-y-1 text-blue-800">
              <li>• <strong>Test Mode:</strong> ใช้สำหรับทดสอบ ไม่มีการหักเงินจริง</li>
              <li>• <strong>Live Mode:</strong> ใช้เงินจริง! ธุรกรรมทั้งหมดจะมีการหักเงินจริง</li>
              <li>• Recipient ที่สร้างใน Test Mode จะใช้ไม่ได้ใน Live Mode (ต้องสร้างใหม่)</li>
              <li>• ก่อนเปลี่ยนเป็น Live Mode ต้องยืนยันตัวตน (KYC) กับ Omise ก่อน</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
