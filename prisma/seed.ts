import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL || "" }),
});

async function main() {
  const menu = await prisma.category.upsert({
    where: { id: "seed-menu" },
    update: {},
    create: { id: "seed-menu", name: "Основное меню", sortOrder: 1 },
  });

  const drinks = await prisma.category.upsert({
    where: { id: "seed-drinks" },
    update: {},
    create: { id: "seed-drinks", name: "Напитки", sortOrder: 2 },
  });

  await Promise.all(
    [1, 2, 3, 4, 5, 6].map((number) =>
      prisma.diningTable.upsert({
        where: { number },
        update: {},
        create: { number, seats: 4 },
      }),
    ),
  );

  const products = [
    {
      id: "seed-caesar",
      name: "Цезарь с курицей",
      description: "Салат романо, курица, пармезан, сухари и фирменный соус.",
      price: 590,
      department: "KITCHEN" as const,
      categoryId: menu.id,
      imageUrl: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "seed-pasta",
      name: "Паста карбонара",
      description: "Спагетти, бекон, сливочный соус и пармезан.",
      price: 720,
      department: "KITCHEN" as const,
      categoryId: menu.id,
      imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "seed-latte",
      name: "Латте",
      description: "Эспрессо и взбитое молоко.",
      price: 260,
      department: "BAR" as const,
      categoryId: drinks.id,
      imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "seed-lemonade",
      name: "Домашний лимонад",
      description: "Лимон, мята, содовая и лед.",
      price: 340,
      department: "BAR" as const,
      categoryId: drinks.id,
      imageUrl: "https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=900&q=80",
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: product,
      create: product,
    });
  }

  const users = [
    { username: "admin", password: "admin123", name: "Администратор", role: "ADMIN" as const },
    { username: "waiter", password: "waiter123", name: "Официант", role: "WAITER" as const },
    { username: "kitchen", password: "kitchen123", name: "Кухня", role: "KITCHEN" as const },
    { username: "bar", password: "bar123", name: "Бар", role: "BAR" as const },
  ];

  for (const user of users) {
    await prisma.staffUser.upsert({
      where: { username: user.username },
      update: {
        name: user.name,
        role: user.role,
      },
      create: {
        username: user.username,
        name: user.name,
        role: user.role,
        passwordHash: hashPassword(user.password),
      },
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
