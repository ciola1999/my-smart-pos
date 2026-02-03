'use server';

import { db } from '@/db';
import {
  products,
  categories,
  orderItems,
  orders,
} from '@/db/schema';
import { productSchema } from '@/lib/schemas/product-schema';
import { desc, asc, inArray, sql, eq, type InferSelectModel } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

// --- SETUP SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- TYPES ---
type BaseProduct = InferSelectModel<typeof products>;

// Tipe Generic untuk Return Value Action
export type ActionState<T = unknown> = {
  success?: boolean;
  message?: string;
  errors?: { [key: string]: string[] };
  data?: T;
};

// Tipe khusus hasil query (Join Product + Category)
export type ProductWithCategory = BaseProduct & {
  categoryName: string | null;
  category: { name: string } | null;
};

// Interface Error Postgres (Custom Type Guard)
interface PostgresError extends Error {
  code: string;
  detail?: string;
}

// Type Guard Function: Mengecek apakah error berasal dari Postgres
function isPostgresError(error: unknown): error is PostgresError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'string'
  );
}

// --- HELPER FUNCTIONS ---
const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomChoice = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

// --- 1. GET PRODUCTS ---
export async function getProducts(
  sortBy: string = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<ActionState<ProductWithCategory[]>> {
  try {
    const query = db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        sku: products.sku,
        barcode: products.barcode,
        price: products.price,
        costPrice: products.costPrice,
        stock: products.stock,
        minStock: products.minStock,
        imageUrl: products.imageUrl,
        isActive: products.isActive,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        categoryName: categories.name,
        categoryId: products.categoryId,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id));

    // Dynamic Sorting Logic
    const dynamicQuery = query.orderBy(
      sortBy === 'stock'
        ? sortOrder === 'asc'
          ? asc(products.stock)
          : desc(products.stock)
        : sortBy === 'price'
        ? sortOrder === 'asc'
          ? sql`${products.price}::numeric asc`
          : sql`${products.price}::numeric desc`
        : sortBy === 'costPrice'
        ? sortOrder === 'asc'
          ? sql`${products.costPrice}::numeric asc`
          : sql`${products.costPrice}::numeric desc`
        : sortBy === 'name'
        ? sortOrder === 'asc'
          ? asc(products.name)
          : desc(products.name)
        : sortOrder === 'asc'
        ? asc(products.createdAt)
        : desc(products.createdAt)
    );

    const data = await dynamicQuery;

    const formattedData: ProductWithCategory[] = data.map((item) => ({
      ...item,
      category: item.categoryName ? { name: item.categoryName } : null,
    }));

    return { success: true, data: formattedData };
  } catch (error: unknown) {
    console.error('Get Products Error:', error);
    return { success: false, data: [] };
  }
}

// --- 2. UPSERT PRODUCT (STRICT TYPE) ---
export async function upsertProduct(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // 1. Pre-process Form Data (Manual Parsing)
  // Kita ambil value mentah, lalu konversi sesuai tipe data DB
  const rawId = formData.get('id');
  const rawCategoryId = formData.get('categoryId');
  
  const rawData = {
    id: rawId ? Number(rawId) : undefined,
    categoryId: rawCategoryId ? Number(rawCategoryId) : null,
    name: formData.get('name'),
    description: formData.get('description'),
    barcode: formData.get('barcode'),
    sku: formData.get('sku'),
    price: formData.get('price'),
    costPrice: formData.get('costPrice'),
    stock: Number(formData.get('stock') || 0),
    minStock: Number(formData.get('minStock') || 5),
    imageUrl: formData.get('existingImageUrl'), // String URL lama
    isActive: formData.get('isActive') === 'on' || formData.get('isActive') === 'true',
  };

  // 2. Validasi Zod
  const validatedFields = productSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Validasi Gagal',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const data = validatedFields.data;

  // 3. Handle Image Upload (STRICT CHECK)
  const imageEntry = formData.get('image'); // Tipe: FormDataEntryValue | null
  let finalImageUrl = (data.imageUrl as string) || null;

  // Type Guard: Pastikan ini benar-benar FILE dan ukurannya > 0
  // Browser kadang mengirim object File kosong (size 0, name 'undefined') jika user tidak memilih file
  if (
    imageEntry instanceof File && 
    imageEntry.size > 0 && 
    imageEntry.name !== 'undefined'
  ) {
    // Validasi tipe file
    if (!imageEntry.type.startsWith('image/')) {
      return { success: false, message: 'File harus berupa gambar (JPG/PNG).' };
    }

    try {
      const fileExt = imageEntry.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

      // Upload ke Supabase
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, imageEntry, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // Ambil Public URL
      const { data: urlData } = supabase.storage
        .from('products')
        .getPublicUrl(fileName);
        
      finalImageUrl = urlData.publicUrl;
      
    } catch (error: unknown) {
      console.error('Upload Error:', error);
      return { success: false, message: 'Gagal upload gambar ke server.' };
    }
  }

  // 4. Database Transaction
  try {
    const payload = {
      ...data,
      imageUrl: finalImageUrl,
      // Pastikan konversi ke String untuk tipe Decimal di Postgres
      price: String(data.price),
      costPrice: String(data.costPrice),
      updatedAt: new Date(),
    };

    if (data.id) {
      // UPDATE MODE
      await db.update(products).set(payload).where(eq(products.id, data.id));
    } else {
      // CREATE MODE
      await db.insert(products).values({ ...payload, createdAt: new Date() });
    }

    revalidatePath('/dashboard/products');
    return { success: true, message: 'Produk berhasil disimpan!' };
    
  } catch (error: unknown) {
    console.error('DB Error:', error);

    // Cek error unique constraint (SKU/Barcode duplikat)
    if (isPostgresError(error) && error.code === '23505') {
      if (error.detail?.includes('sku')) {
        return { success: false, message: 'SKU sudah digunakan produk lain.' };
      }
      if (error.detail?.includes('barcode')) {
        return { success: false, message: 'Barcode sudah digunakan produk lain.' };
      }
    }
    
    // Fallback error message
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan sistem.';
    return { success: false, message: `Gagal menyimpan: ${errorMessage}` };
  }
}

