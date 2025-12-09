# 🔧 วิธีแก้ปัญหา Pending Charges ใน Omise

## 🔍 ปัญหา:
มี Charges สถานะ **Pending** เยอะมากใน Omise Dashboard เพราะ:
1. ลูกค้าสร้าง QR Code แล้วไม่ได้จ่ายเงิน
2. QR Code หมดอายุ (15 นาที) แต่ Order ยังค้างเป็น Pending
3. ไม่มี Webhook หรือ Webhook ไม่ทำงาน

---

## ✅ วิธีแก้ไข (ทำทั้ง 3 ข้อ):

### 1. ตั้งค่า Webhook ใน Omise Dashboard

#### สำหรับ Test Mode:
1. ไปที่: https://dashboard.omise.co/test/webhooks
2. กด **"Create Webhook"**
3. ใส่ URL: `https://your-domain.vercel.app/api/webhooks/omise`
   - ⚠️ **ถ้ายังไม่ deploy:** ใช้ ngrok หรือ deploy ก่อน
4. เลือก Events:
   - ✅ `charge.complete` - เมื่อชำระสำเร็จ
   - ✅ `charge.failed` - เมื่อชำระล้มเหลว
   - ✅ `charge.expired` - เมื่อ QR หมดอายุ ⭐ **สำคัญ!**
5. กด **Save**

#### สำหรับ Live Mode (เมื่อพร้อมใช้งานจริง):
1. ไปที่: https://dashboard.omise.co/live/webhooks
2. ทำเหมือนกับ Test Mode

---

### 2. Auto-expire เมื่อ QR หมดอายุ (Frontend)

**ทำอัตโนมัติแล้ว!** ✅

เมื่อ QR Code หมดอายุ (15 นาที):
- Frontend จะเรียก API `/api/payment/expire-charge` อัตโนมัติ
- Order จะถูก update เป็น `expired` และ `cancelled`
- ป้องกัน Pending Charges ค้างค้าง

**ไฟล์ที่เกี่ยวข้อง:**
- `components/payment/promptpay-qr-payment.tsx` - ตรวจจับ QR หมดอายุ
- `app/api/payment/expire-charge/route.ts` - API update Order

---

### 3. Cleanup Cron Job (ทุก 1 ชั่วโมง)

**ตั้งค่าใน Vercel แล้ว!** ✅

Cron Job จะทำงานทุก 1 ชั่วโมง:
- ค้นหา Orders ที่ `paymentStatus: pending` และเก่ากว่า 1 ชั่วโมง
- Update เป็น `expired` และ `cancelled` อัตโนมัติ
- ป้องกัน Orders ค้างค้างระยะยาว

**ไฟล์:**
- `app/api/payment/cleanup-expired/route.ts` - Cleanup logic
- `vercel.json` - Cron schedule (`0 * * * *` = ทุก 1 ชั่วโมง)

**ทดสอบ Cleanup Manual:**
```bash
# GET - cleanup orders > 1 hour old
curl https://your-domain.vercel.app/api/payment/cleanup-expired

# POST - cleanup orders > X hours old
curl -X POST https://your-domain.vercel.app/api/payment/cleanup-expired \
  -H "Content-Type: application/json" \
  -d '{"hoursOld": 2}'
```

---

## 🚀 Deploy และทดสอบ:

### 1. Deploy ไป Vercel:
```bash
git add .
git commit -m "Add auto-expire and cleanup for pending charges"
git push origin master
```

### 2. ตั้งค่า Webhook ใน Omise:
- URL: `https://your-app.vercel.app/api/webhooks/omise`
- Events: `charge.complete`, `charge.failed`, `charge.expired`

### 3. ทดสอบ:
1. สร้าง Order ใหม่
2. ไม่ต้องจ่ายเงิน รอ 15 นาที
3. ✅ Order จะถูก expire อัตโนมัติ
4. ✅ Omise Charge จะ update เป็น `expired`

---

## 📊 ผลลัพธ์:

### ก่อนแก้:
- ❌ Pending Charges เยอะมาก
- ❌ Orders ค้างเป็น Pending ตลอด
- ❌ ไม่มีการทำความสะอาด

### หลังแก้:
- ✅ QR หมดอายุ → Order expire ทันที (15 นาที)
- ✅ Webhook update Order อัตโนมัติ
- ✅ Cron cleanup Orders เก่า (ทุก 1 ชั่วโมง)
- ✅ Pending Charges น้อยลง

---

## 🔒 ความปลอดภัย (Production):

### เพิ่ม Webhook Secret Verification:

1. ใน Omise Dashboard → Webhooks → คัดลอก **Webhook Secret**
2. เพิ่มใน `.env.local`:
   ```
   OMISE_WEBHOOK_SECRET=your_webhook_secret_here
   ```
3. Update `app/api/webhooks/omise/route.ts`:
   ```typescript
   // Verify webhook signature
   const signature = request.headers.get('omise-signature')
   const webhookSecret = process.env.OMISE_WEBHOOK_SECRET
   
   if (webhookSecret) {
     // Verify signature logic here
   }
   ```

### เพิ่ม Cron Secret:

1. เพิ่มใน `.env.local`:
   ```
   CRON_SECRET=your_random_secret_here
   ```
2. Update `vercel.json`:
   ```json
   {
     "crons": [
       {
         "path": "/api/payment/cleanup-expired",
         "schedule": "0 * * * *",
         "headers": {
           "Authorization": "Bearer your_random_secret_here"
         }
       }
     ]
   }
   ```

---

## 💡 เคล็ดลับ:

### ดู Pending Charges ทั้งหมด:
1. ไปที่ https://dashboard.omise.co/test/charges
2. Filter: Status = **Pending**
3. จะเห็นว่าลดลงหลังแก้ไข

### Force Cleanup Manual:
```bash
# Admin Dashboard หรือ API call
GET /api/payment/cleanup-expired
```

### ตรวจสอบ Webhook Logs:
1. https://dashboard.omise.co/test/webhooks
2. Click webhook endpoint
3. ดู **Recent Deliveries** - จะเห็น `charge.expired` events

---

## 📞 สรุป:

| ปัญหา | วิธีแก้ | สถานะ |
|-------|---------|-------|
| QR หมดอายุแต่ Order ยัง Pending | Auto-expire (Frontend) | ✅ เสร็จแล้ว |
| Webhook ไม่ทำงาน | ตั้งค่าใน Omise Dashboard | ⚠️ ต้องตั้งค่าเอง |
| Orders เก่าค้างค้าง | Cron Cleanup (ทุก 1 ชั่วโมง) | ✅ เสร็จแล้ว |
| ความปลอดภัย | Webhook + Cron Secret | 💡 แนะนำเพิ่ม |

---

**พร้อมใช้งานแล้ว!** 🎉

หลัง Deploy และตั้งค่า Webhook จะไม่มี Pending Charges ค้างค้างอีกต่อไป
