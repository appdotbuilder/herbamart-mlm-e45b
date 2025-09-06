import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login, getCurrentUser, resetPassword, _internal } from '../handlers/auth';
import { sql } from 'drizzle-orm';

// Custom setup functions for auth tests only
async function setupAuthTables() {
  // Create only the users table for auth testing
  await db.execute(sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role') THEN
        CREATE TYPE role AS ENUM ('PELANGGAN', 'AGEN', 'ADMIN');
      END IF;
    END $$;
  `);
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role role NOT NULL DEFAULT 'PELANGGAN',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
}

async function cleanupAuthTables() {
  await db.execute(sql`DROP TABLE IF EXISTS users CASCADE;`);
  await db.execute(sql`DROP TYPE IF EXISTS role CASCADE;`);
}

// Test user data
const testUserData = {
  username: 'testuser',
  password: 'password123',
  role: 'AGEN' as const
};

describe('Auth handlers', () => {
  beforeEach(setupAuthTables);
  afterEach(cleanupAuthTables);

  describe('login', () => {
    it('should login user with correct credentials', async () => {
      // Hash password and create user
      const hashedPassword = await _internal.hashPassword(testUserData.password);
      const userResult = await db.insert(usersTable)
        .values({
          username: testUserData.username,
          password: hashedPassword,
          role: testUserData.role
        })
        .returning()
        .execute();

      const loginInput: LoginInput = {
        username: testUserData.username,
        password: testUserData.password
      };

      const result = await login(loginInput);

      // Verify user data
      expect(result.user.username).toEqual(testUserData.username);
      expect(result.user.role).toEqual(testUserData.role);
      expect(result.user.password).toEqual(''); // Password should not be returned
      expect(result.user.id).toEqual(userResult[0].id);
      expect(result.user.created_at).toBeInstanceOf(Date);

      // Verify token
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');

      // Verify token can be decoded
      const decoded = _internal.verifyToken(result.token);
      expect(decoded).not.toBeNull();
      expect(decoded.userId).toEqual(userResult[0].id);
      expect(decoded.username).toEqual(testUserData.username);
      expect(decoded.role).toEqual(testUserData.role);
    });

    it('should reject login with incorrect username', async () => {
      const loginInput: LoginInput = {
        username: 'nonexistentuser',
        password: 'password123'
      };

      await expect(login(loginInput)).rejects.toThrow(/username atau password salah/i);
    });

    it('should reject login with incorrect password', async () => {
      // Create user with correct password
      const hashedPassword = await _internal.hashPassword(testUserData.password);
      await db.insert(usersTable)
        .values({
          username: testUserData.username,
          password: hashedPassword,
          role: testUserData.role
        })
        .execute();

      const loginInput: LoginInput = {
        username: testUserData.username,
        password: 'wrongpassword'
      };

      await expect(login(loginInput)).rejects.toThrow(/username atau password salah/i);
    });

    it('should work with different user roles', async () => {
      const hashedPassword = await _internal.hashPassword(testUserData.password);
      
      // Test with ADMIN role
      await db.insert(usersTable)
        .values({
          username: 'admin',
          password: hashedPassword,
          role: 'ADMIN'
        })
        .execute();

      const adminLogin: LoginInput = {
        username: 'admin',
        password: testUserData.password
      };

      const adminResult = await login(adminLogin);
      expect(adminResult.user.role).toEqual('ADMIN');

      // Clean up for next test
      await db.execute(sql`DELETE FROM users WHERE username = 'admin'`);

      // Test with PELANGGAN role
      await db.insert(usersTable)
        .values({
          username: 'customer',
          password: hashedPassword,
          role: 'PELANGGAN'
        })
        .execute();

      const customerLogin: LoginInput = {
        username: 'customer',
        password: testUserData.password
      };

      const customerResult = await login(customerLogin);
      expect(customerResult.user.role).toEqual('PELANGGAN');
    });
  });

  describe('getCurrentUser', () => {
    it('should return user data for valid token', async () => {
      // Create user
      const hashedPassword = await _internal.hashPassword(testUserData.password);
      const userResult = await db.insert(usersTable)
        .values({
          username: testUserData.username,
          password: hashedPassword,
          role: testUserData.role
        })
        .returning()
        .execute();

      // Generate token
      const token = _internal.createToken({
        userId: userResult[0].id,
        username: userResult[0].username,
        role: userResult[0].role
      });

      const result = await getCurrentUser(token);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(userResult[0].id);
      expect(result!.username).toEqual(testUserData.username);
      expect(result!.role).toEqual(testUserData.role);
      expect(result!.password).toEqual(''); // Password should not be returned
      expect(result!.created_at).toBeInstanceOf(Date);
    });

    it('should return null for invalid token', async () => {
      const result = await getCurrentUser('invalid.token.here');
      expect(result).toBeNull();
    });

    it('should return null for expired token', async () => {
      // Create expired token by manually crafting one
      const header = { alg: 'HS256', typ: 'JWT' };
      const expiredPayload = { 
        userId: 999, 
        username: 'test', 
        role: 'AGEN',
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };
      
      const base64Header = btoa(JSON.stringify(header));
      const base64Payload = btoa(JSON.stringify(expiredPayload));
      const signature = btoa(`${base64Header}.${base64Payload}.secret`);
      const expiredToken = `${base64Header}.${base64Payload}.${signature}`;

      const result = await getCurrentUser(expiredToken);
      expect(result).toBeNull();
    });

    it('should return null for token with non-existent user', async () => {
      // Generate token for non-existent user
      const token = _internal.createToken({
        userId: 99999,
        username: 'nonexistent',
        role: 'AGEN'
      });

      const result = await getCurrentUser(token);
      expect(result).toBeNull();
    });

    it('should return null for malformed token', async () => {
      const result = await getCurrentUser('not.a.jwt');
      expect(result).toBeNull();
    });
  });

  describe('resetPassword', () => {
    it('should return success message for any email (security)', async () => {
      // Should not reveal whether email exists or not
      const result = await resetPassword('test@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('link reset password akan dikirim');
    });

    it('should return success message for non-existent email (security)', async () => {
      // Should not reveal whether email exists or not
      const result = await resetPassword('nonexistent@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('link reset password akan dikirim');
    });

    it('should handle database errors gracefully', async () => {
      // Test with invalid email format that might cause issues
      const result = await resetPassword('invalid-email-format');

      expect(result.success).toBe(true);
      expect(result.message).toContain('link reset password akan dikirim');
    });
  });

  describe('utility functions', () => {
    it('should hash and compare passwords correctly', async () => {
      const password = 'testpassword123';
      const hash = await _internal.hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);

      const match = await _internal.comparePassword(password, hash);
      expect(match).toBe(true);

      const noMatch = await _internal.comparePassword('wrongpassword', hash);
      expect(noMatch).toBe(false);
    });

    it('should create and verify tokens correctly', () => {
      const payload = {
        userId: 123,
        username: 'testuser',
        role: 'AGEN'
      };

      const token = _internal.createToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);

      const decoded = _internal.verifyToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.username).toBe(payload.username);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should handle token expiration correctly', () => {
      // Test with fresh token
      const freshToken = _internal.createToken({ userId: 1, username: 'test', role: 'AGEN' });
      const freshDecoded = _internal.verifyToken(freshToken);
      expect(freshDecoded).not.toBeNull();

      // Test with expired token (manually created)
      const expiredPayload = {
        userId: 1,
        username: 'test',
        role: 'AGEN',
        exp: Math.floor(Date.now() / 1000) - 1000 // Expired
      };
      
      const expiredToken = `${btoa(JSON.stringify({ alg: 'HS256' }))}.${btoa(JSON.stringify(expiredPayload))}.${btoa('signature')}`;
      const expiredDecoded = _internal.verifyToken(expiredToken);
      expect(expiredDecoded).toBeNull();
    });
  });

  describe('integration scenarios', () => {
    it('should complete full login flow', async () => {
      // Create user
      const hashedPassword = await _internal.hashPassword(testUserData.password);
      const userResult = await db.insert(usersTable)
        .values({
          username: testUserData.username,
          password: hashedPassword,
          role: testUserData.role
        })
        .returning()
        .execute();

      // Login
      const loginResult = await login({
        username: testUserData.username,
        password: testUserData.password
      });

      expect(loginResult.user).toBeDefined();
      expect(loginResult.token).toBeDefined();

      // Use token to get current user
      const currentUser = await getCurrentUser(loginResult.token);

      expect(currentUser).not.toBeNull();
      expect(currentUser!.id).toEqual(userResult[0].id);
      expect(currentUser!.username).toEqual(testUserData.username);
    });

    it('should handle password verification flow', async () => {
      const password = 'mySecurePassword123';
      
      // Hash password
      const hash = await _internal.hashPassword(password);
      
      // Create user with hashed password
      const userResult = await db.insert(usersTable)
        .values({
          username: 'secureuser',
          password: hash,
          role: 'AGEN'
        })
        .returning()
        .execute();

      // Login should work with original password
      const loginResult = await login({
        username: 'secureuser',
        password: password
      });

      expect(loginResult.user.id).toEqual(userResult[0].id);

      // Login should fail with wrong password
      await expect(login({
        username: 'secureuser',
        password: 'wrongpassword'
      })).rejects.toThrow(/username atau password salah/i);
    });

    it('should handle edge cases in authentication flow', async () => {
      // Test empty username
      await expect(login({
        username: '',
        password: 'password'
      })).rejects.toThrow(/username atau password salah/i);

      // Test empty password
      await expect(login({
        username: 'testuser',
        password: ''
      })).rejects.toThrow(/username atau password salah/i);

      // Test null/undefined token
      const nullResult = await getCurrentUser('');
      expect(nullResult).toBeNull();

      // Test malformed token parts
      const malformedResult = await getCurrentUser('a.b');
      expect(malformedResult).toBeNull();
    });
  });
});