import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { usersTable, agenTable, transaksiTable, komisiTable } from '../db/schema';
import { getKomisiByAgenId } from '../handlers/komisi';

// Custom setup that only creates the tables we need
async function setupMinimalDB() {
    // Drop and recreate schema
    await db.execute(sql`drop schema if exists public cascade`);
    await db.execute(sql`create schema public`);
    
    // Create only the required enums
    await db.execute(sql`
        CREATE TYPE role AS ENUM ('PELANGGAN', 'AGEN', 'ADMIN');
        CREATE TYPE jenis_kelamin AS ENUM ('PRIA', 'WANITA');
        CREATE TYPE status_agen AS ENUM ('SILVER', 'GOLD', 'PLATINUM');
        CREATE TYPE peringkat_agen AS ENUM ('AGEN', 'MANAGER', 'EXECUTIVE_MANAGER', 'DIRECTOR', 'EXECUTIVE_DIRECTOR', 'SENIOR_EXECUTIVE_DIRECTOR');
        CREATE TYPE tipe_agen AS ENUM ('AGEN', 'STOKIS', 'DISTRIBUTOR');
        CREATE TYPE tipe_transaksi AS ENUM ('PAKET', 'UPGRADE', 'REPEAT_ORDER', 'STOK_ORDER', 'PELANGGAN');
        CREATE TYPE status_transaksi AS ENUM ('DIPROSES', 'DIKEMAS', 'DIKIRIM', 'TIBA_DI_KOTA', 'DITERIMA', 'SELESAI');
        CREATE TYPE jenis_komisi AS ENUM ('SPONSOR', 'REPEAT_ORDER', 'UPGRADE');
        CREATE TYPE status_komisi AS ENUM ('PENDING', 'DIBAYAR');
    `);
    
    // Create only the tables we need
    await db.execute(sql`
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role role NOT NULL DEFAULT 'PELANGGAN',
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
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
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
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
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
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
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    `);
}

async function cleanupDB() {
    await db.execute(sql`drop schema if exists public cascade`);
    await db.execute(sql`create schema public`);
}

