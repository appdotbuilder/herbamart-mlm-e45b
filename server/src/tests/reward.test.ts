import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  agenTable, 
  rewardTable
} from '../db/schema';
import { sql } from 'drizzle-orm';
import {
  checkRewardEligibility,
  getPerolehanRewardByAgenId,
  processRewardClaim,
  getAllPerolehanReward,
  updateRewardStatus,
  getLaporanReward
} from '../handlers/reward';

describe('Reward Handlers', () => {
  beforeEach(async () => {
    // Reset database first
    await resetDB();
    
    // Create minimal schema manually without problematic enums
    await db.execute(sql`
      CREATE TYPE role AS ENUM ('PELANGGAN', 'AGEN', 'ADMIN');
      CREATE TYPE jenis_kelamin AS ENUM ('PRIA', 'WANITA');
      CREATE TYPE status_agen AS ENUM ('SILVER', 'GOLD', 'PLATINUM');
      CREATE TYPE peringkat_agen AS ENUM ('AGEN', 'MANAGER', 'EXECUTIVE_MANAGER', 'DIRECTOR', 'EXECUTIVE_DIRECTOR', 'SENIOR_EXECUTIVE_DIRECTOR');
      CREATE TYPE tipe_agen AS ENUM ('AGEN', 'STOKIS', 'DISTRIBUTOR');
    `);
    
    await db.execute(sql`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role role NOT NULL DEFAULT 'PELANGGAN',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    
    await db.execute(sql`
      CREATE TABLE agen (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        id_agen VARCHAR(20) NOT NULL UNIQUE,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    
    await db.execute(sql`
      CREATE TABLE reward (
        id SERIAL PRIMARY KEY,
        nama_reward TEXT NOT NULL,
        peringkat_required peringkat_agen NOT NULL,
        deskripsi TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    
    await db.execute(sql`
      CREATE TABLE perolehan_reward (
        id SERIAL PRIMARY KEY,
        agen_id INTEGER NOT NULL REFERENCES agen(id) ON DELETE CASCADE,
        reward_id INTEGER NOT NULL REFERENCES reward(id) ON DELETE CASCADE,
        tanggal_perolehan TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT valid_status CHECK (status IN ('DITERIMA', 'PENDING', 'DITOLAK'))
      );
    `);
  });
  
  afterEach(resetDB);

  // Test data setup helpers
  const createTestUser = async () => {
    const result = await db.execute(sql`
      INSERT INTO users (username, password, role) 
      VALUES ('testuser', 'password123', 'AGEN') 
      RETURNING *
    `);
    return result.rows?.[0] as any;
  };

  const createTestAgen = async (userId: number, peringkat = 'MANAGER', idSuffix = '001') => {
    const agenId = `JB-25${idSuffix}`;
    const result = await db.execute(sql`
      INSERT INTO agen (
        user_id, id_agen, nama_lengkap, nomor_ktp, jenis_kelamin, nomor_hp, 
        email, alamat_lengkap, kelurahan, kecamatan, kota_kabupaten, provinsi,
        nomor_rekening, nama_rekening, status_paket, peringkat, tipe_agen,
        stok_produk, total_komisi, saldo_komisi, link_referral
      ) VALUES (
        ${userId}, ${agenId}, 'Test Manager', '1234567890123456', 'PRIA', '08123456789',
        'manager@test.com', 'Jl. Manager', 'Test', 'Test', 'Bandung', 'Jawa Barat',
        '1234567890', 'Test Manager', 'GOLD', ${peringkat}, 'AGEN',
        6, '500000.00', '150000.00', ${'https://herbamart.id/ref/' + agenId}
      ) RETURNING *
    `);
    return result.rows?.[0] as any;
  };

  const createTestReward = async (peringkat = 'MANAGER', nama = 'Wisata Bali') => {
    const result = await db.execute(sql`
      INSERT INTO reward (nama_reward, peringkat_required, deskripsi, is_active) 
      VALUES (${nama}, ${peringkat}, ${'Paket ' + nama + ' untuk ' + peringkat}, true) 
      RETURNING *
    `);
    return result.rows?.[0] as any;
  };

  describe('checkRewardEligibility', () => {
    it('should return eligible rewards for agent rank', async () => {
      const user = await createTestUser();
      const agen = await createTestAgen(user.id, 'MANAGER');
      
      // Create rewards for different ranks
      await createTestReward('AGEN', 'Basic Reward');
      await createTestReward('MANAGER', 'Manager Reward');
      await createTestReward('DIRECTOR', 'Director Reward');

      const result = await checkRewardEligibility(agen.id);

      expect(result.eligible).toBe(true);
      expect(result.rewards).toHaveLength(2); // AGEN and MANAGER rewards
      expect(result.rewards.some(r => r.nama_reward === 'Basic Reward')).toBe(true);
      expect(result.rewards.some(r => r.nama_reward === 'Manager Reward')).toBe(true);
      expect(result.rewards.some(r => r.nama_reward === 'Director Reward')).toBe(false);
    });

    it('should exclude already claimed rewards', async () => {
      const user = await createTestUser();
      const agen = await createTestAgen(user.id, 'MANAGER');
      const reward = await createTestReward('MANAGER', 'Manager Reward');

      // Create existing claim manually
      await db.execute(sql`
        INSERT INTO perolehan_reward (agen_id, reward_id, status) 
        VALUES (${agen.id}, ${reward.id}, 'DITERIMA')
      `);

      const result = await checkRewardEligibility(agen.id);

      expect(result.eligible).toBe(false);
      expect(result.rewards).toHaveLength(0);
    });

    it('should throw error for non-existent agent', async () => {
      await expect(checkRewardEligibility(999)).rejects.toThrow('Agent not found');
    });
  });

  describe('processRewardClaim', () => {
    it('should successfully claim eligible reward', async () => {
      const user = await createTestUser();
      const agen = await createTestAgen(user.id, 'MANAGER');
      const reward = await createTestReward('MANAGER');

      const result = await processRewardClaim(agen.id, reward.id);

      expect(result.success).toBe(true);
      expect(result.message).toContain('berhasil diklaim');

      // Verify claim was created
      const claims = await db.execute(sql`
        SELECT * FROM perolehan_reward WHERE agen_id = ${agen.id}
      `);

      expect(claims.rowCount || 0).toBeGreaterThan(0);
    });

    it('should reject claim for non-existent agent', async () => {
      const reward = await createTestReward();

      const result = await processRewardClaim(999, reward.id);

      expect(result.success).toBe(false);
      expect(result.message).toContain('tidak ditemukan');
    });
  });

  describe('getPerolehanRewardByAgenId', () => {
    it('should return agent reward achievements', async () => {
      const user = await createTestUser();
      const agen = await createTestAgen(user.id);
      const reward = await createTestReward();

      await db.execute(sql`
        INSERT INTO perolehan_reward (agen_id, reward_id, status) 
        VALUES (${agen.id}, ${reward.id}, 'DITERIMA')
      `);

      const result = await getPerolehanRewardByAgenId(agen.id);

      expect(result).toHaveLength(1);
      expect(result[0].agen_id).toBe(agen.id);
      expect(result[0].reward_id).toBe(reward.id);
      expect(result[0].status).toBe('DITERIMA');
    });
  });

  describe('getAllPerolehanReward', () => {
    it('should return all reward achievements with agent and reward details', async () => {
      const user = await createTestUser();
      const agen = await createTestAgen(user.id);
      const reward = await createTestReward();

      await db.execute(sql`
        INSERT INTO perolehan_reward (agen_id, reward_id, status) 
        VALUES (${agen.id}, ${reward.id}, 'DITERIMA')
      `);

      const result = await getAllPerolehanReward();

      expect(result).toHaveLength(1);
      expect(result[0].agen.nama_lengkap).toBe('Test Manager');
      expect(result[0].agen.id_agen).toBe('JB-25001');
      expect(result[0].reward.nama_reward).toBe('Wisata Bali');
      expect(result[0].status).toBe('DITERIMA');
    });
  });

  describe('updateRewardStatus', () => {
    it('should successfully update reward status', async () => {
      const user = await createTestUser();
      const agen = await createTestAgen(user.id);
      const reward = await createTestReward();

      const insertResult = await db.execute(sql`
        INSERT INTO perolehan_reward (agen_id, reward_id, status) 
        VALUES (${agen.id}, ${reward.id}, 'PENDING')
        RETURNING id
      `);
      
      const perolehanId = (insertResult.rows?.[0] as any)?.id;

      const result = await updateRewardStatus(perolehanId, 'DITERIMA');

      expect(result.status).toBe('DITERIMA');
      expect(result.id).toBe(perolehanId);
    });
  });

  describe('getLaporanReward', () => {
    it('should categorize rewards correctly', async () => {
      const user1 = await createTestUser();
      const agen1 = await createTestAgen(user1.id);

      // Create second user
      const user2 = await db.execute(sql`
        INSERT INTO users (username, password, role) 
        VALUES ('testuser2', 'password123', 'AGEN') 
        RETURNING *
      `);

      const agen2 = await createTestAgen((user2.rows?.[0] as any)?.id, 'MANAGER', '002');

      // Create different reward types
      const baliReward = await createTestReward('MANAGER', 'Wisata Bali');
      const duaNegaraReward = await createTestReward('MANAGER', 'Wisata Dua Negara');

      // Create accepted claims
      await db.execute(sql`
        INSERT INTO perolehan_reward (agen_id, reward_id, status) 
        VALUES (${agen1.id}, ${baliReward.id}, 'DITERIMA'), 
               (${agen2.id}, ${duaNegaraReward.id}, 'DITERIMA')
      `);

      const result = await getLaporanReward();

      expect(result.wisataBali.count).toBe(1);
      expect(result.wisataBali.agen).toHaveLength(1);
      expect(result.wisataBali.agen[0].nama_lengkap).toBe('Test Manager');
      expect(typeof result.wisataBali.agen[0].total_komisi).toBe('number');
      expect(result.wisataBali.agen[0].total_komisi).toBe(500000);

      expect(result.wisataDuaNegara.count).toBe(1);
      expect(result.wisataDuaNegara.agen).toHaveLength(1);
    });
  });
});