import { z } from "zod";

export const productSchema = z.object({
  id: z.number().optional(),

  categoryId: z.coerce.number().optional().nullable(),

  name: z.string().min(3, { message: "Nama produk minimal 3 karakter" }),
  
  description: z.string().optional(),
  
  imageUrl: z.string().optional().nullable().or(z.literal("")),
  
  barcode: z.string().optional(),
  
  sku: z.string().optional(),

  // ✅ PERBAIKAN: Hapus parameter di dalam number()
  // z.coerce akan otomatis ubah string jadi angka.
  // Kalau gagal (misal input huruf "abc"), dia akan jadi NaN dan gagal di .min()
  price: z.coerce
    .number() 
    .min(0, "Harga tidak boleh minus"),

  costPrice: z.coerce
    .number()
    .min(0, "Harga modal tidak boleh minus"),

  stock: z.coerce
    .number()
    .int()
    .min(0, "Stok tidak boleh minus")
    .default(0),

  minStock: z.coerce
    .number()
    .int()
    .min(0)
    .default(5),

  isActive: z.boolean().default(true),
});

export type ProductFormValues = z.infer<typeof productSchema>;