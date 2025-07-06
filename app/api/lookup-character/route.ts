import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { characterId } = await request.json();
    
    const response = await fetch(
      "https://esi.evetech.net/latest/universe/names/?datasource=tranquility",
      {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify([characterId]),
      }
    );
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Lookup character error:', error);
    return NextResponse.json(
      { error: "Failed to lookup character" },
      { status: 500 }
    );
  }
}