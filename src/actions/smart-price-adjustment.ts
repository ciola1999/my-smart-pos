
import { db } from '@/db';
import { products } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Path utama aplikasi kamu (agar UI langsung refresh saat data berubah)
const MAIN_PATH = '/projects/smart-pos';

export async function updateProductPrice(id: number, newPrice: number) {
  try {
    // Validasi basic
    if (newPrice < 0) throw new Error('Harga tidak boleh minus');

    await db
      .update(products)
      .set({
        // 🔥 FIX: Konversi ke string agar Drizzle/Postgres Decimal tidak error
        price: newPrice.toString(),
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));



    return { success: true };
  } catch (error) {
    console.error('Update Price Error:', error);
    return { success: false, message: 'Gagal update harga' };
  }
}

export async function updateProductCost(id: number, newCost: number) {
  try {
    if (newCost < 0) throw new Error('HPP tidak boleh minus');

    await db
      .update(products)
      .set({
        // ✅ INI SUDAH BENAR (Good Job!)
        costPrice: newCost.toString(),
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));

    return { success: true };
  } catch (error) {
    console.error('Update Cost Error:', error);
    return { success: false, message: 'Gagal update HPP' };
  }
}

export async function updateProductStock(id: number, newStock: number) {
  try {
    // Validasi stok
    if (newStock < 0) throw new Error('Stok tidak boleh minus');

    await db
      .update(products)
      .set({ 
        stock: newStock,
        updatedAt: new Date() 
      })
      .where(eq(products.id, id));

 
    return { success: true };
  } catch (error) {
    console.error('Update Stock Error:', error);
    return { success: false, message: 'Gagal update stok' };
  }
}

// --- Action untuk Toggle Status Produk ---
export async function toggleProductStatus(id: number, currentStatus: boolean) {
  try {
    const newStatus = !currentStatus; // Balik statusnya

    await db
      .update(products)
      .set({ 
        isActive: newStatus,
        updatedAt: new Date()
      })
      .where(eq(products.id, id));

    return { success: true, newStatus };
  } catch (error) {
    console.error('Error toggle status:', error);
    return { success: false, message: 'Gagal update status' };
  }
}