import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ number: string }>;
};

export async function GET(request: Request, { params }: Params) {
  const { number } = await params;
  const table = await prisma.diningTable.findUnique({
    where: { number: Number(number) },
    select: { qrToken: true },
  });

  if (!table) {
    return NextResponse.json({ message: "Столик не найден" }, { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const menuUrl = `${baseUrl}/menu/${encodeURIComponent(table.qrToken)}`;
  const image = await QRCode.toBuffer(menuUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 640,
  });

  return new NextResponse(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
