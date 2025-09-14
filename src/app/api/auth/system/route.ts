import { NextResponse } from 'next/server';
import { authenticateSystemPassword } from '@/lib/systemAuth';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password richiesta' },
        { status: 400 }
      );
    }

    const result = await authenticateSystemPassword(password);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Autenticazione riuscita'
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Autenticazione fallita' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('System authentication API error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}