// --- 3. DELETE PRODUCT ---
export async function deleteProductsAction(ids: number[]) {
  try {
    if (ids.length === 0)
      return { success: false, message: 'Pilih produk dulu.' };

    const productsToDelete = await db
      .select({ imageUrl: products.imageUrl })
      .from(products)
      .where(inArray(products.id, ids));

    // Filter path gambar dari URL
    const imagePaths = productsToDelete
      .map((p) => {
        if (!p.imageUrl) return null;
        try {
          // Ambil nama file paling belakang dari URL
          const parts = p.imageUrl.split('/');
          return parts[parts.length - 1]; 
        } catch {
          return null;
        }
      })
      .filter((path): path is string => path !== null);

    // Cleanup Storage Supabase
    if (imagePaths.length > 0) {
      await supabase.storage.from('products').remove(imagePaths);
    }

    await db.delete(products).where(inArray(products.id, ids));

    revalidatePath('/dashboard/products');
    return {
      success: true,
      message: `Berhasil menghapus ${ids.length} produk.`,
    };
  } catch (error: unknown) {
    console.error('Delete Error:', error);
    return { success: false, message: 'Gagal menghapus produk.' };
  }
}

// --- 4. SEED DUMMY DATA ---
export async function seedDummyProducts() {
  try {
    const prefixes = ['Ice', 'Hot', 'Premium', 'Double', 'Royal', 'Spicy'];
    const items = ['Latte', 'Cappuccino', 'Croissant', 'Burger', 'Pasta', 'Tea', 'Smoothie'];
    const suffixes = ['Special', 'Deluxe', 'Hazelnut', 'Caramel', 'Cheese', 'Original'];

    const name = `${randomChoice(prefixes)} ${randomChoice(items)} ${randomChoice(suffixes)}`;
    const uniqueId = Date.now().toString().slice(-4) + randomInt(10, 99);
    const sku = `${name.substring(0, 3).toUpperCase()}-${uniqueId}`;

    const newProduct = {
      name: name,
      description: `Auto-generated ${name}`,
      price: String(randomInt(15, 75) * 1000),
      costPrice: String(randomInt(5, 10) * 1000),
      stock: randomInt(0, 100),
      minStock: 5,
      sku: sku,
      isActive: Math.random() > 0.2,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(products).values(newProduct);

    revalidatePath('/dashboard/products');
    return { success: true, message: `Berhasil menambah: ${name}` };
  } catch (error: unknown) {
    console.error('Seed Error:', error);
    return { success: false, message: 'Gagal seeding data.' };
  }
}

// --- 5. RESET DATABASE ---
export async function deleteAllProducts() {
  try {
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(products);

    revalidatePath('/dashboard/products');
    return { success: true, message: 'Database bersih total!' };
  } catch (error: unknown) {
    console.error('Reset Error:', error);
    return { success: false, message: 'Gagal reset database.' };
  }
}