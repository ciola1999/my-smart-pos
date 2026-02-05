
import { db } from '@/db';
import { storeSettings, taxes } from '@/db/schema'; // Tambahkan taxes
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// --- SCHEMA VALIDASI (ZOD) ---
const settingsFormSchema = z.object({
  name: z.string().min(1, 'Nama toko wajib diisi'),
  description: z.string().optional(),
  address: z.string().min(1, 'Alamat wajib untuk keperluan struk'),
  phone: z.string().optional(),
  email: z
    .string()
    .email('Format email tidak valid')
    .optional()
    .or(z.literal('')),
  receiptFooter: z.string().optional(),

  // Tax rate tetap kita terima dari form, tapi penanganannya beda nanti
  taxRate: z.string().optional(),
});

export type SettingsState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  errors?: Record<string, string[]>;
  timestamp?: number;
};

// --- GET SETTINGS (Update: Ambil Pajak Juga) ---
export async function getStoreSettings() {
  if (typeof window === "undefined") {
    return { success: true, data: null }; // Return null atau default object
  }
  try {
    // 1. Ambil Setting Toko
    const settingsPromise = db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.id, 1))
      .limit(1);

    // 2. Ambil Data Pajak (PPn)
    const taxPromise = db
      .select()
      .from(taxes)
      .where(eq(taxes.name, 'PPn')) // Kita asumsikan pajak utama namanya 'PPn'
      .limit(1);

    // Jalankan parallel biar cepat
    const [settingsRes, taxRes] = await Promise.all([
      settingsPromise,
      taxPromise,
    ]);

    if (settingsRes.length === 0) return null;

    // Gabungkan data untuk dikirim ke UI
    return {
      ...settingsRes[0],
      taxRate: taxRes.length > 0 ? taxRes[0].rate : '0', // Inject taxRate manual ke object
    };
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return null;
  }
}

// --- UPDATE SETTINGS ---
export async function updateStoreSettingsAction(
  prevState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  // 1. Validasi Input
  const rawData = {
    name: formData.get('name'),
    description: formData.get('description'),
    address: formData.get('address'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    receiptFooter: formData.get('receiptFooter'),
    taxRate: formData.get('taxRate'), // Ambil input taxRate
  };

  const validated = settingsFormSchema.safeParse(rawData);

  if (!validated.success) {
    return {
      status: 'error',
      message: 'Mohon periksa kembali input Anda.',
      errors: validated.error.flatten().fieldErrors,
    };
  }

  try {
    const data = validated.data;

    // Konversi taxRate
    const newTaxRate = data.taxRate ? data.taxRate.toString() : '0';

    // 🔥 TRANSACTION START: Bungkus 2 update dalam 1 transaksi
    await db.transaction(async (tx) => {
      // STEP 1: Update Info Toko (TANPA taxRate)
      await tx
        .insert(storeSettings)
        .values({
          id: 1,
          name: data.name,
          description: data.description || '',
          address: data.address,
          phone: data.phone || '',
          email: data.email || '',
          website: '', // Jika ada field website di schema
          receiptFooter: data.receiptFooter || '',
          // ❌ JANGAN MASUKKAN taxRate DI SINI
        })
        .onConflictDoUpdate({
          target: storeSettings.id,
          set: {
            name: data.name,
            description: data.description || '',
            address: data.address,
            phone: data.phone || '',
            email: data.email || '',
            receiptFooter: data.receiptFooter || '',
            updatedAt: new Date(),
          },
        });

      // STEP 2: Update Tabel Taxes (PPn)
      // Kita pakai logic UPSERT juga untuk pajak, biar kalau tabel kosong dia otomatis buat
      // Asumsi kita kelola pajak dengan nama 'PPn'

      // Cek dulu apakah 'PPn' ada?
      const existingTax = await tx
        .select()
        .from(taxes)
        .where(eq(taxes.name, 'PPn'));

      if (existingTax.length > 0) {
        // Update
        await tx
          .update(taxes)
          .set({ rate: newTaxRate })
          .where(eq(taxes.name, 'PPn'));
      } else {
        // Insert baru jika belum ada
        await tx.insert(taxes).values({
          name: 'PPn',
          rate: newTaxRate,
          isActive: true,
        });
      }
    });
    // 🔥 TRANSACTION END


    return {
      status: 'success',
      message: 'Pengaturan toko & pajak berhasil diperbarui!',
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Update Error:', error);
    return {
      status: 'error',
      message: 'Gagal menyimpan. Cek koneksi database.',
    };
  }
}
