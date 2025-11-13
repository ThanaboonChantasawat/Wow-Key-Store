"use client"

import { useState, useEffect } from "react"
import { User, Shield, Crown, Ban, Check, Search, UserCircle2, Mail, Calendar, Activity, XCircle, CheckCircle, X, Edit2, Trash2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { getAllUsers, updateUserRole, updateAccountStatus, deleteUserAccount, UserProfile } from "@/lib/user-client"
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
  const [showUserModal, setShowUserModal] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [newRole, setNewRole] = useState<'buyer' | 'seller' | 'admin' | 'superadmin'>('buyer')
  const [newStatus, setNewStatus] = useState<'active' | 'suspended' | 'banned'>('active')
  const itemsPerPage = 10

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const allUsers = await getAllUsers()
      
      // Convert date strings back to Date objects
      const usersWithDates = allUsers.map(user => ({
        ...user,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
        lastLoginAt: new Date(user.lastLoginAt)
      }));
      
      setUsers(usersWithDates)
      
      // Get current user's role
      const current = usersWithDates.find(u => u.id === currentUser?.uid)
      if (current) {
        setCurrentUserRole(current.role)
      }
    } catch (error) {
      console.error("Error loading users:", error)
    } finally {
      setLoading(false)
    }
  }

  const openUserModal = (user: UserWithId) => {
    setSelectedUser(user)
    setNewRole(user.role as 'buyer' | 'seller' | 'admin' | 'superadmin')
    setNewStatus(user.accountStatus as 'active' | 'suspended' | 'banned')
    setShowUserModal(true)
  }

  const closeUserModal = () => {
    setShowUserModal(false)
    setSelectedUser(null)
  }

  const handleRoleChange = async () => {
    if (!selectedUser) return
    
    try {
      setIsUpdating(true)
      await updateUserRole(selectedUser.id, newRole)
      await loadUsers()
      // Update selected user
      setSelectedUser({ ...selectedUser, role: newRole })
      alert("เปลี่ยนบทบาทสำเร็จ")
    } catch (error) {
      console.error("Error updating role:", error)
      alert("เกิดข้อผิดพลาดในการเปลี่ยนบทบาท")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleStatusChange = async () => {
    if (!selectedUser) return
    
    try {
      setIsUpdating(true)
      await updateAccountStatus(selectedUser.id, newStatus)
      await loadUsers()
      // Update selected user
      setSelectedUser({ ...selectedUser, accountStatus: newStatus })
      alert("เปลี่ยนสถานะสำเร็จ")
    } catch (error) {
      console.error("Error updating status:", error)
      alert("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ")
    } finally {
      setIsUpdating(false)
    }
  }

  const openDeleteDialog = () => {
    if (!selectedUser) return
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
            ใช้งานปกติ
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
            แบน
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
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9800] mx-auto"></div>
          <p className="text-gray-500 mt-4">กำลังโหลด...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card className="p-12 text-center bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200">
          <div className="text-6xl mb-4 animate-bounce">👤</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">ไม่พบผู้ใช้</h3>
          <p className="text-gray-600 text-lg">ลองค้นหาใหม่อีกครั้ง</p>
        </Card>
      ) : (
        <>
          {/* Users Table */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-6 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-[#ff9800]" />
                ผู้ใช้ทั้งหมด ({users.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-200">
                    <th className="px-4 py-3 text-left font-bold text-gray-800 text-sm">ชื่อผู้ใช้</th>
                    <th className="px-4 py-3 text-center font-bold text-gray-800 text-sm">บทบาท</th>
                    <th className="px-4 py-3 text-center font-bold text-gray-800 text-sm">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((user) => (
                    <tr 
                      key={user.id} 
                      className="border-b border-gray-100 hover:bg-orange-50 transition-colors cursor-pointer"
                      onClick={() => openUserModal(user)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-900">{user.displayName}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">{user.email || "ไม่มีอีเมล"}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(user.accountStatus)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredUsers.length > 0 && (
              <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Page Info */}
                  <div className="text-sm text-gray-600">
                    หน้า {currentPage} จาก {totalPages} (แสดง {paginatedUsers.length} จาก {filteredUsers.length} คน)
                  </div>

                  {/* Pagination Buttons */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => {
                          setCurrentPage(prev => Math.max(1, prev - 1))
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        disabled={currentPage === 1}
                        variant="outline"
                        size="sm"
                        className="px-3"
                      >
                        ← ก่อนหน้า
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <Button
                                key={page}
                                onClick={() => {
                                  setCurrentPage(page)
                                  window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                className={`w-9 h-9 p-0 ${
                                  currentPage === page
                                    ? "bg-[#ff9800] hover:bg-[#e08800] text-white"
                                    : ""
                                }`}
                              >
                                {page}
                              </Button>
                            )
                          } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return (
                              <span key={page} className="px-2 text-gray-400">
                                ...
                              </span>
                            )
                          }
                          return null
                        })}
                      </div>

                      <Button
                        onClick={() => {
                          setCurrentPage(prev => Math.min(totalPages, prev + 1))
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        disabled={currentPage === totalPages}
                        variant="outline"
                        size="sm"
                        className="px-3"
                      >
                        ถัดไป →
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* User Management Modal */}
      {showUserModal && selectedUser && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={closeUserModal}
        >
          <div 
            className="max-w-lg w-full bg-white relative animate-in zoom-in-95 duration-300 rounded-xl shadow-xl" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 rounded-t-xl relative bg-gradient-to-r from-[#ff9800] to-[#f57c00]">
              {/* Close Button */}
              <button
                onClick={closeUserModal}
                className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors z-10"
              >
                <X className="w-4 h-4 text-white" />
              </button>

              <h3 className="text-xl font-bold text-white flex items-center gap-2 pr-8">
                <UserCircle2 className="w-6 h-6" />
                <div>
                  <div>จัดการผู้ใช้</div>
                  <div className="text-xs text-white/90 font-normal mt-0.5">
                    {selectedUser.displayName}
                  </div>
                </div>
              </h3>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* User Info Card */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <Mail className="w-3.5 h-3.5 text-gray-500" />
                    <span className="font-medium text-gray-700">อีเมล:</span>
                    <span className="text-gray-900 truncate">{selectedUser.email || "ไม่มีอีเมล"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                    <span className="font-medium text-gray-700">สมัครเมื่อ:</span>
                    <span className="text-gray-900">{selectedUser.createdAt.toLocaleDateString('th-TH')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Activity className="w-3.5 h-3.5 text-gray-500" />
                    <span className="font-medium text-gray-700">เข้าสู่ระบบล่าสุด:</span>
                    <span className="text-gray-900">{selectedUser.lastLoginAt.toLocaleDateString('th-TH')}</span>
                  </div>
                </div>
              </div>

              {/* Role and Status in Grid */}
              {canEditRole(selectedUser) && (
                <div className="grid grid-cols-2 gap-3">
                  {/* Role Management */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-800 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-[#ff9800]" />
                      บทบาท
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as 'buyer' | 'seller' | 'admin' | 'superadmin')}
                      className="w-full px-2 py-1.5 text-sm border-2 border-gray-200 rounded-lg focus:border-[#ff9800] focus:outline-none transition-colors"
                      disabled={isUpdating}
                    >
                      <option value="buyer">🎮 Buyer</option>
                      <option value="seller">👤 Seller</option>
                      {currentUserRole === 'superadmin' && (
                        <>
                          <option value="admin">🛡️ Admin</option>
                          {selectedUser.id === currentUser?.uid && (
                            <option value="superadmin">👑 Super Admin</option>
                          )}
                        </>
                      )}
                    </select>
                  </div>

                  {/* Status Management */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-800 flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-[#ff9800]" />
                      สถานะ
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as 'active' | 'suspended' | 'banned')}
                      className="w-full px-2 py-1.5 text-sm border-2 border-gray-200 rounded-lg focus:border-[#ff9800] focus:outline-none transition-colors"
                      disabled={isUpdating}
                    >
                      <option value="active">✅ ใช้งานปกติ</option>
                      <option value="suspended">⏸ พักการใช้งาน</option>
                      <option value="banned">🚫 แบน</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {canEditRole(selectedUser) && (selectedUser.role !== newRole || selectedUser.accountStatus !== newStatus) && (
                <div className="pt-2">
                  <Button
                    onClick={() => {
                      if (selectedUser.role !== newRole) handleRoleChange()
                      if (selectedUser.accountStatus !== newStatus) handleStatusChange()
                    }}
                    className="w-full bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white font-bold py-2"
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'กำลังบันทึก...' : '💾 บันทึกการเปลี่ยนแปลง'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
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
