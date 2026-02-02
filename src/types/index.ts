// types/index.ts
import { products } from '@/features/smart-pos/db/schema';
import { InferSelectModel } from 'drizzle-orm';

export type Products = InferSelectModel<typeof products>;

export type CartItem = Products & {
  quantity: number;
};
