import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { url, method, headers, body } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        const response = await fetch(url, {
            method: method || "GET",
            headers: {
                ...headers,
                "User-Agent": "Apidog-like-Proxy/1.0",
            },
            body: method !== "GET" && method !== "HEAD" ? JSON.stringify(body) : undefined,
        });

        const status = response.status;
        const statusText = response.statusText;
        const responseHeaders = Object.fromEntries(response.headers.entries());

        let content;
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            content = await response.json();
        } else {
            content = await response.text();
        }

        return NextResponse.json({
            status,
            statusText,
            headers: responseHeaders,
            data: content,
        });
    } catch (err: any) {
        console.error("Proxy error:", err);
        return NextResponse.json(
            { error: err.message || "Failed to proxy request" },
            { status: 500 }
        );
    }
}
