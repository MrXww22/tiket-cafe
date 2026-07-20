import { NextRequest, NextResponse } from "next/server";
import type { StaffRole } from "@/generated/prisma/enums";
import { sessionCookieName, verifySessionToken } from "@/lib/auth";

const roleHome: Record<StaffRole, string> = {
  ADMIN: "/admin",
  WAITER: "/waiters",
  KITCHEN: "/kitchen",
  BAR: "/bar",
};

const pageAccess: Array<{ prefix: string; roles: StaffRole[] }> = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/waiters", roles: ["ADMIN", "WAITER"] },
  { prefix: "/kitchen", roles: ["ADMIN", "KITCHEN"] },
  { prefix: "/bar", roles: ["ADMIN", "BAR"] },
];

const apiAccess: Array<{ prefix: string; methods?: string[]; roles: StaffRole[] }> = [
  { prefix: "/api/uploads", roles: ["ADMIN"] },
  { prefix: "/api/categories", methods: ["POST", "PATCH", "DELETE"], roles: ["ADMIN"] },
  { prefix: "/api/products", methods: ["POST", "PATCH", "DELETE"], roles: ["ADMIN"] },
  { prefix: "/api/shifts", roles: ["ADMIN"] },
  { prefix: "/api/reports", roles: ["ADMIN"] },
  { prefix: "/api/reviews", methods: ["GET"], roles: ["ADMIN"] },
  { prefix: "/api/settings", roles: ["ADMIN"] },
  { prefix: "/api/staff", roles: ["ADMIN"] },
  { prefix: "/api/tables", methods: ["GET", "PATCH"], roles: ["ADMIN", "WAITER"] },
  { prefix: "/api/tables", methods: ["POST", "DELETE"], roles: ["ADMIN"] },
  { prefix: "/api/orders/table", methods: ["GET"], roles: ["ADMIN"] },
  { prefix: "/api/orders", methods: ["GET"], roles: ["ADMIN", "WAITER", "KITCHEN", "BAR"] },
  { prefix: "/api/orders/", methods: ["PATCH"], roles: ["ADMIN", "WAITER"] },
  { prefix: "/api/order-items", roles: ["ADMIN", "KITCHEN", "BAR"] },
  { prefix: "/api/waiter-notifications", roles: ["ADMIN", "WAITER"] },
  { prefix: "/api/department-notifications", roles: ["ADMIN", "KITCHEN", "BAR"] },
];

const isPublicApi = (request: NextRequest) => {
  const { pathname } = request.nextUrl;
  const method = request.method;

  if (pathname === "/api/auth/login" || pathname === "/api/auth/logout" || pathname === "/api/auth/me") return true;
  if (pathname.startsWith("/api/menu-table/") && method === "GET") return true;
  if (pathname === "/api/categories" && method === "GET") return true;
  if (pathname === "/api/products" && method === "GET") return true;
  if (pathname === "/api/orders" && method === "POST") return true;
  if (pathname === "/api/delivery/orders" && method === "POST") return true;
  if (pathname.startsWith("/api/orders/table/") && method === "GET") return true;
  if (pathname === "/api/reviews" && method === "POST") return true;
  if (pathname === "/api/waiter-call" && method === "POST") return true;

  return false;
};

const getRequiredApiRoles = (request: NextRequest) => {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const rule = apiAccess.find((candidate) => {
    const methodMatches = !candidate.methods || candidate.methods.includes(method);
    return methodMatches && pathname.startsWith(candidate.prefix);
  });

  return rule?.roles ?? (pathname.startsWith("/api/") ? (["ADMIN"] satisfies StaffRole[]) : null);
};

const getRequiredPageRoles = (pathname: string) => {
  const rule = pageAccess.find((candidate) => pathname.startsWith(candidate.prefix));
  return rule?.roles ?? null;
};

const redirectToLogin = (request: NextRequest) => {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
};

const forbidden = (request: NextRequest, role: StaffRole) => {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ message: "Недостаточно прав" }, { status: 403 });
  }

  return NextResponse.redirect(new URL(roleHome[role], request.url));
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (isPublicApi(request)) return NextResponse.next();

    const user = await verifySessionToken(request.cookies.get(sessionCookieName)?.value);
    if (!user) return NextResponse.json({ message: "Требуется авторизация" }, { status: 401 });

    const requiredRoles = getRequiredApiRoles(request);
    if (requiredRoles && !requiredRoles.includes(user.role)) return forbidden(request, user.role);

    return NextResponse.next();
  }

  if (pathname === "/login") {
    const user = await verifySessionToken(request.cookies.get(sessionCookieName)?.value);
    if (user) return NextResponse.redirect(new URL(roleHome[user.role], request.url));

    return NextResponse.next();
  }

  const requiredRoles = getRequiredPageRoles(pathname) ?? (["ADMIN", "WAITER", "KITCHEN", "BAR"] satisfies StaffRole[]);

  const user = await verifySessionToken(request.cookies.get(sessionCookieName)?.value);
  if (!user) return redirectToLogin(request);
  if (!requiredRoles.includes(user.role)) return forbidden(request, user.role);
  if (pathname === "/") return NextResponse.redirect(new URL(roleHome[user.role], request.url));

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads|menu|delivery).*)"],
};
