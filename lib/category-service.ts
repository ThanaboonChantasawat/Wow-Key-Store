import { db } from "@/components/firebase-config";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
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

// Create new category
export async function createCategory(categoryData: {
  name: string;
  description?: string;
  slug: string;
}): Promise<string> {
  try {
    // Use slug as document ID
    const categorySlug = categoryData.slug;
    const categoryRef = doc(db, "categories", categorySlug);
    
    // Check if category with this slug already exists
    const existingDoc = await getDoc(categoryRef);
    if (existingDoc.exists()) {
      throw new Error(`Category with slug "${categorySlug}" already exists`);
    }
    
    await setDoc(categoryRef, {
      ...categoryData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log(`Category created with slug: ${categorySlug}`);
    return categorySlug;
  } catch (error) {
    console.error("Error creating category:", error);
    throw error;
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

// Update category
export async function updateCategory(
  slug: string,
  categoryData: Partial<Omit<Category, 'slug' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    const categoryRef = doc(db, "categories", slug);
    await updateDoc(categoryRef, {
      ...categoryData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating category:", error);
    throw error;
  }
}

// Delete category
export async function deleteCategory(slug: string): Promise<void> {
  try {
    if (!slug || typeof slug !== 'string') {
      throw new Error(`Invalid category slug: ${slug}`);
    }
    
    if (!db) {
      throw new Error("Firestore database is not initialized");
    }
    
    console.log("Deleting category with slug:", slug);
    console.log("Database instance:", db);
    
    const categoryRef = doc(db, "categories", slug);
    console.log("Category ref created:", categoryRef.path);
    
    await deleteDoc(categoryRef);
    console.log("Category deleted successfully");
  } catch (error) {
    console.error("Error deleting category:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    throw error;
  }
}
