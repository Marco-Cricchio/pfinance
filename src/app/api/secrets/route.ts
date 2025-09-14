import { NextResponse } from 'next/server';
import { 
  getUserSecrets, 
  updateDeobfuscationPassword, 
  updateOpenRouterApiKey,
  getDeobfuscationPassword,
  getOpenRouterApiKey
} from '@/lib/database';
import { authenticateSystemPassword } from '@/lib/systemAuth';

// GET - Get current secrets status
export async function GET() {
  try {
    const secrets = await getUserSecrets();
    
    if (!secrets) {
      return NextResponse.json({
        hasDeobfuscationPassword: false,
        hasOpenRouterApiKey: false,
        isDefaultPassword: true
      });
    }

    return NextResponse.json({
      hasDeobfuscationPassword: !!secrets.deobfuscation_password_encrypted,
      hasOpenRouterApiKey: !!secrets.openrouter_api_key_encrypted,
      isDefaultPassword: secrets.is_default_password,
      lastUpdated: secrets.last_updated_at
    });
  } catch (error) {
    console.error('Error getting secrets status:', error);
    return NextResponse.json(
      { error: 'Errore durante il recupero dello stato dei secrets' },
      { status: 500 }
    );
  }
}

// POST - Update secrets
export async function POST(request: Request) {
  try {
    const { type, value, systemPassword } = await request.json();

    // Validate required fields
    if (!type || !systemPassword) {
      return NextResponse.json(
        { error: 'Tipo e password di sistema richiesti' },
        { status: 400 }
      );
    }

    // Authenticate system password first
    const authResult = await authenticateSystemPassword(systemPassword);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error || 'Password di sistema non valida' },
        { status: 401 }
      );
    }

    let success = false;
    let message = '';

    switch (type) {
      case 'deobfuscation_password':
        if (!value) {
          return NextResponse.json(
            { error: 'Password di deobfuscation richiesta' },
            { status: 400 }
          );
        }
        success = await updateDeobfuscationPassword(value, systemPassword);
        message = 'Password di deobfuscation aggiornata con successo';
        break;

      case 'openrouter_api_key':
        success = await updateOpenRouterApiKey(value || '', systemPassword);
        message = value ? 'Chiave API OpenRouter aggiornata con successo' : 'Chiave API OpenRouter rimossa con successo';
        break;

      default:
        return NextResponse.json(
          { error: 'Tipo di secret non valido' },
          { status: 400 }
        );
    }

    if (success) {
      return NextResponse.json({
        success: true,
        message
      });
    } else {
      return NextResponse.json(
        { error: 'Errore durante l\'aggiornamento del secret' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating secrets:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// PUT - Verify and get decrypted values
export async function PUT(request: Request) {
  try {
    const { type, systemPassword } = await request.json();

    if (!type || !systemPassword) {
      return NextResponse.json(
        { error: 'Tipo e password di sistema richiesti' },
        { status: 400 }
      );
    }

    // Authenticate system password first
    const authResult = await authenticateSystemPassword(systemPassword);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error || 'Password di sistema non valida' },
        { status: 401 }
      );
    }

    let value: string | null = null;

    switch (type) {
      case 'deobfuscation_password':
        value = await getDeobfuscationPassword(systemPassword);
        break;

      case 'openrouter_api_key':
        value = await getOpenRouterApiKey(systemPassword);
        break;

      default:
        return NextResponse.json(
          { error: 'Tipo di secret non valido' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      value: value || ''
    });
  } catch (error) {
    console.error('Error getting decrypted secrets:', error);
    return NextResponse.json(
      { error: 'Errore durante il recupero del secret' },
      { status: 500 }
    );
  }
}