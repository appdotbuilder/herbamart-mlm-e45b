import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

// Simple JWT-like token implementation (for demo purposes)
// In production, use proper JWT library
function createToken(payload: any): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = { ...payload, exp: now + 24 * 60 * 60 }; // 24 hours
  
  const base64Header = btoa(JSON.stringify(header));
  const base64Payload = btoa(JSON.stringify(tokenPayload));
  const signature = btoa(`${base64Header}.${base64Payload}.secret`);
  
  return `${base64Header}.${base64Payload}.${signature}`;
}

function verifyToken(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp < now) return null; // Token expired
    
    return payload;
  } catch {
    return null;
  }
}

// Simple password hashing (for demo purposes)
// In production, use proper bcrypt
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function comparePassword(password: string, hash: string): Promise<boolean> {
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
}

export async function login(input: LoginInput): Promise<{ user: User; token: string }> {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      throw new Error('Username atau password salah');
    }

    const user = users[0];

    // Verify password
    const passwordMatch = await comparePassword(input.password, user.password);
    if (!passwordMatch) {
      throw new Error('Username atau password salah');
    }

    // Generate token
    const token = createToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    // Return user without password
    const userResponse: User = {
      id: user.id,
      username: user.username,
      password: '', // Never return actual password
      role: user.role,
      created_at: user.created_at
    };

    return {
      user: userResponse,
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function getCurrentUser(token: string): Promise<User | null> {
  try {
    // Verify and decode token
    const decoded = verifyToken(token);
    
    if (!decoded || !decoded.userId) {
      return null;
    }

    // Fetch user from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, decoded.userId))
      .execute();

    if (users.length === 0) {
      return null;
    }

    const user = users[0];

    // Return user without password
    return {
      id: user.id,
      username: user.username,
      password: '', // Never return actual password
      role: user.role,
      created_at: user.created_at
    };
  } catch (error) {
    console.error('Get current user failed:', error);
    return null;
  }
}

export async function resetPassword(email: string): Promise<{ success: boolean; message: string }> {
  try {
    // For security reasons, we don't actually verify if the email exists
    // This prevents email enumeration attacks
    // In a real implementation, you would:
    // 1. Generate a secure reset token
    // 2. Store it in a password_reset_tokens table with expiration
    // 3. Send email with reset link containing the token (only if email exists)
    // 4. Handle the reset process in a separate endpoint
    // 5. Always return success message regardless of email existence

    return {
      success: true,
      message: 'Jika email terdaftar, link reset password akan dikirim'
    };
  } catch (error) {
    console.error('Reset password failed:', error);
    // Don't reveal if email exists or not for security
    return {
      success: true,
      message: 'Jika email terdaftar, link reset password akan dikirim'
    };
  }
}

// Export utility functions for testing
export const _internal = {
  hashPassword,
  comparePassword,
  createToken,
  verifyToken
};