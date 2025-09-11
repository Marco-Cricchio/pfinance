import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    const expectedPassword = process.env.SHOW_AMOUNTS;
    
    if (!expectedPassword) {
      return NextResponse.json(
        { error: 'Password configuration not found' },
        { status: 500 }
      );
    }
    
    const isValid = password === expectedPassword;
    
    return NextResponse.json({ valid: isValid });
  } catch (error) {
    console.error('Error verifying password:', error);
    return NextResponse.json(
      { error: 'Error verifying password' },
      { status: 500 }
    );
  }
}