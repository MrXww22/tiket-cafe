import type { Department } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

type CreateDepartmentNotificationInput = {
  department: Department;
  orderId?: string;
  tableNumber: number;
  title: string;
  message: string;
};

export async function createDepartmentNotification(input: CreateDepartmentNotificationInput) {
  return prisma.departmentNotification.create({
    data: input,
  });
}