describe('getKomisiByAgenId', () => {
    beforeEach(setupMinimalDB);
    afterEach(cleanupDB);

    it('should return empty array for agen with no commission records', async () => {
        // Create minimal test data
        const testUser = await db.insert(usersTable)
            .values({
                username: 'testagen1',
                password: 'password123',
                role: 'AGEN'
            })
            .returning()
            .execute();

        const testAgen = await db.insert(agenTable)
            .values({
                user_id: testUser[0].id,
                id_agen: 'AG001',
                nama_lengkap: 'Test Agen 1',
                nomor_ktp: '1234567890123456',
                jenis_kelamin: 'PRIA',
                nomor_hp: '081234567890',
                email: 'agen1@test.com',
                alamat_lengkap: 'Jl. Test No. 1',
                kelurahan: 'Test Kelurahan',
                kecamatan: 'Test Kecamatan',
                kota_kabupaten: 'Test Kota',
                provinsi: 'Test Provinsi',
                nomor_rekening: '1234567890',
                nama_rekening: 'Test Agen 1',
                sponsor_id: null,
                link_referral: 'https://test.com/ref/AG001'
            })
            .returning()
            .execute();

        const result = await getKomisiByAgenId(testAgen[0].id);

        expect(result).toEqual([]);
    });

    it('should fetch commission records for specific agen', async () => {
        // Create test user
        const testUser = await db.insert(usersTable)
            .values({
                username: 'testagen2',
                password: 'password123',
                role: 'AGEN'
            })
            .returning()
            .execute();

        // Create test agen
        const testAgen = await db.insert(agenTable)
            .values({
                user_id: testUser[0].id,
                id_agen: 'AG002',
                nama_lengkap: 'Test Agen 2',
                nomor_ktp: '1234567890123456',
                jenis_kelamin: 'PRIA',
                nomor_hp: '081234567890',
                email: 'agen2@test.com',
                alamat_lengkap: 'Jl. Test No. 2',
                kelurahan: 'Test Kelurahan',
                kecamatan: 'Test Kecamatan',
                kota_kabupaten: 'Test Kota',
                provinsi: 'Test Provinsi',
                nomor_rekening: '1234567890',
                nama_rekening: 'Test Agen 2',
                sponsor_id: null,
                link_referral: 'https://test.com/ref/AG002'
            })
            .returning()
            .execute();

        // Create test transaction
        const testTransaksi = await db.insert(transaksiTable)
            .values({
                user_id: testUser[0].id,
                agen_id: testAgen[0].id,
                tipe_transaksi: 'PAKET',
                total_harga: '300000',
                total_box: 3
            })
            .returning()
            .execute();

        // Create commission records
        await db.insert(komisiTable)
            .values([
                {
                    agen_id: testAgen[0].id,
                    transaksi_id: testTransaksi[0].id,
                    jenis_komisi: 'SPONSOR',
                    level: 1,
                    nominal: '120000',
                    status: 'PENDING'
                },
                {
                    agen_id: testAgen[0].id,
                    transaksi_id: testTransaksi[0].id,
                    jenis_komisi: 'REPEAT_ORDER',
                    level: 1,
                    nominal: '20000',
                    status: 'DIBAYAR'
                }
            ])
            .execute();

        const result = await getKomisiByAgenId(testAgen[0].id);

        expect(result).toHaveLength(2);
        
        // Verify all records belong to the correct agen
        result.forEach(komisi => {
            expect(komisi.agen_id).toBe(testAgen[0].id);
        });

        // Verify numeric conversion
        result.forEach(komisi => {
            expect(typeof komisi.nominal).toBe('number');
        });

        // Check specific commission data
        const sponsorKomisi = result.find(k => k.jenis_komisi === 'SPONSOR');
        const repeatOrderKomisi = result.find(k => k.jenis_komisi === 'REPEAT_ORDER');

        expect(sponsorKomisi).toBeDefined();
        expect(sponsorKomisi?.nominal).toBe(120000);
        expect(sponsorKomisi?.level).toBe(1);
        expect(sponsorKomisi?.status).toBe('PENDING');

        expect(repeatOrderKomisi).toBeDefined();
        expect(repeatOrderKomisi?.nominal).toBe(20000);
        expect(repeatOrderKomisi?.level).toBe(1);
        expect(repeatOrderKomisi?.status).toBe('DIBAYAR');
    });

    it('should return records ordered by created_at desc', async () => {
        // Create test user and agen
        const testUser = await db.insert(usersTable)
            .values({
                username: 'testagen3',
                password: 'password123',
                role: 'AGEN'
            })
            .returning()
            .execute();

        const testAgen = await db.insert(agenTable)
            .values({
                user_id: testUser[0].id,
                id_agen: 'AG003',
                nama_lengkap: 'Test Agen 3',
                nomor_ktp: '1234567890123456',
                jenis_kelamin: 'PRIA',
                nomor_hp: '081234567890',
                email: 'agen3@test.com',
                alamat_lengkap: 'Jl. Test No. 3',
                kelurahan: 'Test Kelurahan',
                kecamatan: 'Test Kecamatan',
                kota_kabupaten: 'Test Kota',
                provinsi: 'Test Provinsi',
                nomor_rekening: '1234567890',
                nama_rekening: 'Test Agen 3',
                sponsor_id: null,
                link_referral: 'https://test.com/ref/AG003'
            })
            .returning()
            .execute();

        const testTransaksi = await db.insert(transaksiTable)
            .values({
                user_id: testUser[0].id,
                agen_id: testAgen[0].id,
                tipe_transaksi: 'PAKET',
                total_harga: '300000',
                total_box: 3
            })
            .returning()
            .execute();

        // Create first commission record
        await db.insert(komisiTable)
            .values({
                agen_id: testAgen[0].id,
                transaksi_id: testTransaksi[0].id,
                jenis_komisi: 'SPONSOR',
                level: 1,
                nominal: '100000',
                status: 'PENDING'
            })
            .execute();

        // Wait to ensure different timestamp
        await new Promise(resolve => setTimeout(resolve, 50));

        // Create second commission record
        await db.insert(komisiTable)
            .values({
                agen_id: testAgen[0].id,
                transaksi_id: testTransaksi[0].id,
                jenis_komisi: 'REPEAT_ORDER',
                level: 1,
                nominal: '50000',
                status: 'DIBAYAR'
            })
            .execute();

        const result = await getKomisiByAgenId(testAgen[0].id);

        expect(result).toHaveLength(2);
        
        // Should be ordered by created_at desc (newest first)
        expect(result[0].created_at >= result[1].created_at).toBe(true);
        expect(result[0].jenis_komisi).toBe('REPEAT_ORDER'); // Second record should be first
        expect(result[1].jenis_komisi).toBe('SPONSOR'); // First record should be second
    });

    it('should handle decimal amounts correctly', async () => {
        // Create test user and agen
        const testUser = await db.insert(usersTable)
            .values({
                username: 'testagen4',
                password: 'password123',
                role: 'AGEN'
            })
            .returning()
            .execute();

        const testAgen = await db.insert(agenTable)
            .values({
                user_id: testUser[0].id,
                id_agen: 'AG004',
                nama_lengkap: 'Test Agen 4',
                nomor_ktp: '1234567890123456',
                jenis_kelamin: 'PRIA',
                nomor_hp: '081234567890',
                email: 'agen4@test.com',
                alamat_lengkap: 'Jl. Test No. 4',
                kelurahan: 'Test Kelurahan',
                kecamatan: 'Test Kecamatan',
                kota_kabupaten: 'Test Kota',
                provinsi: 'Test Provinsi',
                nomor_rekening: '1234567890',
                nama_rekening: 'Test Agen 4',
                sponsor_id: null,
                link_referral: 'https://test.com/ref/AG004'
            })
            .returning()
            .execute();

        const testTransaksi = await db.insert(transaksiTable)
            .values({
                user_id: testUser[0].id,
                agen_id: testAgen[0].id,
                tipe_transaksi: 'UPGRADE',
                total_harga: '300000',
                total_box: 3
            })
            .returning()
            .execute();

        // Create commission with decimal amount
        await db.insert(komisiTable)
            .values({
                agen_id: testAgen[0].id,
                transaksi_id: testTransaksi[0].id,
                jenis_komisi: 'UPGRADE',
                level: 1,
                nominal: '25000.75',
                status: 'PENDING'
            })
            .execute();

        const result = await getKomisiByAgenId(testAgen[0].id);

        expect(result).toHaveLength(1);
        expect(result[0].nominal).toBe(25000.75);
        expect(typeof result[0].nominal).toBe('number');
        expect(result[0].jenis_komisi).toBe('UPGRADE');
    });
});