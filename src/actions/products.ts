// Project/smart-pos-v2/actions/products.ts

'use server';

import { db } from '@/db';
import {
  products,
  categories,
  orderItems, // Penting untuk reset database
  orders, // Penting untuk reset database
} from '@/db/schema';
import { productSchema } from '@/lib/schemas/product-schema';
import { desc, asc, inArray, sql, eq } from 'drizzle-orm';
import { type InferSelectModel } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

type Product = InferSelectModel<typeof products>;

// --- HELPER FUNCTIONS ---
const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomChoice = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

// --- SETUP SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- TYPES & GUARDS ---
export type ActionState<T = unknown> = {
  success?: boolean;
  message?: string;
  errors?: { [key: string]: string[] };
  data?: T; // 'T' akan mengikuti tipe data yang kita kirim
};

interface PostgresError extends Error {
  code: string;
  detail?: string;
}

function isPostgresError(error: unknown): error is PostgresError {
  return typeof error === 'object' && error !== null && 'code' in error;
}

// 1. Kita ambil tipe asli tabel 'products' dari schema
type BaseProduct = InferSelectModel<typeof products>;

// 2. Kita bikin tipe khusus untuk hasil query (Produk + Kategori)
//    Ini sesuai dengan logic .map() yang kamu buat di bawah
export type ProductWithCategory = BaseProduct & {
  categoryName: string | null; // Field dari hasil join
  category: { name: string } | null; // Field object hasil format map
};

