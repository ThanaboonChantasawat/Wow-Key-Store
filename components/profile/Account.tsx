"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useRef, useEffect } from "react";
import { updateProfile, updatePassword } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/components/firebase-config";
import {
  Pencil,
  Upload,
  Eye,
  EyeOff,
  Calendar,
  Mail,
  Phone,
  Shield,
  User,
  UserRoundCheck,
  Camera,
  Lock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  getUserProfile,
  updateUserProfile,
  UserProfile,
} from "@/lib/user-service";
import { FaGoogle, FaFacebook } from "react-icons/fa";

export function AccountContent() {
  const { user, isInitialized } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user profile from Firestore
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) {
        setProfileLoading(false);
        return;
      }

      try {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      } catch (error) {
        console.error("Error loading user profile:", error);
      } finally {
        setProfileLoading(false);
      }
    };

    if (isInitialized) {
      loadUserProfile();
    }
  }, [user, isInitialized]);

  // Check if user logged in with email/password
  const isEmailPasswordProvider = user?.providerData.some(
    (provider) => provider.providerId === "password"
  );

  const handleEditClick = () => {
    setIsEditing(true);
    setDisplayName(userProfile?.displayName || user?.displayName || "");
    setPhoneNumber(userProfile?.phoneNumber || "");
    setPhotoURL(userProfile?.photoURL || user?.photoURL || "");
    setNewPassword("");
    setConfirmPassword("");
    setMessage(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDisplayName("");
    setPhoneNumber("");
    setPhotoURL("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setLoading(true);
      const storageRef = ref(
        storage,
        `profile-images/${user.uid}/${Date.now()}_${file.name}`
      );
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setPhotoURL(url);
      setMessage({ type: "success", text: "อัปโหลดรูปภาพสำเร็จ" });
    } catch (error) {
      console.error("Error uploading image:", error);
      setMessage({ type: "error", text: "อัปโหลดรูปภาพไม่สำเร็จ" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setMessage(null);

      // Update Firebase Auth profile (displayName and photoURL)
      if (displayName !== user.displayName || photoURL !== user.photoURL) {
        await updateProfile(user, {
          displayName: displayName || user.displayName,
          photoURL: photoURL || user.photoURL,
        });
      }

      // Update Firestore profile
      await updateUserProfile(user.uid, {
        displayName: displayName || user.displayName || "",
        photoURL: photoURL || user.photoURL,
        phoneNumber: phoneNumber || null,
      });

      // Update password if provided
      if (newPassword && isEmailPasswordProvider) {
        if (newPassword !== confirmPassword) {
          setMessage({ type: "error", text: "รหัสผ่านไม่ตรงกัน" });
          setLoading(false);
          return;
        }
        if (newPassword.length < 6) {
          setMessage({
            type: "error",
            text: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
          });
          setLoading(false);
          return;
        }
        await updatePassword(user, newPassword);
      }

      setMessage({ type: "success", text: "บันทึกข้อมูลสำเร็จ" });
      setIsEditing(false);

      // Reload profile data
      setTimeout(async () => {
        const updatedProfile = await getUserProfile(user.uid);
        setUserProfile(updatedProfile);
      }, 500);
    } catch (error) {
      console.error("Error updating profile:", error);
      let errorMessage = "เกิดข้อผิดพลาดในการบันทึกข้อมูล";

      if (error instanceof Error && "code" in error) {
        if (error.code === "auth/requires-recent-login") {
          errorMessage = "กรุณาเข้าสู่ระบบใหม่เพื่อเปลี่ยนรหัสผ่าน";
        } else if (error.code === "auth/weak-password") {
          errorMessage = "รหัสผ่านไม่ปลอดภัยเพียงพอ";
        }
      }

      setMessage({ type: "error", text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  if (!isInitialized || profileLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="h-6 bg-gray-200 rounded w-64"></div>
            <div className="space-y-3">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl shadow-lg p-12 text-center border border-orange-100">
          <div className="w-20 h-20 bg-gradient-to-br from-[#ff9800] to-[#f57c00] rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-[#292d32] mb-4">
            กรุณาเข้าสู่ระบบ
          </h2>
          <p className="text-gray-600 text-lg">คุณต้องเข้าสู่ระบบเพื่อดูข้อมูลบัญชี</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Card with Gradient */}
      <div className="bg-gradient-to-br from-orange-500 via-[#ff9800] to-red-500 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10 flex items-center gap-6">
          <div className="relative group">
            <Avatar className="h-28 w-28 border-4 border-white shadow-xl ring-4 ring-white/20">
              {(userProfile?.photoURL || user?.photoURL) && (
                <AvatarImage
                  src={(userProfile?.photoURL || user?.photoURL) || undefined}
                  alt={userProfile?.displayName || user?.displayName || ""}
                />
              )}
              <AvatarFallback className="bg-white text-[#ff9800] text-4xl font-bold">
                {(userProfile?.displayName || user?.displayName)?.charAt(0) ||
                  (userProfile?.email || user?.email)?.charAt(0) ||
                  "U"}
              </AvatarFallback>
            </Avatar>
            {isEditing && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                disabled={loading}
              >
                <Camera className="w-8 h-8 text-white" />
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2 drop-shadow-lg">
              {userProfile?.displayName || user?.displayName || "ผู้ใช้"}
            </h1>
            <p className="text-white/90 text-lg mb-3 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              {userProfile?.email || user?.email}
            </p>
            <div className="flex items-center gap-3">
              <span
                className={`px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg ${
                  userProfile?.role === "seller"
                    ? "bg-blue-600 text-white"
                    : userProfile?.role === "admin"
                    ? "bg-purple-600 text-white"
                    : "bg-white text-[#ff9800]"
                }`}
              >
                {userProfile?.role === "seller"
                  ? "👤 ผู้ขาย"
                  : userProfile?.role === "admin"
                  ? "⚡ ผู้ดูแลระบบ"
                  : "🎮 ผู้ซื้อ"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Information Card */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-[#ff9800] to-[#f57c00] rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-[#292d32]">
            ข้อมูลส่วนตัว
          </h2>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
              message.type === "success"
                ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border border-green-200 shadow-sm"
                : "bg-gradient-to-r from-red-50 to-pink-50 text-red-800 border border-red-200 shadow-sm"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Picture */}
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-100">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Avatar className="h-20 w-20 ring-4 ring-orange-200 shadow-lg">
                  {(isEditing
                    ? photoURL
                    : userProfile?.photoURL || user?.photoURL) && (
                    <AvatarImage
                      src={
                        (isEditing
                          ? photoURL
                          : userProfile?.photoURL || user?.photoURL) || undefined
                      }
                      alt={userProfile?.displayName || user?.displayName || ""}
                    />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-[#ff9800] to-[#f57c00] text-white text-2xl font-bold">
                    {(userProfile?.displayName || user?.displayName)?.charAt(0) ||
                      (userProfile?.email || user?.email)?.charAt(0) ||
                      "U"}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-gradient-to-br from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white rounded-full p-2.5 shadow-lg transition-all duration-200 hover:scale-110"
                    disabled={loading}
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#292d32] mb-1">รูปโปรไฟล์</h3>
                {isEditing ? (
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    คลิกที่ไอคอนเพื่ออัปโหลดรูปใหม่
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">แก้ไขข้อมูลเพื่อเปลี่ยนรูป</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-[#292d32] mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-[#ff9800]" />
              ข้อมูลพื้นฐาน
            </h3>

          <div className="space-y-5">
            {/* Display Name Field */}
            <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4 items-start sm:items-center bg-white rounded-lg p-4 border border-gray-200 hover:border-orange-200 transition-colors">
              <label className="text-[#292d32] font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-[#ff9800]" />
                ชื่อผู้ใช้
              </label>
              {isEditing ? (
                <Input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="กรอกชื่อผู้ใช้"
                  className="max-w-md border-2 focus:border-[#ff9800] transition-colors"
                  disabled={loading}
                />
              ) : (
                <div className="text-[#292d32] font-medium break-words">
                  {userProfile?.displayName || user?.displayName || "-"}
                </div>
              )}
            </div>

            {/* Email Field (Read-only) */}
            <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4 items-start sm:items-center bg-white rounded-lg p-4 border border-gray-200">
              <label className="text-[#292d32] font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#ff9800]" />
                อีเมล
              </label>
              <div className="text-[#292d32] font-medium break-words flex items-center gap-2">
                {userProfile?.email || user?.email || "-"}
                {user?.providerData[0]?.providerId === 'google.com' && (
                  <FaGoogle className="w-4 h-4 text-red-500" title="เข้าสู่ระบบด้วย Google" />
                )}
                {user?.providerData[0]?.providerId === 'facebook.com' && (
                  <FaFacebook className="w-4 h-4 text-blue-600" title="เข้าสู่ระบบด้วย Facebook" />
                )}
              </div>
            </div>

            {/* Phone Number Field */}
            <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4 items-start sm:items-center bg-white rounded-lg p-4 border border-gray-200 hover:border-orange-200 transition-colors">
              <label className="text-[#292d32] font-semibold flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#ff9800]" />
                เบอร์โทรศัพท์
              </label>
              {isEditing ? (
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="กรอกเบอร์โทรศัพท์"
                  className="max-w-md border-2 focus:border-[#ff9800] transition-colors"
                  disabled={loading}
                />
              ) : (
                <div className="text-[#292d32] font-medium break-words">
                  {userProfile?.phoneNumber || "-"}
                </div>
              )}
            </div>

            {/* Role */}
            <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4 items-start sm:items-center bg-white rounded-lg p-4 border border-gray-200">
              <label className="text-[#292d32] font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#ff9800]" />
                บทบาท
              </label>
              <div className="flex items-center gap-2">
                <span
                  className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${
                    userProfile?.role === "seller"
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                      : userProfile?.role === "admin"
                      ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white"
                      : "bg-gradient-to-r from-gray-400 to-gray-500 text-white"
                  }`}
                >
                  {userProfile?.role === "seller"
                    ? "👤 ผู้ขาย"
                    : userProfile?.role === "admin"
                    ? "⚡ ผู้ดูแลระบบ"
                    : "🎮 ผู้ซื้อ"}
                </span>
              </div>
            </div>

            {/* Member Since */}
            <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4 items-start sm:items-center bg-white rounded-lg p-4 border border-gray-200">
              <label className="text-[#292d32] font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#ff9800]" />
                สมาชิกตั้งแต่
              </label>
              <div className="text-[#292d32] font-medium break-words">
                {userProfile?.createdAt 
                  ? new Date(userProfile.createdAt).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : "-"}
              </div>
            </div>
          </div>
          </div>

          {/* Password Fields (Only for email/password login) */}
          {isEditing && isEmailPasswordProvider && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 mt-6">
              <div className="flex items-center gap-2 mb-6">
                <Lock className="w-5 h-5 text-blue-600" />
                <h4 className="text-xl font-bold text-[#292d32]">
                  เปลี่ยนรหัสผ่าน (ไม่บังคับ)
                </h4>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4 items-start sm:items-center bg-white rounded-lg p-4 border border-gray-200">
                  <label className="text-[#292d32] font-semibold">
                    รหัสผ่านใหม่
                  </label>
                  <div className="relative max-w-md">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                      className="border-2 focus:border-blue-500 transition-colors pr-10"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4 items-start sm:items-center bg-white rounded-lg p-4 border border-gray-200">
                  <label className="text-[#292d32] font-semibold">
                    ยืนยันรหัสผ่าน
                  </label>
                  <div className="relative max-w-md">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่านอีกครั้ง"
                      className="border-2 focus:border-blue-500 transition-colors pr-10"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Last Sign In */}
          {!isEditing && user.metadata.lastSignInTime && (
            <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4 items-start sm:items-center bg-white rounded-lg p-4 border border-gray-200 mt-6">
              <label className="text-[#292d32] font-semibold flex items-center gap-2">
                <UserRoundCheck className="h-4 w-4 text-[#ff9800]" />
                เข้าสู่ระบบล่าสุด
              </label>
              <div className="text-[#292d32] font-medium">
                {new Date(user.metadata.lastSignInTime).toLocaleDateString(
                  "th-TH",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-6 flex gap-4 flex-wrap">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSave}
                  className="cursor-pointer bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white px-10 py-6 rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      บันทึกข้อมูล
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="cursor-pointer px-10 py-6 rounded-xl text-lg font-bold border-2 hover:bg-gray-50 transition-all duration-200 hover:scale-105"
                  disabled={loading}
                >
                  ยกเลิก
                </Button>
              </>
            ) : (
              <Button
                onClick={handleEditClick}
                className="cursor-pointer bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white px-10 py-6 rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center gap-2"
              >
                <Pencil className="w-5 h-5" />
                แก้ไขข้อมูล
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Account Button */}
      <div className="flex justify-center">
        <Button
          variant="destructive"
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-12 py-6 rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled
        >
          🗑️ ลบบัญชีผู้ใช้ (เร็วๆ นี้)
        </Button>
      </div>
    </div>
  );
}
