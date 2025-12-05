import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    try {
        const path = request.nextUrl.pathname;
        const token = request.cookies.get("token")?.value;

        const protectedPaths = [
            "/dashboard/profile",
            "/dashboard/leaderboard",
            "/play",
            "/play/quiz",
            "/play/quiz/result",
            "/play/quiz/start",
            "/play/quiz/classic",
            "/play/ai/quiz",
            "/play/ai/result",
            "/play/aiplus/quiz",
            "/play/aiplus/result",
        ];

        const adminPaths = [
            "/admin",
            "/admin/logs",
            "/admin/feedback",
            "/admin/users",
            "/admin/questions",
            "/admin/categories",
        ];

        const authPaths = ["/auth"];

        if (path === "/" || path.startsWith("/api")) {
            return NextResponse.next();
        }

        // Korunan sayfalara erişim kontrolü
        if (protectedPaths.some(pp => path.startsWith(pp))) {
            if (!token) {
                return NextResponse.redirect(new URL("/auth", request.url));
            }
        }

        if (adminPaths.some((ap) => path.startsWith(ap))) {
            if (!token) {
                return NextResponse.redirect(new URL("/auth", request.url));
            }

            try {
                // Token'dan role'ü direkt oku (fetch yerine)
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { 
                    id: number; 
                    email: string; 
                    username: string; 
                    role: string 
                };

                if (decoded.role !== "admin") {
                    return NextResponse.redirect(new URL("/", request.url));
                }

            } catch (error) {
                // Token geçersiz veya süresi dolmuş
                return NextResponse.redirect(new URL("/auth", request.url));
            }
        }

        if (authPaths.includes(path) && token) {
            return NextResponse.redirect(new URL("/", request.url));
        }

        return NextResponse.next();
    } catch (error) {
        return NextResponse.json(
            { success: false, message: "Sistem hatası" },
            { status: 500 }
        );
    }
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|public).*)",
    ],
};