# แก้ปัญหา: ลบบัญชี Stripe แล้ว Connect ใช้ไม่ได้

## 🚨 ปัญหา:
- ลบ Connected Account ใน Stripe Dashboard
- Firestore ยังเก็บ `stripeAccountId` เก่าอยู่
- ระบบพยายามใช้ Account ที่ถูกลบแล้ว → Error!

---

## ✅ วิธีแก้ (3 วิธี):

### **วิธีที่ 1: ลบข้อมูลผ่าน Firebase Console** ⚡ (เร็วที่สุด)

#### ขั้นตอน:
1. เปิด **Firebase Console**: https://console.firebase.google.com
2. เลือก Project: **Wow-Key-Store**
3. ไปที่ **Firestore Database**
4. เปิด collection **`shops`**
5. เปิด document **`shop_{userId}`** (ของคุณ)
6. **ลบฟิลด์เหล่านี้**:
   - `stripeAccountId`
   - `stripeAccountStatus`
   - `stripeOnboardingCompleted`
   - `stripeChargesEnabled`
   - `stripePayoutsEnabled`
7. คลิก **Save**
8. **Refresh หน้าเว็บ** (Ctrl+R)
9. เข้า Seller Dashboard → บัญชีรับเงิน
10. คลิก **"เชื่อมต่อ Stripe"** ใหม่

✅ เสร็จ! สร้างบัญชีใหม่ได้เลย

---

### **วิธีที่ 2: ใช้ Browser Console** 💻 (ถ้าไม่อยากเข้า Firebase)

#### ขั้นตอน:
1. เปิด **Browser Console** (F12)
2. ไปที่แท็บ **Console**
3. Copy & Paste โค้ดนี้:

```javascript
// ลบข้อมูล Stripe ใน Firestore
(async () => {
  const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
  const { getFirestore, doc, updateDoc, deleteField } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  
  const auth = getAuth();
  const db = getFirestore();
  const userId = auth.currentUser?.uid;
  
  if (!userId) {
    console.error('❌ ไม่ได้ล็อกอิน!');
    return;
  }
  
  const shopRef = doc(db, 'shops', `shop_${userId}`);
  
  await updateDoc(shopRef, {
    stripeAccountId: deleteField(),
    stripeAccountStatus: deleteField(),
    stripeOnboardingCompleted: deleteField(),
    stripeChargesEnabled: deleteField(),
    stripePayoutsEnabled: deleteField(),
  });
  
  console.log('✅ ลบข้อมูล Stripe สำเร็จ!');
  console.log('🔄 กรุณา Refresh หน้าเว็บ (Ctrl+R)');
})();
```

4. กด **Enter**
5. ถ้าเห็น **"✅ ลบข้อมูล Stripe สำเร็จ!"**
6. **Refresh หน้าเว็บ** (Ctrl+R)
7. ลองสร้างบัญชีใหม่

---

### **วิธีที่ 3: สร้าง Admin Tool** 🛠️ (ถ้าจะใช้บ่อย)

สร้างไฟล์ใหม่: `app/api/stripe/reset-account/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '@/components/firebase-config';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // ลบข้อมูล Stripe จาก Firestore
    const shopRef = doc(db, 'shops', `shop_${userId}`);
    await updateDoc(shopRef, {
      stripeAccountId: deleteField(),
      stripeAccountStatus: deleteField(),
      stripeOnboardingCompleted: deleteField(),
      stripeChargesEnabled: deleteField(),
      stripePayoutsEnabled: deleteField(),
    });

    return NextResponse.json({
      success: true,
      message: 'Reset Stripe account successfully',
    });
  } catch (error: any) {
    console.error('Error resetting Stripe account:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

แล้วเรียกใช้ใน Console:
```javascript
fetch('/api/stripe/reset-account', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'YOUR_USER_ID' })
})
.then(r => r.json())
.then(d => console.log(d));
```

---

## 🎯 หลังแก้แล้ว:

### ✅ ระบบจะแสดง:
```
┌─────────────────────────────────────┐
│ ยังไม่ได้เชื่อมต่อบัญชีรับเงิน      │
│                                      │
│ [  เชื่อมต่อ Stripe  ] [รีเฟรช]    │
└─────────────────────────────────────┘
```

### ✅ คลิก "เชื่อมต่อ Stripe" ใหม่:
- จะสร้างบัญชีใหม่
- ไม่มี Error
- ทำงานปกติ

---

## 🚫 ป้องกันปัญหาในอนาคต:

### **อย่าลบ Account ใน Stripe Dashboard!**

ถ้าอยากลบจริงๆ ให้:
1. ลบใน Firestore ก่อน (วิธีด้านบน)
2. แล้วค่อยลบใน Stripe Dashboard

หรือสร้างฟังก์ชัน "Disconnect Account" ในเว็บ:
```typescript
// ปุ่มยกเลิกการเชื่อมต่อ
async function disconnectStripe() {
  // 1. ลบ Account ใน Stripe
  await fetch('/api/stripe/delete-account', { ... });
  
  // 2. ลบข้อมูลใน Firestore
  await updateDoc(shopRef, {
    stripeAccountId: deleteField(),
    // ...
  });
  
  // 3. Refresh UI
  window.location.reload();
}
```

---

## 💡 Tips:

### **เช็คว่าบัญชียังมีอยู่หรือไม่:**
```javascript
// ใน loadAccountStatus
if (stripeAccountId) {
  try {
    const response = await fetch(`/api/stripe/get-account-status?accountId=${stripeAccountId}`);
    const data = await response.json();
    
    if (!data.success) {
      // บัญชีถูกลบแล้ว!
      console.log('❌ Account deleted!');
      // Clear Firestore
      await clearStripeData();
    }
  } catch (error) {
    // Handle error
  }
}
```

---

## 🎯 สรุป:

**ทำตามวิธีที่ 1 (ง่ายที่สุด):**
1. เปิด Firebase Console
2. ลบฟิลด์ Stripe ใน document ของคุณ
3. Refresh หน้าเว็บ
4. เชื่อมต่อ Stripe ใหม่

**เสร็จ!** ✅

---

**หมายเหตุ:** ในโหมด Test ลบบัญชีได้ตามใจชอบ แต่ใน Live Mode ระวังหน่อย!
