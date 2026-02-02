import { z } from 'zod';

// Schema untuk validasi Form Input
export const memberFormSchema = z.object({
  id: z.number().optional(), // Optional karena saat create belum ada ID
  name: z.string().min(3, 'Nama minimal 3 karakter'),
  phone: z
    .string()
    .min(10, 'Nomor HP minimal 10 digit')
    .max(20, 'Nomor HP maksimal 20 digit')
    .regex(/^[0-9]+$/, 'Nomor HP hanya boleh angka'),
  email: z
    .string()
    .email('Format email tidak valid')
    .optional()
    .or(z.literal('')),
  tier: z.enum(['Silver', 'Gold', 'Platinum']).default('Silver'),
});

export type MemberFormValues = z.infer<typeof memberFormSchema>;
