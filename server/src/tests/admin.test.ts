import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB } from '../helpers';
import { db } from '../db';
import { usersTable, agenTable, transaksiTable, komisiTable } from '../db/schema';
import { getAdminDashboardStats } from '../handlers/admin';
import { sql } from 'drizzle-orm';

const createMinimalDB = async () => {
  // Create only the tables we need for the test
  await db.execute(sql`
    CREATE TYPE role AS ENUM ('PELANGGAN', 'AGEN', 'ADMIN');
    CREATE TYPE jenis_kelamin AS ENUM ('PRIA', 'WANITA');
    CREATE TYPE status_agen AS ENUM ('SILVER', 'GOLD', 'PLATINUM');
    CREATE TYPE peringkat_agen AS ENUM ('AGEN', 'MANAGER', 'EXECUTIVE_MANAGER', 'DIRECTOR', 'EXECUTIVE_DIRECTOR', 'SENIOR_EXECUTIVE_DIRECTOR');
    CREATE TYPE tipe_agen AS ENUM ('AGEN', 'STOKIS', 'DISTRIBUTOR');
    CREATE TYPE status_transaksi AS ENUM ('DIPROSES', 'DIKEMAS', 'DIKIRIM', 'TIBA_DI_KOTA', 'DITERIMA', 'SELESAI');
    CREATE TYPE tipe_transaksi AS ENUM ('PAKET', 'UPGRADE', 'REPEAT_ORDER', 'STOK_ORDER', 'PELANGGAN');
    CREATE TYPE jenis_komisi AS ENUM ('SPONSOR', 'REPEAT_ORDER', 'UPGRADE');
    CREATE TYPE status_komisi AS ENUM ('PENDING', 'DIBAYAR');
  `);

  await db.execute(sql`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role role NOT NULL DEFAULT 'PELANGGAN',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);

  await db.execute(sql`
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

  await db.execute(sql`
    CREATE TABLE transaksi (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      agen_id INTEGER REFERENCES agen(id),
      tipe_transaksi tipe_transaksi NOT NULL,
      total_harga NUMERIC(15,2) NOT NULL,
      total_box INTEGER NOT NULL,
      status status_transaksi NOT NULL DEFAULT 'DIPROSES',
      payment_method TEXT,
      payment_reference TEXT,
      catatan TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE komisi (
      id SERIAL PRIMARY KEY,
      agen_id INTEGER NOT NULL REFERENCES agen(id) ON DELETE CASCADE,
      transaksi_id INTEGER NOT NULL REFERENCES transaksi(id) ON DELETE CASCADE,
      jenis_komisi jenis_komisi NOT NULL,
      level INTEGER NOT NULL,
      nominal NUMERIC(15,2) NOT NULL,
      status status_komisi NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
};

describe('getAdminDashboardStats', () => {
  beforeEach(createMinimalDB);
  afterEach(resetDB);

  it('should return zero stats when no data exists', async () => {
    const result = await getAdminDashboardStats();

    expect(result.total_agen).toBe(0);
    expect(result.agen_silver).toBe(0);
    expect(result.agen_gold).toBe(0);
    expect(result.agen_platinum).toBe(0);
    expect(result.total_stokis).toBe(0);
    expect(result.total_distributor).toBe(0);
    expect(result.total_omset).toBe(0);
    expect(result.total_komisi).toBe(0);
    expect(result.saldo_komisi_pending).toBe(0);
    expect(result.omset_hari_ini).toBe(0);
    expect(result.omset_bulan_ini).toBe(0);
    expect(result.komisi_hari_ini).toBe(0);
    expect(result.komisi_bulan_ini).toBe(0);
  });

  it('should calculate agent statistics correctly', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        { username: 'agen1', password: 'test123', role: 'AGEN' },
        { username: 'agen2', password: 'test123', role: 'AGEN' },
        { username: 'agen3', password: 'test123', role: 'AGEN' },
        { username: 'agen4', password: 'test123', role: 'AGEN' },
        { username: 'agen5', password: 'test123', role: 'AGEN' }
      ])
      .returning()
      .execute();

    // Create test agents with different package levels and types
    await db.insert(agenTable)
      .values([
        {
          user_id: users[0].id,
          id_agen: 'AG001',
          nama_lengkap: 'Agen Silver 1',
          nomor_ktp: '1234567890123456',
          jenis_kelamin: 'PRIA',
          nomor_hp: '08111111111',
          email: 'agen1@test.com',
          alamat_lengkap: 'Alamat 1',
          kelurahan: 'Kelurahan 1',
          kecamatan: 'Kecamatan 1',
          kota_kabupaten: 'Kota 1',
          provinsi: 'Provinsi 1',
          nomor_rekening: '1111111111',
          nama_rekening: 'Agen Silver 1',
          status_paket: 'SILVER',
          tipe_agen: 'AGEN',
          link_referral: 'https://test.com/ref/AG001',
          total_komisi: '100000',
          saldo_komisi: '50000'
        },
        {
          user_id: users[1].id,
          id_agen: 'AG002',
          nama_lengkap: 'Agen Gold 1',
          nomor_ktp: '1234567890123457',
          jenis_kelamin: 'WANITA',
          nomor_hp: '08222222222',
          email: 'agen2@test.com',
          alamat_lengkap: 'Alamat 2',
          kelurahan: 'Kelurahan 2',
          kecamatan: 'Kecamatan 2',
          kota_kabupaten: 'Kota 2',
          provinsi: 'Provinsi 2',
          nomor_rekening: '2222222222',
          nama_rekening: 'Agen Gold 1',
          status_paket: 'GOLD',
          tipe_agen: 'STOKIS',
          link_referral: 'https://test.com/ref/AG002',
          total_komisi: '200000',
          saldo_komisi: '100000'
        },
        {
          user_id: users[2].id,
          id_agen: 'AG003',
          nama_lengkap: 'Agen Platinum 1',
          nomor_ktp: '1234567890123458',
          jenis_kelamin: 'PRIA',
          nomor_hp: '08333333333',
          email: 'agen3@test.com',
          alamat_lengkap: 'Alamat 3',
          kelurahan: 'Kelurahan 3',
          kecamatan: 'Kecamatan 3',
          kota_kabupaten: 'Kota 3',
          provinsi: 'Provinsi 3',
          nomor_rekening: '3333333333',
          nama_rekening: 'Agen Platinum 1',
          status_paket: 'PLATINUM',
          tipe_agen: 'DISTRIBUTOR',
          link_referral: 'https://test.com/ref/AG003',
          total_komisi: '500000',
          saldo_komisi: '250000'
        },
        {
          user_id: users[3].id,
          id_agen: 'AG004',
          nama_lengkap: 'Agen Silver 2',
          nomor_ktp: '1234567890123459',
          jenis_kelamin: 'WANITA',
          nomor_hp: '08444444444',
          email: 'agen4@test.com',
          alamat_lengkap: 'Alamat 4',
          kelurahan: 'Kelurahan 4',
          kecamatan: 'Kecamatan 4',
          kota_kabupaten: 'Kota 4',
          provinsi: 'Provinsi 4',
          nomor_rekening: '4444444444',
          nama_rekening: 'Agen Silver 2',
          status_paket: 'SILVER',
          tipe_agen: 'AGEN',
          link_referral: 'https://test.com/ref/AG004',
          total_komisi: '150000',
          saldo_komisi: '75000'
        },
        {
          user_id: users[4].id,
          id_agen: 'AG005',
          nama_lengkap: 'Agen Gold 2',
          nomor_ktp: '1234567890123460',
          jenis_kelamin: 'PRIA',
          nomor_hp: '08555555555',
          email: 'agen5@test.com',
          alamat_lengkap: 'Alamat 5',
          kelurahan: 'Kelurahan 5',
          kecamatan: 'Kecamatan 5',
          kota_kabupaten: 'Kota 5',
          provinsi: 'Provinsi 5',
          nomor_rekening: '5555555555',
          nama_rekening: 'Agen Gold 2',
          status_paket: 'GOLD',
          tipe_agen: 'STOKIS',
          link_referral: 'https://test.com/ref/AG005',
          total_komisi: '300000',
          saldo_komisi: '150000'
        }
      ])
      .execute();

    const result = await getAdminDashboardStats();

    expect(result.total_agen).toBe(5);
    expect(result.agen_silver).toBe(2);
    expect(result.agen_gold).toBe(2);
    expect(result.agen_platinum).toBe(1);
    expect(result.total_stokis).toBe(2);
    expect(result.total_distributor).toBe(1);
  });

  it('should calculate transaction and commission statistics correctly', async () => {
    // Create test users and agents
    const users = await db.insert(usersTable)
      .values([
        { username: 'user1', password: 'test123', role: 'AGEN' },
        { username: 'user2', password: 'test123', role: 'AGEN' }
      ])
      .returning()
      .execute();

    const agents = await db.insert(agenTable)
      .values([
        {
          user_id: users[0].id,
          id_agen: 'AG001',
          nama_lengkap: 'Test Agen 1',
          nomor_ktp: '1234567890123456',
          jenis_kelamin: 'PRIA',
          nomor_hp: '08111111111',
          email: 'agen1@test.com',
          alamat_lengkap: 'Alamat 1',
          kelurahan: 'Kelurahan 1',
          kecamatan: 'Kecamatan 1',
          kota_kabupaten: 'Kota 1',
          provinsi: 'Provinsi 1',
          nomor_rekening: '1111111111',
          nama_rekening: 'Test Agen 1',
          status_paket: 'SILVER',
          tipe_agen: 'AGEN',
          link_referral: 'https://test.com/ref/AG001',
          total_komisi: '100000',
          saldo_komisi: '50000'
        },
        {
          user_id: users[1].id,
          id_agen: 'AG002',
          nama_lengkap: 'Test Agen 2',
          nomor_ktp: '1234567890123457',
          jenis_kelamin: 'WANITA',
          nomor_hp: '08222222222',
          email: 'agen2@test.com',
          alamat_lengkap: 'Alamat 2',
          kelurahan: 'Kelurahan 2',
          kecamatan: 'Kecamatan 2',
          kota_kabupaten: 'Kota 2',
          provinsi: 'Provinsi 2',
          nomor_rekening: '2222222222',
          nama_rekening: 'Test Agen 2',
          status_paket: 'GOLD',
          tipe_agen: 'AGEN',
          link_referral: 'https://test.com/ref/AG002',
          total_komisi: '200000',
          saldo_komisi: '100000'
        }
      ])
      .returning()
      .execute();

    // Create transactions with different dates and statuses
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const transactions = await db.insert(transaksiTable)
      .values([
        {
          user_id: users[0].id,
          agen_id: agents[0].id,
          tipe_transaksi: 'PAKET',
          total_harga: '1000000',
          total_box: 5,
          status: 'SELESAI',
          created_at: today
        },
        {
          user_id: users[1].id,
          agen_id: agents[1].id,
          tipe_transaksi: 'UPGRADE',
          total_harga: '500000',
          total_box: 3,
          status: 'SELESAI',
          created_at: yesterday
        },
        {
          user_id: users[0].id,
          agen_id: agents[0].id,
          tipe_transaksi: 'REPEAT_ORDER',
          total_harga: '800000',
          total_box: 4,
          status: 'SELESAI',
          created_at: lastMonth
        },
        {
          user_id: users[1].id,
          agen_id: agents[1].id,
          tipe_transaksi: 'PAKET',
          total_harga: '2000000',
          total_box: 10,
          status: 'DIPROSES',
          created_at: today
        }
      ])
      .returning()
      .execute();

    // Create commissions with different dates and statuses
    await db.insert(komisiTable)
      .values([
        {
          agen_id: agents[0].id,
          transaksi_id: transactions[0].id,
          jenis_komisi: 'SPONSOR',
          level: 1,
          nominal: '100000',
          status: 'DIBAYAR',
          created_at: today
        },
        {
          agen_id: agents[1].id,
          transaksi_id: transactions[1].id,
          jenis_komisi: 'UPGRADE',
          level: 1,
          nominal: '50000',
          status: 'PENDING',
          created_at: yesterday
        },
        {
          agen_id: agents[0].id,
          transaksi_id: transactions[2].id,
          jenis_komisi: 'REPEAT_ORDER',
          level: 2,
          nominal: '80000',
          status: 'DIBAYAR',
          created_at: lastMonth
        }
      ])
      .execute();

    const result = await getAdminDashboardStats();

    // Should only count SELESAI transactions
    expect(result.total_omset).toBe(2300000); // 1000000 + 500000 + 800000
    expect(result.omset_hari_ini).toBe(1000000); // Only today's completed transaction
    expect(result.omset_bulan_ini).toBe(1500000); // Today + yesterday transactions

    // Commission calculations
    expect(result.total_komisi).toBe(230000); // 100000 + 50000 + 80000
    expect(result.saldo_komisi_pending).toBe(50000); // Only pending commission
    expect(result.komisi_hari_ini).toBe(100000); // Only today's commission
    expect(result.komisi_bulan_ini).toBe(150000); // Today + yesterday commissions
  });

  it('should handle edge cases with date boundaries correctly', async () => {
    // Create user and agent
    const user = await db.insert(usersTable)
      .values({ username: 'test_user', password: 'test123', role: 'AGEN' })
      .returning()
      .execute();

    const agent = await db.insert(agenTable)
      .values({
        user_id: user[0].id,
        id_agen: 'AG001',
        nama_lengkap: 'Test Agen',
        nomor_ktp: '1234567890123456',
        jenis_kelamin: 'PRIA',
        nomor_hp: '08111111111',
        email: 'agen@test.com',
        alamat_lengkap: 'Test Address',
        kelurahan: 'Test Kelurahan',
        kecamatan: 'Test Kecamatan',
        kota_kabupaten: 'Test Kota',
        provinsi: 'Test Provinsi',
        nomor_rekening: '1111111111',
        nama_rekening: 'Test Agen',
        status_paket: 'SILVER',
        tipe_agen: 'AGEN',
        link_referral: 'https://test.com/ref/AG001',
        total_komisi: '100000',
        saldo_komisi: '50000'
      })
      .returning()
      .execute();

    // Create transaction at exact start of today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const transaction = await db.insert(transaksiTable)
      .values({
        user_id: user[0].id,
        agen_id: agent[0].id,
        tipe_transaksi: 'PAKET',
        total_harga: '750000',
        total_box: 5,
        status: 'SELESAI',
        created_at: startOfToday
      })
      .returning()
      .execute();

    // Create commission at exact start of today
    await db.insert(komisiTable)
      .values({
        agen_id: agent[0].id,
        transaksi_id: transaction[0].id,
        jenis_komisi: 'SPONSOR',
        level: 1,
        nominal: '75000',
        status: 'DIBAYAR',
        created_at: startOfToday
      })
      .execute();

    const result = await getAdminDashboardStats();

    expect(result.omset_hari_ini).toBe(750000);
    expect(result.omset_bulan_ini).toBe(750000);
    expect(result.komisi_hari_ini).toBe(75000);
    expect(result.komisi_bulan_ini).toBe(75000);
  });

  it('should handle numeric conversions correctly', async () => {
    // Create user and agent
    const user = await db.insert(usersTable)
      .values({ username: 'test_user', password: 'test123', role: 'AGEN' })
      .returning()
      .execute();

    const agent = await db.insert(agenTable)
      .values({
        user_id: user[0].id,
        id_agen: 'AG001',
        nama_lengkap: 'Test Agen',
        nomor_ktp: '1234567890123456',
        jenis_kelamin: 'PRIA',
        nomor_hp: '08111111111',
        email: 'agen@test.com',
        alamat_lengkap: 'Test Address',
        kelurahan: 'Test Kelurahan',
        kecamatan: 'Test Kecamatan',
        kota_kabupaten: 'Test Kota',
        provinsi: 'Test Provinsi',
        nomor_rekening: '1111111111',
        nama_rekening: 'Test Agen',
        status_paket: 'SILVER',
        tipe_agen: 'AGEN',
        link_referral: 'https://test.com/ref/AG001',
        total_komisi: '100000',
        saldo_komisi: '50000'
      })
      .returning()
      .execute();

    const transaction = await db.insert(transaksiTable)
      .values({
        user_id: user[0].id,
        agen_id: agent[0].id,
        tipe_transaksi: 'PAKET',
        total_harga: '1250000.50', // Test decimal values
        total_box: 5,
        status: 'SELESAI'
      })
      .returning()
      .execute();

    await db.insert(komisiTable)
      .values({
        agen_id: agent[0].id,
        transaksi_id: transaction[0].id,
        jenis_komisi: 'SPONSOR',
        level: 1,
        nominal: '125000.75', // Test decimal values
        status: 'PENDING'
      })
      .execute();

    const result = await getAdminDashboardStats();

    // Verify numeric types and precision
    expect(typeof result.total_omset).toBe('number');
    expect(typeof result.total_komisi).toBe('number');
    expect(typeof result.saldo_komisi_pending).toBe('number');
    expect(result.total_omset).toBe(1250000.5);
    expect(result.total_komisi).toBe(125000.75);
    expect(result.saldo_komisi_pending).toBe(125000.75);
  });

  it('should exclude non-completed transactions from omset calculations', async () => {
    // Create user and agent
    const user = await db.insert(usersTable)
      .values({ username: 'test_user', password: 'test123', role: 'AGEN' })
      .returning()
      .execute();

    const agent = await db.insert(agenTable)
      .values({
        user_id: user[0].id,
        id_agen: 'AG001',
        nama_lengkap: 'Test Agen',
        nomor_ktp: '1234567890123456',
        jenis_kelamin: 'PRIA',
        nomor_hp: '08111111111',
        email: 'agen@test.com',
        alamat_lengkap: 'Test Address',
        kelurahan: 'Test Kelurahan',
        kecamatan: 'Test Kecamatan',
        kota_kabupaten: 'Test Kota',
        provinsi: 'Test Provinsi',
        nomor_rekening: '1111111111',
        nama_rekening: 'Test Agen',
        status_paket: 'SILVER',
        tipe_agen: 'AGEN',
        link_referral: 'https://test.com/ref/AG001',
        total_komisi: '100000',
        saldo_komisi: '50000'
      })
      .returning()
      .execute();

    // Create transactions with various statuses
    await db.insert(transaksiTable)
      .values([
        {
          user_id: user[0].id,
          agen_id: agent[0].id,
          tipe_transaksi: 'PAKET',
          total_harga: '1000000',
          total_box: 5,
          status: 'SELESAI' // Should be included
        },
        {
          user_id: user[0].id,
          agen_id: agent[0].id,
          tipe_transaksi: 'PAKET',
          total_harga: '500000',
          total_box: 3,
          status: 'DIPROSES' // Should be excluded
        },
        {
          user_id: user[0].id,
          agen_id: agent[0].id,
          tipe_transaksi: 'PAKET',
          total_harga: '800000',
          total_box: 4,
          status: 'DIKIRIM' // Should be excluded
        }
      ])
      .execute();

    const result = await getAdminDashboardStats();

    // Only completed transactions should count toward omset
    expect(result.total_omset).toBe(1000000);
    expect(result.omset_hari_ini).toBe(1000000);
    expect(result.omset_bulan_ini).toBe(1000000);
  });
});