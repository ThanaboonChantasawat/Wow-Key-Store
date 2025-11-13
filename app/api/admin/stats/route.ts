import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin-config";

export async function GET(request: NextRequest) {
  try {
    // Get counts for all collections
    const [usersSnapshot, productsSnapshot, shopsSnapshot, reopenRequestsSnapshot, reportsSnapshot] = 
      await Promise.all([
        adminDb.collection("users").get(),
        adminDb.collection("products").get(),
        adminDb.collection("shops").get(),
        adminDb.collection("reopenRequests").get(),
        adminDb.collection("reports").get(),
      ]);

    // Count online/offline users
    let onlineUsers = 0;
    let offlineUsers = 0;
    const now = Date.now();
    const twoMinutesAgo = now - (2 * 60 * 1000); // 2 minutes threshold

    usersSnapshot.forEach((doc) => {
      const user = doc.data();
      
      // Check if user has lastSeen field
      if (user.lastSeen) {
        const lastSeen = user.lastSeen.toMillis ? user.lastSeen.toMillis() : 
                        (typeof user.lastSeen === 'number' ? user.lastSeen : 0);
        
        if (lastSeen > twoMinutesAgo) {
          onlineUsers++;
        } else {
          offlineUsers++;
        }
      } else {
        // Users without lastSeen are considered offline
        offlineUsers++;
      }
    });

    console.log(`📊 User Stats at ${new Date().toISOString()}`);
    console.log(`Total users: ${usersSnapshot.size}, Online: ${onlineUsers}, Offline: ${offlineUsers}`);
    console.log(`Threshold: last 2 minutes (${new Date(twoMinutesAgo).toISOString()})`);

    // Count pending shops
    let pendingShops = 0;
    shopsSnapshot.forEach((doc) => {
      const shop = doc.data();
      if (shop.status === "pending") {
        pendingShops++;
      }
    });

    // Count active reports (pending status)
    let activeReports = 0;
    reportsSnapshot.forEach((doc) => {
      const report = doc.data();
      if (report.status === "pending") {
        activeReports++;
      }
    });

    const stats = {
      totalUsers: usersSnapshot.size,
      onlineUsers,
      offlineUsers,
      totalProducts: productsSnapshot.size,
      totalShops: shopsSnapshot.size,
      pendingShops,
      reopenRequests: reopenRequestsSnapshot.size,
      activeReports,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
