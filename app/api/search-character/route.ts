import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    
    const response = await fetch(
      "https://esi.evetech.net/latest/universe/ids/?datasource=tranquility&language=en",
      {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Accept-Language": "en",
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify([name]),
      }
    );
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Search character error:', error);
    return NextResponse.json(
      { error: "Failed to search character" },
      { status: 500 }
    );
  }
}