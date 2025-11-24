// Client-side API wrapper for shop operations
// Use these functions in client components instead of importing shop-service.ts directly
import type { Shop } from "./shop-types";

export async function getShopByOwnerId(ownerId: string): Promise<Shop | null> {
  try {
    const response = await fetch(`/api/shops/get-by-owner/${ownerId}`);
    if (response.ok) {
      const data = await response.json();
      return data.shop || data; // Handle both formats
    }
    if (response.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch shop');
  } catch (error) {
    console.error("Error fetching shop by owner:", error);
    return null;
  }
}

export async function getShopById(shopId: string): Promise<Shop | null> {
  try {
    const response = await fetch(`/api/shops/${shopId}`);
    if (response.ok) {
      const data = await response.json();
      return data.shop || data;
    }
    if (response.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch shop');
  } catch (error) {
    console.error("Error fetching shop:", error);
    return null;
  }
}

export async function getAllShops(statusFilter?: 'pending' | 'active' | 'rejected' | 'suspended' | 'closed'): Promise<Shop[]> {
  try {
    const url = statusFilter 
      ? `/api/shops/all?status=${statusFilter}` 
      : '/api/shops/all';
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      return data.shops || data;
    }
    throw new Error('Failed to fetch shops');
  } catch (error) {
    console.error("Error fetching shops:", error);
    return [];
  }
}

export async function getTopShopsBySales(limit: number = 10): Promise<Shop[]> {
  try {
    const response = await fetch(`/api/shops/top-sales?limit=${limit}`);
    if (response.ok) {
      const data = await response.json();
      return data.shops || data;
    }
    throw new Error('Failed to fetch top shops');
  } catch (error) {
    console.error("Error fetching top shops:", error);
    return [];
  }
}

export async function createShop(
  ownerId: string,
  shopData: {
    shopName: string;
    description: string;
    logoUrl?: string;
    contactEmail?: string;
    contactPhone?: string;
    facebookUrl?: string;
    lineId?: string;
    idCardNumber?: string;
    businessRegistration?: string;
  }
): Promise<string> {
  const response = await fetch('/api/shops/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ownerId,
      shopData
    })
  });

  if (!response.ok) {
    throw new Error('Failed to create shop');
  }

  const { shopId } = await response.json();
  return shopId;
}

export async function approveShop(shopId: string, adminId: string): Promise<void> {
  const response = await fetch(`/api/shops/${shopId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ adminId })
  });

  if (!response.ok) {
    throw new Error('Failed to approve shop');
  }
}

export async function rejectShop(shopId: string, adminId: string, reason: string): Promise<void> {
  const response = await fetch(`/api/shops/${shopId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ adminId, reason })
  });

  if (!response.ok) {
    throw new Error('Failed to reject shop');
  }
}

export async function suspendShop(shopId: string, adminId: string, reason: string): Promise<void> {
  const response = await fetch(`/api/shops/${shopId}/suspend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ adminId, reason })
  });

  if (!response.ok) {
    throw new Error('Failed to suspend shop');
  }
}

export async function unsuspendShop(shopId: string): Promise<void> {
  const response = await fetch(`/api/shops/${shopId}/unsuspend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to unsuspend shop');
  }
}

export async function updateShop(
  shopId: string,
  shopData: {
    shopName?: string;
    description?: string;
    logoUrl?: string;
    contactEmail?: string;
    contactPhone?: string;
    facebookUrl?: string;
    lineId?: string;
  }
): Promise<void> {
  const response = await fetch(`/api/shops/${shopId}/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ shopData })
  });

  if (!response.ok) {
    throw new Error('Failed to update shop');
  }
}

// Re-export the type
export type { Shop };
