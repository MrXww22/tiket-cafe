import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Файл не найден" }, { status: 400 });
  }

  if (!allowedTypes.has(file.type)) {
    return NextResponse.json({ message: "Можно загрузить только изображение" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ message: "Файл должен быть не больше 5 МБ" }, { status: 400 });
  }

  const extension = path.extname(file.name).toLowerCase() || ".jpg";
  const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(uploadsDir, filename);

  await mkdir(uploadsDir, { recursive: true });
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
}
