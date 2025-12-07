"use client"

import { useState, useEffect } from "react"
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageSquare,
  RefreshCcw,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Copy,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-context"
import { format } from "date-fns"
import { th } from "date-fns/locale"

interface DeliveredItem {
  index: number
  itemName: string
  email?: string
  username?: string
  password?: string
  emailPassword?: string
  additionalInfo?: string
}

interface OrderData {
  id: string
  items: Array<{productId: string; name: string; quantity?: number}>
  deliveredItems?: DeliveredItem[]
}

interface Dispute {
  id: string
  orderId: string
  orderNumber: string
  userId: string
  type: string
  subject: string
  description: string
  status: string
  createdAt: string
  updatedAt: string
  resolution?: string
  sellerResponse?: string
  evidence?: string[]
}

export function SellerReports() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [reports, setReports] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  
  // Action Dialog State
  const [selectedReport, setSelectedReport] = useState<Dispute | null>(null)
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [actionType, setActionType] = useState<'refund' | 'reject' | 'new_code'>('refund')
  const [responseMessage, setResponseMessage] = useState("")
  const [newCode, setNewCode] = useState("")
  const [submitting, setSubmitting] = useState(false)
  
  // New Code Dialog State
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [loadingOrder, setLoadingOrder] = useState(false)
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [newCodes, setNewCodes] = useState<{[key: number]: {type: 'email' | 'username', value: string, password: string, emailPassword?: string}}>({})  

  const fetchReports = async () => {
    if (!user) return
    try {
      setLoading(true)
      console.log('[Seller Reports] Fetching reports...')
      const token = await user.getIdToken()
      const res = await fetch('/api/seller/reports', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      console.log('[Seller Reports] API Response:', data)
      if (data.success) {
        console.log(`[Seller Reports] Loaded ${data.disputes.length} reports`)
        setReports(data.disputes)
      } else {
        console.error('[Seller Reports] API Error:', data.error)
      }
    } catch (error) {
      console.error("Error fetching reports:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดึงข้อมูลการแจ้งปัญหาได้",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [user])

  const fetchOrderData = async (orderId: string) => {
    if (!user) return
    try {
      setLoadingOrder(true)
      const token = await user.getIdToken()
      const res = await fetch(`/api/orders/${orderId}?sellerView=true`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (data.success) {
        setOrderData(data.order)
        // Pre-select all items
        if (data.order.deliveredItems) {
          setSelectedItems(data.order.deliveredItems.map((_: any, idx: number) => idx))
        } else if (data.order.items) {
          setSelectedItems(data.order.items.map((_: any, idx: number) => idx))
        }
      }
    } catch (error) {
      console.error("Error fetching order:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดึงข้อมูลคำสั่งซื้อได้",
        variant: "destructive"
      })
    } finally {
      setLoadingOrder(false)
    }
  }

  const openActionDialog = (report: Dispute, action: 'refund' | 'reject' | 'new_code') => {
    setSelectedReport(report)
    setActionType(action)
    setResponseMessage("")
    setNewCode("")
    setNewCodes({})
    setSelectedItems([])
    setOrderData(null)
    
    if (action === 'new_code') {
      fetchOrderData(report.orderId)
    }
    
    setShowActionDialog(true)
  }

  const handleAction = async () => {
    if (!selectedReport || !user) return
    if (!responseMessage.trim()) {
      toast({
        title: "กรุณาระบุข้อความตอบกลับ",
        variant: "destructive"
      })
      return
    }
    
    if (actionType === 'new_code') {
      if (selectedItems.length === 0) {
        toast({
          title: "กรุณาเลือกรายการที่จะส่งรหัสใหม่",
          variant: "destructive"
        })
        return
      }
      
      // Validate that all selected items have new codes
      for (const idx of selectedItems) {
        if (!newCodes[idx] || !newCodes[idx].value || !newCodes[idx].password) {
          toast({
            title: "กรุณากรอกข้อมูลให้ครบถ้วน",
            description: `รายการที่ ${idx + 1} ยังไม่มีข้อมูลครบ`,
            variant: "destructive"
          })
          return
        }
      }
    }

    try {
      setSubmitting(true)
      const token = await user.getIdToken()
      
      let requestBody: any = {
        disputeId: selectedReport.id,
        orderId: selectedReport.orderId,
        action: actionType,
        response: responseMessage
      }
      
      if (actionType === 'new_code') {
        // Build deliveredItems array for selected items
        const updatedItems = selectedItems.map(idx => {
          const code = newCodes[idx]
          const item: any = {
            index: idx,
            itemName: orderData?.deliveredItems?.[idx]?.itemName || orderData?.items?.[idx]?.name || `รายการที่ ${idx + 1}`,
            password: code.password
          }
          
          if (code.type === 'email') {
            item.email = code.value
          } else {
            item.username = code.value
          }
          
          if (code.emailPassword) {
            item.emailPassword = code.emailPassword
          }
          
          return item
        })
        
        requestBody.deliveredItems = updatedItems
      }
      
      const res = await fetch('/api/seller/reports/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      })

      const data = await res.json()
      if (data.success) {
        toast({
          title: "ดำเนินการสำเร็จ",
          description: "ระบบได้บันทึกการดำเนินการเรียบร้อยแล้ว"
        })
        setShowActionDialog(false)
        setOrderData(null)
        setSelectedItems([])
        setNewCodes({})
        fetchReports()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถดำเนินการได้",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">รอดำเนินการ</Badge>
      case 'investigating':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">กำลังตรวจสอบ</Badge>
      case 'resolved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">แก้ไขแล้ว</Badge>
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">ปฏิเสธ</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getProblemTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'wrong_code': 'รหัสผิด/ไม่ถูกต้อง',
      'code_not_working': 'รหัสใช้ไม่ได้',
      'code_already_used': 'รหัสถูกใช้ไปแล้ว',
      'no_code_received': 'ไม่ได้รับรหัส',
      'seller_unresponsive': 'ผู้ขายไม่ตอบ',
      'other': 'อื่น ๆ'
    }
    return types[type] || type
  }

  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.subject.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Calculate stats
  const pendingCount = reports.filter(r => r.status === 'pending').length
  const resolvedCount = reports.filter(r => r.status === 'resolved').length

  return (
    <div className="space-y-6">
      {/* Header - Orange Gradient */}
      <div className="bg-gradient-to-r from-orange-500 via-[#ff9800] to-red-500 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold mb-2 drop-shadow-lg flex items-center gap-3">
            <AlertTriangle className="w-10 h-10" />
            รายการแจ้งปัญหา
          </h2>
          <p className="text-white/90 text-lg">จัดการข้อร้องเรียนและปัญหาจากลูกค้า</p>
        </div>
      </div>

      {/* Stats Cards / Filters */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'all' ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-500 ring-offset-2' : 'bg-white border-transparent hover:border-orange-200'}`}
          onClick={() => setStatusFilter('all')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'all' ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${statusFilter === 'all' ? 'text-orange-900' : 'text-gray-900'}`}>{reports.length}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${statusFilter === 'all' ? 'text-orange-700' : 'text-gray-500'}`}>ทั้งหมด</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'pending' ? 'bg-yellow-50 border-yellow-500 ring-2 ring-yellow-500 ring-offset-2' : 'bg-white border-transparent hover:border-yellow-200'}`}
          onClick={() => setStatusFilter('pending')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'pending' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${statusFilter === 'pending' ? 'text-yellow-900' : 'text-gray-900'}`}>{pendingCount}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${statusFilter === 'pending' ? 'text-yellow-700' : 'text-gray-500'}`}>รอดำเนินการ</div>
            </div>
          </div>
        </Card>

        <Card 
          className={`p-3 sm:p-4 lg:p-6 border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer ${statusFilter === 'resolved' ? 'bg-green-50 border-green-500 ring-2 ring-green-500 ring-offset-2' : 'bg-white border-transparent hover:border-green-200'}`}
          onClick={() => setStatusFilter('resolved')}
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors ${statusFilter === 'resolved' ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0">
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${statusFilter === 'resolved' ? 'text-green-900' : 'text-gray-900'}`}>{resolvedCount}</div>
              <div className={`text-xs sm:text-sm font-medium truncate ${statusFilter === 'resolved' ? 'text-green-700' : 'text-gray-500'}`}>แก้ไขแล้ว</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="ค้นหาเลขคำสั่งซื้อ หรือ หัวข้อปัญหา..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Reports List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">กำลังโหลดข้อมูล...</div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">ไม่มีรายการแจ้งปัญหา</h3>
            <p className="text-gray-500">ร้านค้าของคุณยังไม่มีการแจ้งปัญหาจากลูกค้า</p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <Card key={report.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="bg-gray-50/50 pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-gray-700">{report.orderNumber}</span>
                      {getStatusBadge(report.status)}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {format(new Date(report.createdAt), "d MMM yyyy HH:mm", { locale: th })}
                    </div>
                  </div>
                  {report.status === 'pending' && (
                    <Button 
                      size="sm" 
                      onClick={() => openActionDialog(report, 'refund')}
                    >
                      จัดการปัญหา
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ปัญหาที่พบ</span>
                    <div className="font-medium text-red-600 flex items-center gap-2 mt-1">
                      <AlertTriangle className="w-4 h-4" />
                      {getProblemTypeLabel(report.type)}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">รายละเอียด</span>
                    <p className="text-gray-700 mt-1 bg-gray-50 p-3 rounded-lg text-sm">
                      <span className="font-bold block mb-1">{report.subject}</span>
                      {report.description}
                    </p>
                  </div>

                  {report.status === 'resolved' && (
                    <div className="bg-green-50 border border-green-100 p-3 rounded-lg mt-2">
                      <span className="text-xs font-bold text-green-700 uppercase tracking-wider block mb-1">การแก้ไขปัญหา</span>
                      <div className="text-sm text-green-800">
                        <span className="font-medium">
                          {report.resolution === 'refund' && 'คืนเงินให้ลูกค้า'}
                          {report.resolution === 'new_code' && 'ส่งรหัสใหม่'}
                          {report.resolution === 'dismiss' && 'ปฏิเสธคำร้อง'}
                        </span>
                        {report.sellerResponse && (
                          <p className="mt-1 text-green-700/80">"{report.sellerResponse}"</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>จัดการปัญหาคำสั่งซื้อ {selectedReport?.orderNumber}</DialogTitle>
            <DialogDescription>
              เลือกวิธีการแก้ไขปัญหาให้กับลูกค้า
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>เลือกการดำเนินการ</Label>
              <Select 
                value={actionType} 
                onValueChange={(v: any) => {
                  setActionType(v)
                  if (v === 'new_code' && selectedReport) {
                    fetchOrderData(selectedReport.orderId)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refund">คืนเงินเต็มจำนวน (Refund)</SelectItem>
                  <SelectItem value="new_code">ส่งรหัสใหม่ (Send New Code)</SelectItem>
                  <SelectItem value="reject">ปฏิเสธคำร้อง (Reject)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {actionType === 'new_code' && (
              <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                {loadingOrder ? (
                  <div className="text-center py-4 text-gray-500">กำลังโหลดข้อมูลคำสั่งซื้อ...</div>
                ) : orderData ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">รายการสินค้า ({orderData.deliveredItems?.length || orderData.items?.length} รายการ)</Label>
                      <p className="text-sm text-gray-600">เลือกรายการที่ต้องการส่งรหัสใหม่</p>
                    </div>

                    {(orderData.deliveredItems || orderData.items)?.map((item: any, idx: number) => {
                      const isSelected = selectedItems.includes(idx)
                      const itemName = item.itemName || item.name
                      
                      return (
                        <div key={idx} className="border rounded-lg p-4 bg-white">
                          <div className="flex items-start gap-3 mb-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedItems([...selectedItems, idx])
                                  setNewCodes({...newCodes, [idx]: {type: 'email', value: '', password: ''}})
                                } else {
                                  setSelectedItems(selectedItems.filter(i => i !== idx))
                                  const newCodesUpdated = {...newCodes}
                                  delete newCodesUpdated[idx]
                                  setNewCodes(newCodesUpdated)
                                }
                              }}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">{itemName}</div>
                              {item.email && <div className="text-sm text-gray-600">เดิม: {item.email}</div>}
                              {item.username && <div className="text-sm text-gray-600">เดิม: {item.username}</div>}
                            </div>
                          </div>

                          {isSelected && (
                            <div className="pl-7 space-y-3 border-t pt-3">
                              <div className="space-y-2">
                                <Label className="text-sm">ประเภทข้อมูล</Label>
                                <Select
                                  value={newCodes[idx]?.type || 'email'}
                                  onValueChange={(v: 'email' | 'username') => {
                                    setNewCodes({
                                      ...newCodes,
                                      [idx]: {...(newCodes[idx] || {value: '', password: ''}), type: v}
                                    })
                                  }}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem value="username">Username</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-sm">
                                  {newCodes[idx]?.type === 'email' ? 'Email' : 'Username'} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  value={newCodes[idx]?.value || ''}
                                  onChange={(e) => {
                                    setNewCodes({
                                      ...newCodes,
                                      [idx]: {...(newCodes[idx] || {type: 'email', password: ''}), value: e.target.value}
                                    })
                                  }}
                                  placeholder={newCodes[idx]?.type === 'email' ? 'example@email.com' : 'username123'}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-sm">Password <span className="text-red-500">*</span></Label>
                                <Input
                                  value={newCodes[idx]?.password || ''}
                                  onChange={(e) => {
                                    setNewCodes({
                                      ...newCodes,
                                      [idx]: {...(newCodes[idx] || {type: 'email', value: ''}), password: e.target.value}
                                    })
                                  }}
                                  placeholder="รหัสผ่านของบัญชี"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-sm">Email Password (ถ้ามี)</Label>
                                <Input
                                  value={newCodes[idx]?.emailPassword || ''}
                                  onChange={(e) => {
                                    setNewCodes({
                                      ...newCodes,
                                      [idx]: {...(newCodes[idx] || {type: 'email', value: '', password: ''}), emailPassword: e.target.value}
                                    })
                                  }}
                                  placeholder="รหัสผ่านของอีเมล (ถ้ามี)"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </>
                ) : null}
              </div>
            )}

            <div className="space-y-2">
              <Label>ข้อความถึงลูกค้า</Label>
              <Textarea 
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder={
                  actionType === 'refund' ? "เช่น ขออภัยในความไม่สะดวก ทางเรายินดีคืนเงินให้ครับ" :
                  actionType === 'new_code' ? "เช่น ขออภัยครับ รหัสเก่าน่าจะมีปัญหา นี่คือรหัสใหม่ครับ" :
                  "เช่น ตรวจสอบแล้วรหัสใช้งานได้ปกติครับ รบกวนลองใหม่อีกครั้ง"
                }
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>ยกเลิก</Button>
            <Button onClick={handleAction} disabled={submitting}>
              {submitting ? "กำลังบันทึก..." : "ยืนยันการดำเนินการ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
