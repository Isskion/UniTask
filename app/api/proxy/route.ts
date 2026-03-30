import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // UNIGIS APIs are sensitive to headers and body format
  const contentType = req.headers.get("content-type") || "application/json";
  const body = await req.text();

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        // Forward potential auth headers
        "ApiKey": req.headers.get("ApiKey") || "",
        "Authorization": req.headers.get("Authorization") || "",
        "MapiToken": req.headers.get("MapiToken") || "",
      },
      body: body,
    });

    const responseData = await response.text();
    const responseContentType = response.headers.get("content-type") || "application/json";

    return new NextResponse(responseData, {
      status: response.status,
      headers: {
        "Content-Type": responseContentType,
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    console.error("Proxy Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const response = await fetch(targetUrl);
    const responseData = await response.text();
    const responseContentType = response.headers.get("content-type") || "application/json";

    return new NextResponse(responseData, {
      status: response.status,
      headers: {
        "Content-Type": responseContentType,
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    console.error("Proxy Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
            "Access-Control-Allow-Headers": "*",
        },
    });
}
