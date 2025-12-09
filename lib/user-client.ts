// Client-side wrapper for user service
// Calls API routes instead of directly accessing Firestore
import type { UserProfile } from "./user-types";
import { auth } from "@/components/firebase-config";

export type { UserProfile };

// Create user profile
export async function createUserProfile(
  userId: string,
  displayName: string,
  photoURL: string | null = null,
  email?: string,
  emailVerified: boolean = false
): Promise<void> {
  const response = await fetch('/api/users/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId, displayName, photoURL, email, emailVerified })
  });

  if (!response.ok) {
    throw new Error('Failed to create user profile');
  }
}

// Get user profile
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    console.log('Fetching user profile for:', userId)
    const response = await fetch(`/api/users/${userId}`);
    
    console.log('User profile response status:', response.status)
    
    if (response.status === 404) {
      console.log('User not found')
      return null;
    }
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to get user profile:', response.status, errorText)
      throw new Error('Failed to get user profile');
    }

    const data = await response.json();
    console.log('User profile data:', data)
    return data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

// Update user profile
export async function updateUserProfile(
  userId: string,
  updates: Partial<Omit<UserProfile, 'createdAt' | 'lastLoginAt'>>
): Promise<void> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : '';

  const response = await fetch(`/api/users/${userId}/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    throw new Error('Failed to update user profile');
  }
}

// Get all users (admin function)
export async function getAllUsers(): Promise<(UserProfile & { id: string })[]> {
  try {
    const response = await fetch('/api/users/all');
    
    if (!response.ok) {
      throw new Error('Failed to get all users');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
}

// Update user role (admin function)
export async function updateUserRole(
  userId: string,
  newRole: 'buyer' | 'seller' | 'admin' | 'superadmin'
): Promise<void> {
  const response = await fetch(`/api/users/${userId}/role`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ role: newRole })
  });

  if (!response.ok) {
    throw new Error('Failed to update user role');
  }
}

// Update account status (admin function)
export async function updateAccountStatus(
  userId: string,
  status: 'active' | 'banned'
): Promise<void> {
  const response = await fetch(`/api/users/${userId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status })
  });

  if (!response.ok) {
    throw new Error('Failed to update account status');
  }
}

// Delete user account (admin function)
export async function deleteUserAccount(userId: string): Promise<void> {
  const response = await fetch(`/api/users/${userId}/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to delete user account');
  }
}

// Update last login timestamp
export async function updateLastLogin(userId: string): Promise<void> {
  const response = await fetch(`/api/users/${userId}/last-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to update last login');
  }
}

// Check email status with details (providers)
export async function checkEmailStatus(email: string): Promise<{ exists: boolean; providers: string[] }> {
  try {
    const response = await fetch('/api/users/check-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      throw new Error('Failed to check email');
    }

    const data = await response.json();
    return { exists: data.exists, providers: data.providers || [] };
  } catch (error) {
    console.error('Error checking email status:', error);
    return { exists: false, providers: [] };
  }
}

// Check if email exists
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const response = await fetch('/api/users/check-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      throw new Error('Failed to check email');
    }

    const data = await response.json();
    return data.exists;
  } catch (error) {
    console.error('Error checking email:', error);
    return false;
  }
}
