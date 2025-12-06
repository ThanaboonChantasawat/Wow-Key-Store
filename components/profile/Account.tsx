"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useRef, useEffect } from "react";
import { 
  updateProfile, 
  updatePassword, 
  updateEmail,
  deleteUser, 
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  FacebookAuthProvider,
  reauthenticateWithPopup,
  sendEmailVerification
} from "firebase/auth";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
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
  Trash2,
} from "lucide-react";
import {
  getUserProfile,
  updateUserProfile,
  UserProfile,
  deleteUserAccount,
  checkEmailExists,
} from "@/lib/user-client";
import { FaGoogle, FaFacebook } from "react-icons/fa";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function AccountContent() {
  const { user, isInitialized, logout } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReauthDialog, setShowReauthDialog] = useState(false);
  const [reauthPassword, setReauthPassword] = useState("");
  const [showReauthPassword, setShowReauthPassword] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
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

  // Check if user logged in with Google
  const isGoogleLogin = user?.providerData.some(
    (provider) => provider.providerId === "google.com"
  );

  const handleEditClick = () => {
    setIsEditing(true);
    setDisplayName(userProfile?.displayName || user?.displayName || "");
    setEmail(userProfile?.email || user?.email || "");
    setPhoneNumber(userProfile?.phoneNumber || "");
    setPhotoURL(userProfile?.photoURL || user?.photoURL || "");
    setNewPassword("");
    setConfirmPassword("");
    setMessage(null);
    setShowChangePassword(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDisplayName("");
    setPhoneNumber("");
    setPhotoURL("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage(null);
    setShowChangePassword(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setLoading(true);
      
      // Delete old profile image if exists
      if (user.photoURL && user.photoURL.includes('firebasestorage.googleapis.com')) {
        try {
          const decodedUrl = decodeURIComponent(user.photoURL);
          const pathMatch = decodedUrl.match(/\/o\/(.+?)\?/);
          
          if (pathMatch && pathMatch[1]) {
            const filePath = pathMatch[1];
            const oldImageRef = ref(storage, filePath);
            await deleteObject(oldImageRef);
            console.log('Old profile image deleted successfully');
          }
        } catch (deleteError) {
          console.error('Error deleting old profile image:', deleteError);
          // Continue with upload even if delete fails
        }
      }
      
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

  const handleSendVerificationEmail = async () => {
    if (!user) return;

    try {
      setSendingVerification(true);
      setMessage(null);

      await sendEmailVerification(user);
      
      setMessage({ 
        type: "success", 
        text: "ส่งอีเมลยืนยันสำเร็จ! กรุณาตรวจสอบกล่องจดหมายของคุณ" 
      });
    } catch (error) {
      console.error("Error sending verification email:", error);
      let errorMessage = "เกิดข้อผิดพลาดในการส่งอีเมลยืนยัน";
      
      if (error instanceof Error) {
        if (error.message.includes("auth/too-many-requests")) {
          errorMessage = "ส่งอีเมลบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
        }
      }
      
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setSendingVerification(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setMessage(null);

      // Validate email for social login users AND email/password users if they change it
      if (email && email.trim() !== '') {
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          setMessage({ type: "error", text: "รูปแบบอีเมลไม่ถูกต้อง" });
          setLoading(false);
          return;
        }

        // Check if email is already in use (only if changed)
        if (email !== (userProfile?.email || user.email)) {
          const emailExists = await checkEmailExists(email);
          if (emailExists) {
            setMessage({ type: "error", text: "อีเมลนี้ถูกใช้งานแล้วในระบบ" });
            setLoading(false);
            return;
          }
        }
      } else if (!isEmailPasswordProvider) {
         // Social login users must provide email if they are editing it (and it was empty)
         // But wait, if they clear it? Maybe allow clearing? 
         // The original code required it.
         if (!email || email.trim() === '') {
            setMessage({ type: "error", text: "กรุณากรอกอีเมล" });
            setLoading(false);
            return;
         }
      }

      // Update Firebase Auth profile (displayName and photoURL)
      if (displayName !== user.displayName || photoURL !== user.photoURL) {
        await updateProfile(user, {
          displayName: displayName || user.displayName,
          photoURL: photoURL || user.photoURL,
        });
      }

      // Check if email changed
      const emailChanged = email && email !== (userProfile?.email || user.email);

      // If email changed for Email/Password provider, update Auth email
      if (emailChanged && isEmailPasswordProvider) {
        await updateEmail(user, email);
        await sendEmailVerification(user);
      }

      // Update Firestore profile
      await updateUserProfile(user.uid, {
        displayName: displayName || user.displayName || "",
        email: email || userProfile?.email || user?.email,
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

      // If email was changed for social login, show message about verification
      if (emailChanged) {
        setMessage({ 
          type: "success", 
          text: "บันทึกข้อมูลสำเร็จ! อีเมลสำหรับการติดต่อได้ถูกอัปเดตเป็น " + email + " แล้ว" 
        });
      } else {
        setMessage({ type: "success", text: "บันทึกข้อมูลสำเร็จ" });
      }

      setIsEditing(false);
      setShowChangePassword(false);

      // Reload profile data
      setTimeout(async () => {
        const updatedProfile = await getUserProfile(user.uid);
        setUserProfile(updatedProfile);
      }, 500);
    } catch (error) {
      console.error("Error updating profile:", error);
      let errorMessage = "เกิดข้อผิดพลาดในการบันทึกข้อมูล";

      if (error instanceof Error) {
        if (error.message.includes("auth/requires-recent-login")) {
          errorMessage = "กรุณาเข้าสู่ระบบใหม่เพื่อเปลี่ยนรหัสผ่านหรืออีเมล";
        } else if (error.message.includes("auth/email-already-in-use")) {
          errorMessage = "อีเมลนี้ถูกใช้งานแล้วในระบบ (Auth)";
        } else if (error.message.includes("auth/invalid-email")) {
          errorMessage = "รูปแบบอีเมลไม่ถูกต้อง";
        }
      }

      setMessage({ type: "error", text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (deleteConfirmText !== "ลบบัญชี") {
      setMessage({ type: "error", text: "กรุณาพิมพ์ข้อความยืนยันให้ถูกต้อง" });
      return;
    }

    try {
      setIsDeleting(true);
      
      // Delete from Firestore first
      await deleteUserAccount(user.uid);
      
      // Then delete Firebase Auth account
      await deleteUser(user);
      
      // Logout and redirect
      await logout();
      window.location.href = "/";
    } catch (error) {
      console.error("Error deleting account:", error);
      const errorMessage = "เกิดข้อผิดพลาดในการลบบัญชี";
      
      if (error instanceof Error) {
        if (error.message.includes("auth/requires-recent-login")) {
          // Need to re-authenticate
          setShowDeleteDialog(false);
          setShowReauthDialog(true);
          setIsDeleting(false);
          return;
        }
      }
      
      setMessage({ type: "error", text: errorMessage });
      setShowDeleteDialog(false);
      setDeleteConfirmText("");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReauthenticate = async () => {
    if (!user) return;

    try {
      setIsDeleting(true);
      
      // Get provider data
      const providerId = user.providerData[0]?.providerId;

      if (providerId === "password") {
        // Re-authenticate with email/password
        if (!reauthPassword) {
          setMessage({ type: "error", text: "กรุณากรอกรหัสผ่าน" });
          setIsDeleting(false);
          return;
        }

        const credential = EmailAuthProvider.credential(
          user.email!,
          reauthPassword
        );
        await reauthenticateWithCredential(user, credential);
      } else if (providerId === "google.com") {
        // Re-authenticate with Google
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
      } else if (providerId === "facebook.com") {
        // Re-authenticate with Facebook
        const provider = new FacebookAuthProvider();
        await reauthenticateWithPopup(user, provider);
      }

      // After successful re-authentication, delete account
      await deleteUserAccount(user.uid);
      await deleteUser(user);
      await logout();
      window.location.href = "/";
      
    } catch (error) {
      console.error("Error re-authenticating:", error);
      let errorMessage = "เกิดข้อผิดพลาดในการยืนยันตัวตน";
      
      if (error instanceof Error) {
        if (error.message.includes("auth/wrong-password")) {
          errorMessage = "รหัสผ่านไม่ถูกต้อง";
        } else if (error.message.includes("auth/popup-closed-by-user")) {
          errorMessage = "คุณปิดหน้าต่างยืนยันตัวตน";
        }
      }
      
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setIsDeleting(false);
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

  // แสดง "กรุณาเข้าสู่ระบบ" เฉพาะเมื่อ auth initialized แล้วและไม่มี user
  if (isInitialized && !user) {
    return (
      <div className="h-full flex items-center justify-center min-h-[50vh]">
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl shadow-lg p-12 text-center border border-orange-100 max-w-md w-full mx-auto">
          <div className="w-20 h-20 bg-gradient-to-br from-[#ff9800] to-[#f57c00] rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
            <AlertCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-[#292d32] mb-4">
            กรุณาเข้าสู่ระบบ
          </h2>
          <p className="text-gray-600 text-lg">
            คุณต้องเข้าสู่ระบบเพื่อดูข้อมูลบัญชี
          </p>
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
            <p className="text-white/90 text-lg mb-3 flex items-center gap-2 flex-wrap">
              <Mail className="w-5 h-5" />
              <span>{userProfile?.email || user?.email || "ยังไม่ได้กรอกอีเมล"}</span>
              {user?.email && !user.emailVerified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-400/90 text-yellow-900 text-xs font-bold rounded-full shadow-sm">
                  <AlertCircle className="w-3 h-3" />
                  ยังไม่ยืนยันอีเมล
                </span>
              )}
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
          {/* Warning for missing email */}
          {!userProfile?.email && !user?.email && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-orange-300 rounded-xl p-5 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="text-3xl animate-pulse">📧</div>
                <div className="flex-1">
                  <h4 className="font-bold text-orange-900 mb-2 text-lg">กรุณากรอกอีเมลของคุณ</h4>
                  <p className="text-sm text-orange-800 mb-3 leading-relaxed">
                    เราไม่สามารถดึงอีเมลจาก {user?.providerData[0]?.providerId === 'google.com' ? 'Google' : 'Facebook'} ได้ 
                    กรุณากรอกอีเมลจริงของคุณเพื่อรับข้อมูลข่าวสาร การแจ้งเตือนคำสั่งซื้อ และการติดต่อที่สำคัญ
                  </p>
                  <div className="flex gap-2">
                    {!isEditing && (
                      <Button 
                        onClick={handleEditClick}
                        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold shadow-md"
                        size="sm"
                      >
                        ✏️ กรอกอีเมลตอนนี้
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Warning for unverified email */}
          {user?.email && !user.emailVerified && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-5 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="text-3xl animate-pulse">✉️</div>
                <div className="flex-1">
                  <h4 className="font-bold text-blue-900 mb-2 text-lg">ยืนยันอีเมลของคุณ</h4>
                  <p className="text-sm text-blue-800 mb-3 leading-relaxed">
                    {!isEmailPasswordProvider ? (
                      <>
                        คุณ login ด้วย {user?.providerData[0]?.providerId === 'google.com' ? 'Google' : 'Facebook'} 
                        {' '}กรุณายืนยันอีเมลที่ใช้ login เพื่อเพิ่มความปลอดภัยและรับการแจ้งเตือนสำคัญ
                      </>
                    ) : (
                      <>
                        กรุณายืนยันอีเมลเพื่อเพิ่มความปลอดภัยให้กับบัญชีของคุณ 
                        และเพื่อให้สามารถรับการแจ้งเตือนสำคัญต่างๆ ได้
                      </>
                    )}
                  </p>
                  <Button 
                    onClick={handleSendVerificationEmail}
                    disabled={sendingVerification}
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold shadow-md"
                    size="sm"
                  >
                    {sendingVerification ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                        กำลังส่ง...
                      </>
                    ) : (
                      <>
                        <Mail className="w-3 h-3 mr-2" />
                        ส่งอีเมลยืนยัน
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

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

            {/* Email Field */}
            <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4 items-start sm:items-center bg-white rounded-lg p-4 border border-gray-200">
              <label className="text-[#292d32] font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#ff9800]" />
                อีเมล
              </label>
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="กรอกอีเมลของคุณ"
                    className="max-w-md border-2 focus:border-[#ff9800] transition-colors"
                    disabled={loading || isGoogleLogin}
                  />
                  {isGoogleLogin ? (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      คุณเข้าสู่ระบบด้วย Google ไม่สามารถเปลี่ยนอีเมลได้
                    </p>
                  ) : !isEmailPasswordProvider ? (
                    <p className="text-xs text-gray-500">
                      💡 คุณ login ด้วย {user?.providerData[0]?.providerId === 'google.com' ? 'Google' : 'Facebook'} 
                      {' '}สามารถเพิ่มอีเมลสำหรับการติดต่อได้
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600">
                      ⚠️ การเปลี่ยนอีเมลจะต้องยืนยันอีเมลใหม่อีกครั้ง
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#292d32] font-medium break-words">
                      {userProfile?.email || user?.email || "-"}
                    </span>
                    {user?.providerData[0]?.providerId === 'google.com' && (
                      <FaGoogle className="w-4 h-4 text-red-500" title="เข้าสู่ระบบด้วย Google" />
                    )}
                    {user?.providerData[0]?.providerId === 'facebook.com' && (
                      <FaFacebook className="w-4 h-4 text-blue-600" title="เข้าสู่ระบบด้วย Facebook" />
                    )}
                    
                    {/* Email Verification Status */}
                    {user?.email && (
                      <>
                        {user.emailVerified ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full shadow-sm">
                            <CheckCircle2 className="w-3 h-3" />
                            ยืนยันแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-orange-400 to-red-400 text-white text-xs font-bold rounded-full shadow-sm">
                            <AlertCircle className="w-3 h-3" />
                            ยังไม่ยืนยัน
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Send Verification Email Button - REMOVED DUPLICATE */}
                  {/* Button moved to the warning box above */}
                </div>
              )}
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

            {/* ✅ Violation History - แสดงประวัติการละเมิด */}
            {userProfile && (userProfile.violations || userProfile.banned) && (
              <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4 items-start sm:items-center bg-red-50 rounded-lg p-4 border-2 border-red-200">
                <label className="text-red-700 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  สถานะบัญชี
                </label>
                <div className="space-y-2">
                  {userProfile.banned && (
                    <div className="text-red-700 font-bold flex items-center gap-2">
                      <span className="px-3 py-1 bg-red-600 text-white rounded-full text-sm">
                        🚫 บัญชีถูกระงับ
                      </span>
                      {userProfile.bannedUntil && (
                        <span className="text-sm">
                          จนถึง {new Date(userProfile.bannedUntil).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      )}
                    </div>
                  )}
                  {userProfile.violations && userProfile.violations > 0 && (
                    <div className="text-sm text-red-600">
                      ⚠️ ประวัติการละเมิด: <strong>{userProfile.violations} ครั้ง</strong>
                      {userProfile.violations >= 3 && (
                        <span className="block mt-1 text-xs text-red-700 font-medium">
                          คำเตือน: หากละเมิดอีกอาจถูกระงับถาวร
                        </span>
                      )}
                    </div>
                  )}
                  {userProfile.bannedReason && (
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">เหตุผล:</span> {userProfile.bannedReason}
                    </div>
                  )}
                  <div className="text-xs text-gray-600 mt-2">
                    💡 หากคุณคิดว่ามีการดำเนินการผิดพลาด กรุณาติดต่อทีมงานผ่านหน้า{' '}
                    <a href="/support" className="text-blue-600 underline">ช่วยเหลือ</a>
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>

          {/* Password Fields (Only for email/password login) */}
          {isEditing && isEmailPasswordProvider && (
            <div className="mt-6">
              {!showChangePassword ? (
                <Button
                  type="button"
                  onClick={() => setShowChangePassword(true)}
                  variant="outline"
                  className="w-full py-6 border-2 border-dashed border-blue-200 text-blue-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-center gap-2 rounded-xl transition-all duration-200"
                >
                  <Lock className="w-5 h-5" />
                  เปลี่ยนรหัสผ่าน
                </Button>
              ) : (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-blue-600" />
                      <h4 className="text-xl font-bold text-[#292d32]">
                        เปลี่ยนรหัสผ่าน
                      </h4>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowChangePassword(false);
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                      className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                    >
                      ยกเลิก
                    </Button>
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
            </div>
          )}

          {/* Last Sign In */}
          {!isEditing && user?.metadata.lastSignInTime && (
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
      <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl shadow-lg p-8 border border-red-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#292d32]">
            ลบบัญชีผู้ใช้
          </h2>
        </div>
        <p className="text-gray-600 mb-6">
          ⚠️ การลบบัญชีจะทำให้ข้อมูลทั้งหมดของคุณถูกลบอย่างถาวร รวมถึง:
        </p>
        <ul className="list-disc list-inside text-gray-600 space-y-2 mb-6 ml-4">
          <li>ข้อมูลส่วนตัวและโปรไฟล์</li>
          <li>ร้านค้าและสินค้าทั้งหมด (ถ้ามี)</li>
          <li>ประวัติการสั่งซื้อ</li>
          <li>รายการโปรดและตะกร้าสินค้า</li>
        </ul>
        <Button
          onClick={() => setShowDeleteDialog(true)}
          variant="destructive"
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-6 rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center gap-2"
        >
          <Trash2 className="w-5 h-5" />
          ลบบัญชีอย่างถาวร
        </Button>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-red-600 flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              ยืนยันการลบบัญชี
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium mb-2">
                ⚠️ คำเตือน: การดำเนินการนี้ไม่สามารถย้อนกลับได้!
              </p>
              <p className="text-red-600 text-sm">
                ข้อมูลทั้งหมดของคุณจะถูกลบอย่างถาวร
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                พิมพ์ <span className="font-bold text-red-600">ลบบัญชี</span> เพื่อยืนยัน
              </label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="พิมพ์ 'ลบบัญชี' ที่นี่"
                className="text-center font-medium"
                disabled={isDeleting}
              />
            </div>

            {message && message.type === "error" && (
              <div className="bg-red-50 text-red-800 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{message.text}</span>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirmText("");
                }}
                variant="outline"
                className="flex-1"
                disabled={isDeleting}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleDeleteAccount}
                variant="destructive"
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={isDeleting || deleteConfirmText !== "ลบบัญชี"}
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    กำลังลบ...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    ลบบัญชี
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Re-authentication Dialog */}
      <Dialog open={showReauthDialog} onOpenChange={setShowReauthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#ff9800] flex items-center gap-2">
              <Lock className="w-6 h-6" />
              ยืนยันตัวตนเพื่อลบบัญชี
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-orange-800 font-medium mb-2">
                🔒 จำเป็นต้องยืนยันตัวตนอีกครั้ง
              </p>
              <p className="text-orange-600 text-sm">
                เพื่อความปลอดภัย กรุณายืนยันตัวตนก่อนลบบัญชี
              </p>
            </div>

            {user?.providerData[0]?.providerId === "password" ? (
              // Email/Password Re-authentication
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  กรอกรหัสผ่านของคุณ
                </label>
                <div className="relative">
                  <Input
                    type={showReauthPassword ? "text" : "password"}
                    value={reauthPassword}
                    onChange={(e) => setReauthPassword(e.target.value)}
                    placeholder="รหัสผ่าน"
                    className="pr-10"
                    disabled={isDeleting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowReauthPassword(!showReauthPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showReauthPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            ) : user?.providerData[0]?.providerId === "google.com" ? (
              // Google Re-authentication
              <div className="text-center py-4">
                <p className="text-gray-600 mb-4">
                  คุณเข้าสู่ระบบด้วย Google
                </p>
                <p className="text-sm text-gray-500">
                  กรุณายืนยันตัวตนผ่าน Google อีกครั้ง
                </p>
              </div>
            ) : user?.providerData[0]?.providerId === "facebook.com" ? (
              // Facebook Re-authentication
              <div className="text-center py-4">
                <p className="text-gray-600 mb-4">
                  คุณเข้าสู่ระบบด้วย Facebook
                </p>
                <p className="text-sm text-gray-500">
                  กรุณายืนยันตัวตนผ่าน Facebook อีกครั้ง
                </p>
              </div>
            ) : null}

            {message && message.type === "error" && (
              <div className="bg-red-50 text-red-800 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{message.text}</span>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowReauthDialog(false);
                  setReauthPassword("");
                  setMessage(null);
                }}
                variant="outline"
                className="flex-1"
                disabled={isDeleting}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleReauthenticate}
                className="flex-1 bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white"
                disabled={isDeleting || (user?.providerData[0]?.providerId === "password" && !reauthPassword)}
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    กำลังดำเนินการ...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    ยืนยันและลบบัญชี
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
