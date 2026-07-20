import type { WaiterNotificationType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

type CreateWaiterNotificationInput = {
  type: WaiterNotificationType;
  tableNumber: number;
  title: string;
  message: string;
  waiterId?: string | null;
};

export async function createWaiterNotification(input: CreateWaiterNotificationInput) {
  return prisma.waiterNotification.create({
    data: input,
  });
}

export async function createWaiterNotificationForTable(input: Omit<CreateWaiterNotificationInput, "waiterId">) {
  const table = await prisma.diningTable.findUnique({
    where: { number: input.tableNumber },
    select: { waiterId: true },
  });

  if (!table?.waiterId) return null;

  return createWaiterNotification({
    ...input,
    waiterId: table.waiterId,
  });
}