// --- 1. GET PRODUCTS (SUPER LENGKAP) ---
export async function getProducts(
  sortBy: string = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<ActionState<ProductWithCategory[]>> {
  try {
    // 1. Definisikan Query Dasar + Join Kategori
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

    // 2. Logic Sorting (Fitur dari kode lamamu)
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
                : desc(products.createdAt) // Default createdAt
    );

    const data = await dynamicQuery;

    // 3. Format Data untuk UI
    const formattedData = data.map((item) => ({
      ...item,
      category: item.categoryName ? { name: item.categoryName } : null,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('Get Products Error:', error);
    return { success: false, data: [] };
  }
}

// --- 2. UPSERT PRODUCT (CREATE & UPDATE JADI SATU) ---
// Menggantikan 'createProduct' agar bisa handle EDIT juga
export async function upsertProduct(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // Simulasi loading UI (Opsional, hapus kalau mau cepat)
  // await new Promise((resolve) => setTimeout(resolve, 500));

  // 1. Pre-process Form Data
  const rawData = {
    id: formData.get('id') ? Number(formData.get('id')) : undefined,
    categoryId: formData.get('categoryId')
      ? Number(formData.get('categoryId'))
      : null,
    name: formData.get('name'),
    description: formData.get('description'),
    barcode: formData.get('barcode'),
    sku: formData.get('sku'),
    price: formData.get('price'),
    costPrice: formData.get('costPrice'),
    stock: Number(formData.get('stock') || 0),
    minStock: Number(formData.get('minStock') || 5),
    imageUrl: formData.get('existingImageUrl'),
    // Logic Checkbox: kalau dicentang valuenya 'on'/'true', kalau tidak null
    isActive:
      formData.get('isActive') === 'on' || formData.get('isActive') === 'true',
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

  // 3. Handle Image Upload
  const imageFile = formData.get('image') as File;
  let finalImageUrl = data.imageUrl as string | null;

  if (imageFile && imageFile.size > 0) {
    if (!imageFile.type.startsWith('image/')) {
      return { success: false, message: 'File harus berupa gambar.' };
    }
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, imageFile, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('products')
        .getPublicUrl(fileName);
      finalImageUrl = urlData.publicUrl;
    } catch (error) {
      console.error('Upload Error:', error);
      return { success: false, message: 'Gagal upload gambar.' };
    }
  }

  // 4. Database Transaction
  try {
    const payload = {
      ...data,
      imageUrl: finalImageUrl,
      // Pastikan decimal masuk sebagai string
      price: String(data.price),
      costPrice: String(data.costPrice),
      updatedAt: new Date(),
    };

    if (data.id) {
      // UPDATE
      await db.update(products).set(payload).where(eq(products.id, data.id));
    } else {
      // CREATE
      await db.insert(products).values({ ...payload, createdAt: new Date() });
    }

    revalidatePath('/dashboard/products'); // Sesuaikan path ini dengan halamanmu!
    return { success: true, message: 'Produk berhasil disimpan!' };
  } catch (error: unknown) {
    console.error('DB Error:', error);
    if (isPostgresError(error) && error.code === '23505') {
      if (error.detail?.includes('sku'))
        return { success: false, message: 'SKU sudah ada.' };
      if (error.detail?.includes('barcode'))
        return { success: false, message: 'Barcode sudah ada.' };
    }
    return { success: false, message: 'Gagal menyimpan data.' };
  }
}

// --- 3. DELETE PRODUCT (DENGAN IMAGE CLEANUP) ---
export async function deleteProductsAction(ids: number[]) {
  try {
    if (ids.length === 0)
      return { success: false, message: 'Pilih produk dulu.' };

    // 1. Ambil URL gambar dulu
    const productsToDelete = await db
      .select({ imageUrl: products.imageUrl })
      .from(products)
      .where(inArray(products.id, ids));

    // 2. Filter nama file dari URL
    const imagePaths = productsToDelete
      .map((p) => {
        if (!p.imageUrl) return null;
        const parts = p.imageUrl.split('/');
        return parts[parts.length - 1];
      })
      .filter((path): path is string => path !== null);

    // 3. Hapus Gambar di Supabase
    if (imagePaths.length > 0) {
      await supabase.storage.from('products').remove(imagePaths);
    }

    // 4. Hapus Data di DB
    await db.delete(products).where(inArray(products.id, ids));

    revalidatePath('/dashboard/products');
    return {
      success: true,
      message: `Berhasil menghapus ${ids.length} produk.`,
    };
  } catch (error) {
    console.error('Delete Error:', error);
    return { success: false, message: 'Gagal menghapus produk.' };
  }
}

// --- 4. SEED DUMMY DATA (FITUR LAMA DIKEMBALIKAN) ---
export async function seedDummyProducts() {
  try {
    const prefixes = ['Ice', 'Hot', 'Premium', 'Double', 'Royal', 'Spicy'];
    const items = [
      'Latte',
      'Cappuccino',
      'Croissant',
      'Burger',
      'Pasta',
      'Tea',
      'Smoothie',
    ];
    const suffixes = [
      'Special',
      'Deluxe',
      'Hazelnut',
      'Caramel',
      'Cheese',
      'Original',
    ];

    const name = `${randomChoice(prefixes)} ${randomChoice(items)} ${randomChoice(suffixes)}`;
    const uniqueId = Date.now().toString().slice(-4) + randomInt(10, 99);
    const sku = `${name.substring(0, 3).toUpperCase()}-${uniqueId}`;

    const newProduct = {
      name: name,
      description: `Auto-generated ${name}`,
      price: String(randomInt(15, 75) * 1000), // String untuk decimal
      costPrice: String(randomInt(5, 10) * 1000), // String untuk decimal
      stock: randomInt(0, 100),
      sku: sku,
      isActive: Math.random() > 0.2,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(products).values(newProduct);

    revalidatePath('/dashboard/products');
    return { success: true, message: `Berhasil menambah: ${name}` };
  } catch (error) {
    console.error('Seed Error:', error);
    return { success: false, message: 'Gagal seeding data.' };
  }
}

// --- 5. RESET DATABASE (FITUR LAMA DIKEMBALIKAN) ---
export async function deleteAllProducts() {
  try {
    // Hapus anak dulu (Order Items) agar tidak error constraint
    await db.delete(orderItems);

    // Opsional: Hapus Orders juga
    await db.delete(orders);

    // Baru hapus produk
    await db.delete(products);

    revalidatePath('/dashboard/products');
    return { success: true, message: 'Database bersih total!' };
  } catch (error) {
    console.error('Reset Error:', error);
    return { success: false, message: 'Gagal reset database.' };
  }
}
