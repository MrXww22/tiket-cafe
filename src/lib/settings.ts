import { prisma } from "@/lib/prisma";

export async function getRestaurantSettings() {
  return prisma.restaurantSettings.upsert({
    where: { id: "main" },
    create: { id: "main" },
    update: {},
  });
}
