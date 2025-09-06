import { db } from '../db';
import { pelangganTable, usersTable, agenTable, jaringanTable } from '../db/schema';
import { type CreatePelanggan, type Pelanggan, type CreateAgen } from '../schema';
import { eq, sql } from 'drizzle-orm';

// Note: In real implementation, use bcrypt for password hashing
// import bcrypt from 'bcrypt';
// For now, we'll use a simple hash simulation
const hashPassword = async (password: string): Promise<string> => {
  return `hashed_${password}`;
};

export async function createPelanggan(input: CreatePelanggan): Promise<Pelanggan> {
  try {
    // Verify that the user exists and has PELANGGAN role
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (!user.length || user[0].role !== 'PELANGGAN') {
      throw new Error('User tidak ditemukan atau bukan pelanggan');
    }

    // Create pelanggan record
    const result = await db.insert(pelangganTable)
      .values({
        user_id: input.user_id,
        nama_lengkap: input.nama_lengkap,
        jenis_kelamin: input.jenis_kelamin,
        nomor_hp: input.nomor_hp,
        email: input.email,
        alamat_lengkap: input.alamat_lengkap,
        kelurahan: input.kelurahan,
        kecamatan: input.kecamatan,
        kota_kabupaten: input.kota_kabupaten,
        provinsi: input.provinsi
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Pelanggan creation failed:', error);
    throw error;
  }
}

export async function getPelangganByUserId(userId: number): Promise<Pelanggan | null> {
  try {
    const result = await db.select()
      .from(pelangganTable)
      .where(eq(pelangganTable.user_id, userId))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Get pelanggan by user ID failed:', error);
    throw error;
  }
}

export async function updatePelanggan(id: number, input: Partial<CreatePelanggan>): Promise<Pelanggan> {
  try {
    // Check if pelanggan exists
    const existing = await db.select()
      .from(pelangganTable)
      .where(eq(pelangganTable.id, id))
      .execute();

    if (!existing.length) {
      throw new Error('Pelanggan tidak ditemukan');
    }

    // Update pelanggan record
    const result = await db.update(pelangganTable)
      .set({
        ...input,
        updated_at: sql`now()`
      })
      .where(eq(pelangganTable.id, id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Pelanggan update failed:', error);
    throw error;
  }
}

export async function registerAgenFromPelanggan(pelangganId: number, input: CreateAgen): Promise<{ success: boolean; agenId: string }> {
  // This is a placeholder - agen registration functionality is not implemented due to schema constraints
  // In a real implementation, this would:
  // 1. Validate pelanggan exists
  // 2. Create new user account for agen
  // 3. Create agen record with generated ID
  // 4. Set up network structure with sponsor if provided
  // 5. Return success with generated agen ID
  
  throw new Error('Agent registration functionality not implemented in test environment');
}