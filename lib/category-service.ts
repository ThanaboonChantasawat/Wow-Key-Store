import { db } from "@/components/firebase-config";
import { auth } from "@/components/firebase-config";
import { 
  collection, 
  doc, 
  getDoc,
  getDocs,
  query,
  orderBy
} from "firebase/firestore";

export interface Category {
  slug: string;  // Primary identifier (same as document ID)
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Helper to get auth token
async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  console.log('[Category Service] Current user:', user?.uid);
  
  if (!user) {
    console.error('[Category Service] No authenticated user');
    throw new Error('User not authenticated');
  }
  
  const token = await user.getIdToken();
  console.log('[Category Service] Token obtained, length:', token.length);
  return token;
}

// Create new category (via API route)
export async function createCategory(categoryData: {
  name: string;
  description?: string;
  slug: string;
}): Promise<string> {
  try {
    console.log('[Category Service] Creating category:', categoryData);
    
    const token = await getAuthToken();
    console.log('[Category Service] Sending POST request to /api/categories');
    
    const response = await fetch('/api/categories', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(categoryData)
    });

    console.log('[Category Service] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
      console.error("[Category Service] API error response:", errorData);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log("[Category Service] Category created successfully:", result);
    return result.slug;
  } catch (error) {
    console.error("[Category Service] Error creating category:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to create category');
  }
}

// Get all categories
export async function getAllCategories(): Promise<Category[]> {
  try {
    const categoriesRef = collection(db, "categories");
    const q = query(categoriesRef, orderBy("name", "asc"));
    const snapshot = await getDocs(q);
    
    console.log("getAllCategories - Total docs:", snapshot.size);
    
    const categories = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log("Category doc:", doc.id, data);
      return {
        slug: doc.id,  // Document ID is the slug
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Category;
    });
    
    console.log("getAllCategories - Returning categories:", categories);
    return categories;
  } catch (error) {
    console.error("Error getting categories:", error);
    throw error;
  }
}

// Get category by slug
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    const categoryRef = doc(db, "categories", slug);
    const categoryDoc = await getDoc(categoryRef);
    
    if (!categoryDoc.exists()) {
      return null;
    }
    
    const data = categoryDoc.data();
    return {
      slug: categoryDoc.id,  // Document ID is the slug
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Category;
  } catch (error) {
    console.error("Error getting category:", error);
    throw error;
  }
}

// Update category (via API route)
export async function updateCategory(
  slug: string,
  categoryData: Partial<Omit<Category, 'slug' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    console.log('[Category Service] Updating category:', slug, categoryData);
    
    const token = await getAuthToken();
    
    const response = await fetch('/api/categories', {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ slug, ...categoryData })
    });

    console.log('[Category Service] Update response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[Category Service] Update error:', errorData);
      throw new Error(errorData.error || 'Failed to update category');
    }
    
    console.log('[Category Service] Category updated successfully');
  } catch (error) {
    console.error("[Category Service] Error updating category:", error);
    throw error;
  }
}

// Delete category (via API route)
export async function deleteCategory(slug: string): Promise<void> {
  try {
    if (!slug || typeof slug !== 'string') {
      throw new Error(`Invalid category slug: ${slug}`);
    }
    
    console.log('[Category Service] Deleting category:', slug);
    
    const token = await getAuthToken();
    
    const response = await fetch(`/api/categories?slug=${slug}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('[Category Service] Delete response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[Category Service] Delete error:', errorData);
      throw new Error(errorData.error || 'Failed to delete category');
    }
    
    console.log('[Category Service] Category deleted successfully');
  } catch (error) {
    console.error("[Category Service] Error deleting category:", error);
    throw error;
  }
}
