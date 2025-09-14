import { NextRequest, NextResponse } from 'next/server';
import { getUserSecrets } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    if (!password) {
      return NextResponse.json({ valid: false, error: 'Password richiesta' });
    }

    const secrets = await getUserSecrets();
    
    // If no secrets stored, use fallback to .env (backward compatibility)
    if (!secrets?.deobfuscation_password_encrypted) {
      const expectedPassword = process.env.SHOW_AMOUNTS;
      
      if (!expectedPassword) {
        return NextResponse.json({
          valid: false,
          error: 'Sistema non configurato - password non trovata'
        });
      }

      const isValid = password === expectedPassword;
      return NextResponse.json({ valid: isValid });
    }

    // For database-stored passwords, check if it's the default
    if (secrets.is_default_password) {
      const isValid = password === 'pFinance';
      return NextResponse.json({ valid: isValid });
    }
    
    // For custom passwords, use hash-based verification
    if (!secrets.deobfuscation_password_hash || !secrets.encryption_salt) {
      return NextResponse.json({ 
        valid: false,
        error: 'Password personalizzata non configurata correttamente'
      });
    }
    
    try {
      const { createHash } = await import('crypto');
      
      // Create hash of the input password using same method as when stored
      const inputPasswordHash = createHash('sha256').update(password + secrets.encryption_salt).digest('hex');
      
      // Compare with stored hash
      const isValid = inputPasswordHash === secrets.deobfuscation_password_hash;
      
      return NextResponse.json({ valid: isValid });
    } catch (error) {
      console.error('Error verifying custom password:', error);
      return NextResponse.json({ 
        valid: false,
        error: 'Errore nella verifica della password'
      });
    }
    
  } catch (error) {
    console.error('Error verifying password:', error);
    return NextResponse.json(
      { error: 'Error verifying password' },
      { status: 500 }
    );
  }
}
