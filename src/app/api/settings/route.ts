import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRestaurantSettings } from "@/lib/settings";

const settingsSchema = z.object({
  waiterPercent: z.coerce.number().min(0).max(100),
  cleanupMinutes: z.coerce.number().int().min(1).max(180),
});

export async function GET() {
  const settings = await getRestaurantSettings();
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const payload = settingsSchema.parse(await request.json());
  const settings = await prisma.restaurantSettings.upsert({
    where: { id: "main" },
    create: {
      id: "main",
      waiterPercent: payload.waiterPercent,
      cleanupMinutes: payload.cleanupMinutes,
    },
    update: payload,
  });

  return NextResponse.json(settings);
}
