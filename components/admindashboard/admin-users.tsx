"use client"

import { useState, useEffect } from "react"
import { User, Shield, Crown, Ban, Check, Edit2, Trash2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { getAllUsers, updateUserRole, updateAccountStatus, deleteUserAccount, UserProfile } from "@/lib/user-service"
import { useAuth } from "@/components/auth-context"

interface UserWithId extends UserProfile {
  id: string;
}

export function AdminUsers() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserWithId[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<UserWithId | null>(null)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [newRole, setNewRole] = useState<'buyer' | 'seller' | 'admin' | 'superadmin'>('buyer')
  const [newStatus, setNewStatus] = useState<'active' | 'suspended' | 'banned'>('active')
  const [currentUserRole, setCurrentUserRole] = useState<string>('')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const allUsers = await getAllUsers()
      setUsers(allUsers)
      
      // Get current user's role
      const current = allUsers.find(u => u.id === currentUser?.uid)
      if (current) {
        setCurrentUserRole(current.role)
      }
    } catch (error) {
      console.error("Error loading users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async () => {
    if (!selectedUser) return
    
    try {
      await updateUserRole(selectedUser.id, newRole)
      await loadUsers()
      setShowRoleDialog(false)
      setSelectedUser(null)
    } catch (error) {
      console.error("Error updating role:", error)
      alert("เกิดข้อผิดพลาดในการเปลี่ยนบทบาท")
    }
  }

  const handleStatusChange = async () => {
    if (!selectedUser) return
    
    try {
      await updateAccountStatus(selectedUser.id, newStatus)
      await loadUsers()
      setShowStatusDialog(false)
      setSelectedUser(null)
    } catch (error) {
      console.error("Error updating status:", error)
      alert("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ")
    }
  }

  const openRoleDialog = (user: UserWithId) => {
    setSelectedUser(user)
    setNewRole(user.role)
    setShowRoleDialog(true)
  }

  const openStatusDialog = (user: UserWithId) => {
    setSelectedUser(user)
    setNewStatus(user.accountStatus)
    setShowStatusDialog(true)
  }

  const openDeleteDialog = (user: UserWithId) => {
    setSelectedUser(user)
    setDeleteConfirmText("")
    setShowDeleteDialog(true)
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return
    if (deleteConfirmText !== "ลบบัญชี") {
      alert("กรุณาพิมพ์ข้อความยืนยันให้ถูกต้อง")
      return
    }

    try {
      setIsDeleting(true)
      await deleteUserAccount(selectedUser.id)
      await loadUsers()
      setShowDeleteDialog(false)
      setSelectedUser(null)
      setDeleteConfirmText("")
      alert("ลบบัญชีผู้ใช้สำเร็จ")
    } catch (error) {
      console.error("Error deleting user:", error)
      alert("เกิดข้อผิดพลาดในการลบบัญชี")
    } finally {
      setIsDeleting(false)
    }
  }

  const canEditRole = (targetUser: UserWithId): boolean => {
    // Super Admin can edit anyone except other Super Admins
    if (currentUserRole === 'superadmin') {
      return targetUser.role !== 'superadmin' || targetUser.id === currentUser?.uid
    }
    // Regular Admin cannot edit any admin roles
    if (currentUserRole === 'admin') {
      return targetUser.role === 'buyer' || targetUser.role === 'seller'
    }
    return false
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "superadmin":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-600 text-white flex items-center gap-1 justify-center">
            <Crown className="w-3 h-3" />
            Super Admin
          </span>
        )
      case "admin":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-purple-600 text-white flex items-center gap-1 justify-center">
            <Shield className="w-3 h-3" />
            Admin
          </span>
        )
      case "seller":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            👤 Seller
          </span>
        )
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-gray-400 to-gray-500 text-white">
            🎮 Buyer
          </span>
        )
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1 justify-center">
            <Check className="w-3 h-3" />
            ใช้งานอยู่
          </span>
        )
      case "suspended":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
            ⏸ พักการใช้งาน
          </span>
        )
      case "banned":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1 justify-center">
            <Ban className="w-3 h-3" />
            ถูกระงับ
          </span>
        )
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">-</span>
    }
  }

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPages = Math.ceil(filteredUsers.length / 10)
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * 10, currentPage * 10)

  return (
    <div className="space-y-6">
      {/* Header - Orange Gradient */}
      <div className="bg-gradient-to-r from-orange-500 via-[#ff9800] to-red-500 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold mb-2 drop-shadow-lg flex items-center gap-3">
            <User className="w-10 h-10" />
            จัดการผู้ใช้
          </h2>
          <p className="text-white/90 text-lg">จัดการบัญชีผู้ใช้และสิทธิ์การเข้าถึงในระบบ</p>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="p-4">
        <div className="w-full">
          <Input 
            type="search" 
            placeholder="🔍 ค้นหาผู้ใช้..." 
            className="w-full border-2 focus:border-[#ff9800]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9800]"></div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          {/* Desktop Table View */}
          <Card className="hidden lg:block overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left font-bold text-gray-800">อีเมล</th>
                  <th className="px-6 py-4 text-left font-bold text-gray-800">ชื่อผู้ใช้</th>
                  <th className="px-6 py-4 text-center font-bold text-gray-800">บทบาท</th>
                  <th className="px-6 py-4 text-center font-bold text-gray-800">สมัครเมื่อ</th>
                  <th className="px-6 py-4 text-center font-bold text-gray-800">สถานะ</th>
                  <th className="px-6 py-4 text-center font-bold text-gray-800">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800">{user.email || "ไม่มีอีเมล"}</td>
                    <td className="px-6 py-4 text-gray-800">{user.displayName}</td>
                    <td className="px-6 py-4 text-center">{getRoleBadge(user.role)}</td>
                    <td className="px-6 py-4 text-center text-gray-800">
                      {user.createdAt.toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(user.accountStatus)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {canEditRole(user) && (
                          <>
                            <button 
                              onClick={() => openRoleDialog(user)}
                              className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600"
                              title="เปลี่ยนบทบาท"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => openStatusDialog(user)}
                              className="p-2 hover:bg-orange-50 rounded-lg transition-colors text-orange-600"
                              title="เปลี่ยนสถานะ"
                            >
                              <Shield className="h-4 w-4" />
                            </button>
                            {currentUser && user.id !== currentUser.uid && (
                              <button 
                                onClick={() => openDeleteDialog(user)}
                                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                                title="ลบบัญชี"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                        {!canEditRole(user) && (
                          <span className="text-xs text-gray-400">ไม่สามารถแก้ไข</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {paginatedUsers.map((user) => (
              <Card key={user.id} className="p-4 border-2 hover:shadow-xl transition-all hover:border-[#ff9800]">
                <div className="space-y-3">
                  {/* User Info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{user.displayName}</p>
                      <p className="text-sm text-gray-600 truncate">{user.email || "ไม่มีอีเมล"}</p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    {getRoleBadge(user.role)}
                    {getStatusBadge(user.accountStatus)}
                  </div>

                  {/* Date */}
                  <div className="text-xs text-gray-500">
                    📅 สมัครเมื่อ: {user.createdAt.toLocaleDateString('th-TH')}
                  </div>

                  {/* Action Buttons */}
                  {canEditRole(user) && (
                    <div className="flex gap-2 pt-2 border-t border-gray-200">
                      <Button
                        onClick={() => openRoleDialog(user)}
                        size="sm"
                        variant="outline"
                        className="flex-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        บทบาท
                      </Button>
                      <Button
                        onClick={() => openStatusDialog(user)}
                        size="sm"
                        variant="outline"
                        className="flex-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        สถานะ
                      </Button>
                      {currentUser && user.id !== currentUser.uid && (
                        <Button
                          onClick={() => openDeleteDialog(user)}
                          size="sm"
                          variant="outline"
                          className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          ลบ
                        </Button>
                      )}
                    </div>
                  )}
                  {!canEditRole(user) && (
                    <div className="text-center py-2 text-xs text-gray-400 border-t border-gray-200">
                      ไม่สามารถแก้ไขได้
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <Card className="p-12 text-center bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200">
              <div className="text-6xl mb-4 animate-bounce">👤</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">ไม่พบผู้ใช้</h3>
              <p className="text-gray-600 text-lg">ลองค้นหาใหม่อีกครั้ง</p>
            </Card>
          )}

          {/* Pagination */}
          <Card className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-800 text-center sm:text-left">
                หน้า {currentPage} จาก {totalPages} (แสดง {paginatedUsers.length} จาก {filteredUsers.length} คน)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="border-2"
                >
                  ก่อนหน้า
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="border-2"
                >
                  ถัดไป
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}      {/* Role Change Dialog */}
      {showRoleDialog && selectedUser && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setShowRoleDialog(false)}
        >
          <Card className="max-w-md w-full bg-white relative animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={() => setShowRoleDialog(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700 z-10"
            >
              <span className="text-xl">×</span>
            </button>

            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3 pr-8">
                <span className="text-3xl">👤</span>
                เปลี่ยนบทบาทผู้ใช้
              </h3>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">ผู้ใช้:</p>
                <p className="font-semibold text-gray-900">{selectedUser.displayName}</p>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  บทบาทใหม่
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'buyer' | 'seller' | 'admin' | 'superadmin')}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#ff9800] focus:outline-none transition-colors"
                >
                  <option value="buyer">🎮 Buyer - ผู้ซื้อ</option>
                  <option value="seller">👤 Seller - ผู้ขาย</option>
                  {currentUserRole === 'superadmin' && (
                    <>
                      <option value="admin">🛡️ Admin - ผู้ดูแลระบบ</option>
                      {selectedUser.id === currentUser?.uid && (
                        <option value="superadmin">👑 Super Admin - ผู้ดูแลระบบสูงสุด</option>
                      )}
                    </>
                  )}
                </select>
                {currentUserRole === 'superadmin' && (
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Super Admin สามารถเปลี่ยนบทบาทได้ทุกระดับ ยกเว้น Super Admin อื่น
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-200 flex gap-3">
              <Button
                onClick={() => setShowRoleDialog(false)}
                variant="outline"
                className="flex-1 border-2"
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleRoleChange}
                className="flex-1 bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white font-bold shadow-md"
              >
                บันทึก
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Status Change Dialog */}
      {showStatusDialog && selectedUser && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setShowStatusDialog(false)}
        >
          <Card className="max-w-md w-full bg-white relative animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={() => setShowStatusDialog(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700 z-10"
            >
              <span className="text-xl">×</span>
            </button>

            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3 pr-8">
                <span className="text-3xl">🔒</span>
                เปลี่ยนสถานะบัญชี
              </h3>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">ผู้ใช้:</p>
                <p className="font-semibold text-gray-900">{selectedUser.displayName}</p>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  สถานะใหม่
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as 'active' | 'suspended' | 'banned')}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#ff9800] focus:outline-none transition-colors"
                >
                  <option value="active">✅ Active - ใช้งานปกติ</option>
                  <option value="suspended">⏸ Suspended - พักการใช้งาน</option>
                  <option value="banned">🚫 Banned - ระงับการใช้งาน</option>
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-200 flex gap-3">
              <Button
                onClick={() => setShowStatusDialog(false)}
                variant="outline"
                className="flex-1 border-2"
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleStatusChange}
                className="flex-1 bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white font-bold shadow-md"
              >
                บันทึก
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete User Dialog */}
      {showDeleteDialog && selectedUser && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => {
            if (!isDeleting) {
              setShowDeleteDialog(false)
              setDeleteConfirmText("")
            }
          }}
        >
          <Card className="max-w-md w-full bg-white relative animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={() => {
                setShowDeleteDialog(false)
                setDeleteConfirmText("")
              }}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700 z-10"
              disabled={isDeleting}
            >
              <span className="text-xl">×</span>
            </button>

            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-red-600 flex items-center gap-3 pr-8">
                <AlertCircle className="w-7 h-7" />
                ยืนยันการลบบัญชีผู้ใช้
              </h3>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-semibold mb-2">
                  ⚠️ คำเตือน: การลบบัญชีผู้ใช้นี้จะลบข้อมูลทั้งหมด!
                </p>
                <div className="text-red-700 text-sm space-y-1">
                  <p>• ข้อมูลส่วนตัวและโปรไฟล์</p>
                  <p>• ร้านค้าและสินค้าทั้งหมด (ถ้ามี)</p>
                  <p>• ประวัติการสั่งซื้อ</p>
                  <p>• การดำเนินการนี้ไม่สามารถย้อนกลับได้!</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-1">ผู้ใช้ที่จะลบ:</p>
                <p className="font-semibold text-gray-900">{selectedUser.displayName}</p>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  พิมพ์ <span className="font-bold text-red-600">ลบบัญชี</span> เพื่อยืนยัน
                </label>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="พิมพ์ 'ลบบัญชี' ที่นี่"
                  className="text-center font-medium border-2"
                  disabled={isDeleting}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-200 flex gap-3">
              <Button
                onClick={() => {
                  setShowDeleteDialog(false)
                  setDeleteConfirmText("")
                }}
                variant="outline"
                className="flex-1 border-2"
                disabled={isDeleting}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleDeleteUser}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold shadow-md"
                disabled={isDeleting || deleteConfirmText !== "ลบบัญชี"}
              >
                {isDeleting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    กำลังลบ...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    ลบบัญชี
                  </div>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
