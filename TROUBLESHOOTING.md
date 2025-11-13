# แก้ปัญหาเข้าหน้าสินค้าไม่ได้

หากเพื่อนของคุณเข้าหน้าสินค้าไม่ได้ ให้ลองวิธีเหล่านี้:

## วิธีที่ 1: Hard Refresh (แนะนำที่สุด)
- **Windows/Linux**: กด `Ctrl + Shift + R` หรือ `Ctrl + F5`
- **Mac**: กด `Cmd + Shift + R`

## วิธีที่ 2: ล้าง Cache
1. เปิด Developer Tools (กด F12)
2. คลิกขวาที่ปุ่ม Refresh
3. เลือก "Empty Cache and Hard Reload"

## วิธีที่ 3: ใช้โหมด Incognito/Private
- **Chrome/Edge**: กด `Ctrl + Shift + N`
- **Firefox**: กด `Ctrl + Shift + P`
- **Safari**: กด `Cmd + Shift + N`

## วิธีที่ 4: ล้าง Browser Cache แบบเต็ม
### Chrome/Edge:
1. กด `Ctrl + Shift + Delete`
2. เลือก "Cached images and files"
3. เลือกช่วงเวลา "All time"
4. กด "Clear data"

### Firefox:
1. กด `Ctrl + Shift + Delete`
2. เลือก "Cache"
3. กด "Clear Now"

## วิธีที่ 5: ลองเบราว์เซอร์อื่น
ลองเปิดใน Chrome, Firefox, Safari, หรือ Edge

## วิธีที่ 6: ตรวจสอบ Console
1. เปิด Developer Tools (F12)
2. ไปที่ tab "Console"
3. รีเฟรชหน้า
4. ส่ง screenshot ของ errors ที่เห็นมา

## สำหรับ Dev: Force Deploy ใหม่
```bash
# Trigger new deployment
git commit --allow-empty -m "Force rebuild"
git push
```

## ตรวจสอบ Vercel Deployment
ไปที่ Vercel Dashboard แล้วดู:
- Build logs
- Function logs
- Analytics

## Cache Headers
หลังจาก deploy แล้ว cache จะ:
- Vercel Edge: 0-60 วินาที
- Browser: ใช้ must-revalidate
- ISR: revalidate ทุก 60 วินาที
