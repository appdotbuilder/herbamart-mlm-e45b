import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { db } from '../db';
import { usersTable, agenTable, jaringanTable } from '../db/schema';
import { type CreateAgen } from '../schema';
import { createAgen } from '../handlers/agen';
import { eq } from 'drizzle-orm';

// Simplified DB setup that only creates tables we need
const createMinimalDB = async () => {
  try {
    // Create the specific tables we need for agent testing
    await db.execute(`DROP SCHEMA IF EXISTS public CASCADE;`);
    await db.execute(`CREATE SCHEMA public;`);
    
    // Create enums
    await db.execute(`CREATE TYPE role AS ENUM ('PELANGGAN', 'AGEN', 'ADMIN');`);
    await db.execute(`CREATE TYPE jenis_kelamin AS ENUM ('PRIA', 'WANITA');`);
    await db.execute(`CREATE TYPE status_agen AS ENUM ('SILVER', 'GOLD', 'PLATINUM');`);
    await db.execute(`CREATE TYPE peringkat_agen AS ENUM ('AGEN', 'MANAGER', 'EXECUTIVE_MANAGER', 'DIRECTOR', 'EXECUTIVE_DIRECTOR', 'SENIOR_EXECUTIVE_DIRECTOR');`);
    await db.execute(`CREATE TYPE tipe_agen AS ENUM ('AGEN', 'STOKIS', 'DISTRIBUTOR');`);
    
    // Create users table
    await db.execute(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role role NOT NULL DEFAULT 'PELANGGAN',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    // Create agen table
    await db.execute(`
      CREATE TABLE agen (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        id_agen VARCHAR(20) UNIQUE NOT NULL,
        nama_lengkap TEXT NOT NULL,
        nomor_ktp VARCHAR(16) NOT NULL,
        jenis_kelamin jenis_kelamin NOT NULL,
        nomor_hp VARCHAR(20) NOT NULL,
        email VARCHAR(100) NOT NULL,
        alamat_lengkap TEXT NOT NULL,
        kelurahan TEXT NOT NULL,
        kecamatan TEXT NOT NULL,
        kota_kabupaten TEXT NOT NULL,
        provinsi TEXT NOT NULL,
        nomor_rekening VARCHAR(50) NOT NULL,
        nama_rekening TEXT NOT NULL,
        sponsor_id INTEGER,
        status_paket status_agen NOT NULL DEFAULT 'SILVER',
        peringkat peringkat_agen NOT NULL DEFAULT 'AGEN',
        tipe_agen tipe_agen NOT NULL DEFAULT 'AGEN',
        stok_produk INTEGER NOT NULL DEFAULT 0,
        total_komisi NUMERIC(15,2) NOT NULL DEFAULT '0',
        saldo_komisi NUMERIC(15,2) NOT NULL DEFAULT '0',
        link_referral TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    // Create jaringan table
    await db.execute(`
      CREATE TABLE jaringan (
        id SERIAL PRIMARY KEY,
        agen_id INTEGER NOT NULL REFERENCES agen(id) ON DELETE CASCADE,
        sponsor_id INTEGER NOT NULL REFERENCES agen(id) ON DELETE CASCADE,
        level INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(agen_id, sponsor_id, level)
      );
    `);
    
  } catch (error) {
    console.error('Minimal DB creation failed:', error);
    throw error;
  }
};

const resetMinimalDB = async () => {
  try {
    await db.execute(`DROP SCHEMA IF EXISTS public CASCADE;`);
    await db.execute(`CREATE SCHEMA public;`);
  } catch (error) {
    console.error('Reset failed:', error);
  }
};

// Test input for creating agent
const testCreateAgen: CreateAgen = {
  user_id: 1,
  nama_lengkap: 'John Doe Agent',
  nomor_ktp: '1234567890123456',
  jenis_kelamin: 'PRIA',
  nomor_hp: '081234567890',
  email: 'john.agent@test.com',
  alamat_lengkap: 'Jl. Agen Utama No. 123',
  kelurahan: 'Sukamaju',
  kecamatan: 'Bandung Utara',
  kota_kabupaten: 'Bandung',
  provinsi: 'Jawa Barat',
  nomor_rekening: '1234567890123',
  nama_rekening: 'John Doe',
  sponsor_id: null,
  status_paket: 'SILVER',
  password: 'password123'
};

describe('createAgen', () => {
  beforeEach(createMinimalDB);
  afterEach(resetMinimalDB);

  it('should create an agent successfully without sponsor', async () => {
    // Create prerequisite user with AGEN role
    const userResult = await db.execute(`
      INSERT INTO users (username, password, role) 
      VALUES ('johnagent', 'hashedpassword', 'AGEN')
      RETURNING *;
    `);

    const testInput = { ...testCreateAgen, user_id: 1 };

    const result = await createAgen(testInput);

    // Verify returned data structure
    expect(result.agen).toBeDefined();
    expect(result.idAgen).toBeDefined();
    expect(typeof result.idAgen).toBe('string');

    // Verify agent fields
    expect(result.agen.nama_lengkap).toEqual('John Doe Agent');
    expect(result.agen.nomor_ktp).toEqual('1234567890123456');
    expect(result.agen.jenis_kelamin).toEqual('PRIA');
    expect(result.agen.email).toEqual('john.agent@test.com');
    expect(result.agen.provinsi).toEqual('Jawa Barat');
    expect(result.agen.status_paket).toEqual('SILVER');
    expect(result.agen.sponsor_id).toBeNull();

    // Verify generated fields
    expect(result.agen.id).toBeDefined();
    expect(result.agen.peringkat).toEqual('AGEN');
    expect(result.agen.tipe_agen).toEqual('AGEN');
    expect(result.agen.stok_produk).toEqual(0);
    expect(result.agen.total_komisi).toEqual(0);
    expect(result.agen.saldo_komisi).toEqual(0);
    expect(result.agen.created_at).toBeInstanceOf(Date);
    expect(result.agen.updated_at).toBeInstanceOf(Date);

    // Verify ID format: JB-{year}{sequence}
    expect(result.idAgen).toMatch(/^JB-\d{6}$/);
    expect(result.agen.id_agen).toEqual(result.idAgen);

    // Verify referral link
    expect(result.agen.link_referral).toEqual(`https://herbamart.id/ref/${result.idAgen}`);
  });

  it('should create agent with sponsor and network structure', async () => {
    // Create sponsor user and agent first
    await db.execute(`
      INSERT INTO users (username, password, role) 
      VALUES ('sponsor', 'hashedpassword', 'AGEN');
    `);

    // Get the sponsor user ID
    const sponsorUserResult = await db.execute(`
      SELECT id FROM users WHERE username = 'sponsor';
    `);
    const sponsorUserId = (sponsorUserResult as any).rows[0].id;

    await db.execute(`
      INSERT INTO agen (
        user_id, id_agen, nama_lengkap, nomor_ktp, jenis_kelamin, 
        nomor_hp, email, alamat_lengkap, kelurahan, kecamatan, 
        kota_kabupaten, provinsi, nomor_rekening, nama_rekening, 
        sponsor_id, status_paket, link_referral
      ) VALUES (
        ${sponsorUserId}, 'JB-250001', 'Sponsor Agent', '1234567890123457', 'WANITA',
        '081234567891', 'sponsor@test.com', 'Jl. Sponsor', 'Sponsor', 'Sponsor',
        'Bandung', 'Jawa Barat', '1234567890124', 'Sponsor Agent',
        NULL, 'GOLD', 'https://herbamart.id/ref/JB-250001'
      );
    `);

    // Get the sponsor agent ID
    const sponsorAgentResult = await db.execute(`
      SELECT id FROM agen WHERE id_agen = 'JB-250001';
    `);
    const sponsorAgentId = (sponsorAgentResult as any).rows[0].id;

    // Create new agent user
    await db.execute(`
      INSERT INTO users (username, password, role) 
      VALUES ('newagent', 'hashedpassword', 'AGEN');
    `);

    // Get the new user ID
    const newUserResult = await db.execute(`
      SELECT id FROM users WHERE username = 'newagent';
    `);
    const newUserId = (newUserResult as any).rows[0].id;

    const testInput = {
      ...testCreateAgen,
      user_id: newUserId,
      sponsor_id: sponsorAgentId
    };

    const result = await createAgen(testInput);

    // Verify agent creation
    expect(result.agen.sponsor_id).toEqual(sponsorAgentId);

    // Verify network creation
    const networkEntries = await db.select()
      .from(jaringanTable)
      .where(eq(jaringanTable.agen_id, result.agen.id))
      .execute();

    expect(networkEntries).toHaveLength(1);
    expect(networkEntries[0].sponsor_id).toEqual(sponsorAgentId);
    expect(networkEntries[0].level).toEqual(1);
  });

  it('should generate unique agent IDs for same province', async () => {
    // Create multiple users
    await db.execute(`
      INSERT INTO users (username, password, role) 
      VALUES 
        ('agent1', 'hashedpassword', 'AGEN'),
        ('agent2', 'hashedpassword', 'AGEN'),
        ('agent3', 'hashedpassword', 'AGEN');
    `);

    // Get user IDs
    const userIds = [];
    for (let i = 1; i <= 3; i++) {
      const userResult = await db.execute(`
        SELECT id FROM users WHERE username = 'agent${i}';
      `);
      userIds.push((userResult as any).rows[0].id);
    }

    const agents = [];
    for (let i = 0; i < 3; i++) {
      const testInput = {
        ...testCreateAgen,
        user_id: userIds[i],
        nama_lengkap: `Agent ${i + 1}`
      };
      const result = await createAgen(testInput);
      agents.push(result);
    }

    // Verify all IDs are unique
    const idSet = new Set(agents.map(a => a.idAgen));
    expect(idSet.size).toEqual(3);

    // Verify they all follow the pattern for Jawa Barat
    agents.forEach(agent => {
      expect(agent.idAgen).toMatch(/^JB-\d{6}$/);
    });
  });

  it('should generate correct province codes', async () => {
    const provinces = [
      { name: 'Jakarta', code: 'JK' },
      { name: 'Jawa Tengah', code: 'JT' },
      { name: 'Bali', code: 'BA' },
      { name: 'Sumatera Utara', code: 'SU' }
    ];

    for (let i = 0; i < provinces.length; i++) {
      const province = provinces[i];
      await db.execute(`
        INSERT INTO users (username, password, role) 
        VALUES ('agent_${province.code.toLowerCase()}', 'hashedpassword', 'AGEN');
      `);

      // Get user ID
      const userResult = await db.execute(`
        SELECT id FROM users WHERE username = 'agent_${province.code.toLowerCase()}';
      `);
      const userId = (userResult as any).rows[0].id;

      const testInput = {
        ...testCreateAgen,
        user_id: userId,
        provinsi: province.name,
        nama_lengkap: `Agent ${province.name}`
      };

      const result = await createAgen(testInput);
      expect(result.idAgen).toMatch(new RegExp(`^${province.code}-\\d{6}$`));
    }
  });

  it('should handle numeric field conversion correctly', async () => {
    await db.execute(`
      INSERT INTO users (username, password, role) 
      VALUES ('numerictest', 'hashedpassword', 'AGEN');
    `);

    // Get user ID
    const userResult = await db.execute(`
      SELECT id FROM users WHERE username = 'numerictest';
    `);
    const userId = (userResult as any).rows[0].id;

    const testInput = { ...testCreateAgen, user_id: userId };
    const result = await createAgen(testInput);

    // Verify numeric fields are converted to numbers
    expect(typeof result.agen.total_komisi).toBe('number');
    expect(typeof result.agen.saldo_komisi).toBe('number');
    expect(result.agen.total_komisi).toEqual(0);
    expect(result.agen.saldo_komisi).toEqual(0);
  });

  it('should reject invalid user (non-AGEN role)', async () => {
    await db.execute(`
      INSERT INTO users (username, password, role) 
      VALUES ('pelanggan', 'hashedpassword', 'PELANGGAN');
    `);

    // Get user ID
    const userResult = await db.execute(`
      SELECT id FROM users WHERE username = 'pelanggan';
    `);
    const userId = (userResult as any).rows[0].id;

    const testInput = { ...testCreateAgen, user_id: userId };

    await expect(createAgen(testInput)).rejects.toThrow(/User not found or not an agent/i);
  });

  it('should reject non-existent user', async () => {
    const testInput = { ...testCreateAgen, user_id: 999 };

    await expect(createAgen(testInput)).rejects.toThrow(/User not found or not an agent/i);
  });

  it('should reject non-existent sponsor', async () => {
    await db.execute(`
      INSERT INTO users (username, password, role) 
      VALUES ('testagent', 'hashedpassword', 'AGEN');
    `);

    // Get user ID
    const userResult = await db.execute(`
      SELECT id FROM users WHERE username = 'testagent';
    `);
    const userId = (userResult as any).rows[0].id;

    const testInput = {
      ...testCreateAgen,
      user_id: userId,
      sponsor_id: 999
    };

    await expect(createAgen(testInput)).rejects.toThrow(/Sponsor not found/i);
  });
});