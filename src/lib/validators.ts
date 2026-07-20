import { z } from "zod";

export const departmentSchema = z.enum(["KITCHEN", "BAR"]);

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(2),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const tableCreateSchema = z.object({
  number: z.coerce.number().int().positive(),
  seats: z.coerce.number().int().positive().default(4),
});

export const tableUpdateSchema = z.object({
  status: z.enum(["FREE", "BUSY", "RESERVED", "CLEANING"]).optional(),
  waiterId: z.string().nullable().optional(),
});

export const productCreateSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().optional().default(""),
  price: z.coerce.number().int().positive(),
  imageUrl: z.string().trim().optional().default(""),
  department: departmentSchema,
  categoryId: z.string().min(1),
});

export const productUpdateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  description: z.string().trim().optional(),
  price: z.coerce.number().int().positive().optional(),
  imageUrl: z.string().trim().optional(),
  department: departmentSchema.optional(),
  categoryId: z.string().min(1).optional(),
  isPaused: z.boolean().optional(),
});

export const orderCreateSchema = z.object({
  tableToken: z.string().trim().min(10),
  comment: z.string().trim().optional().default(""),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
      }),
    )
    .min(1),
});

export const deliveryOrderCreateSchema = z.object({
  customerName: z.string().trim().min(2),
  customerPhone: z.string().trim().min(5).max(32),
  deliveryAddress: z.string().trim().min(5),
  deliveryEntrance: z.string().trim().max(20).optional().default(""),
  deliveryFloor: z.string().trim().max(20).optional().default(""),
  deliveryApartment: z.string().trim().max(20).optional().default(""),
  deliveryLat: z.coerce.number().optional(),
  deliveryLng: z.coerce.number().optional(),
  comment: z.string().trim().optional().default(""),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
      }),
    )
    .min(1),
});

export const itemStatusSchema = z.object({
  status: z.enum(["NEW", "COOKING", "READY"]),
});

export const orderReviewSchema = z.object({
  orderId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().default(""),
});
