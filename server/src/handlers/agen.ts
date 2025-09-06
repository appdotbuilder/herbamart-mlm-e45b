import { db } from '../db';
import { usersTable, agenTable, jaringanTable } from '../db/schema';
import { type CreateAgen, type Agen } from '../schema';
import { eq, and } from 'drizzle-orm';

// Province mapping for agent ID generation
const provinceCodeMap: Record<string, string> = {
  'Aceh': 'AC',
  'Sumatera Utara': 'SU',
  'Sumatera Barat': 'SB',
  'Riau': 'RI',
  'Jambi': 'JA',
  'Sumatera Selatan': 'SS',
  'Bengkulu': 'BG',
  'Lampung': 'LA',
  'Kepulauan Bangka Belitung': 'BB',
  'Kepulauan Riau': 'KR',
  'Jakarta': 'JK',
  'Jawa Barat': 'JB',
  'Jawa Tengah': 'JT',
  'Jawa Timur': 'JI',
  'Yogyakarta': 'YO',
  'Banten': 'BT',
  'Bali': 'BA',
  'Nusa Tenggara Barat': 'NB',
  'Nusa Tenggara Timur': 'NT',
  'Kalimantan Barat': 'KB',
  'Kalimantan Tengah': 'KT',
  'Kalimantan Selatan': 'KS',
  'Kalimantan Timur': 'KI',
  'Kalimantan Utara': 'KU',
  'Sulawesi Utara': 'SA',
  'Sulawesi Tengah': 'ST',
  'Sulawesi Selatan': 'SN',
  'Sulawesi Tenggara': 'SE',
  'Gorontalo': 'GO',
  'Sulawesi Barat': 'SR',
  'Maluku': 'MA',
  'Maluku Utara': 'MU',
  'Papua Barat': 'PB',
  'Papua': 'PA'
};

export const createAgen = async (input: CreateAgen): Promise<{ agen: Agen; idAgen: string }> => {
  try {
    // Verify user exists and has AGEN role
    const user = await db.select()
      .from(usersTable)
      .where(and(
        eq(usersTable.id, input.user_id),
        eq(usersTable.role, 'AGEN')
      ))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found or not an agent');
    }

    // Verify sponsor exists if provided
    if (input.sponsor_id) {
      const sponsor = await db.select()
        .from(agenTable)
        .where(eq(agenTable.id, input.sponsor_id))
        .execute();

      if (sponsor.length === 0) {
        throw new Error('Sponsor not found');
      }
    }

    // Generate unique agent ID: {province_code}-{year}-{sequence}
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const provinceCode = provinceCodeMap[input.provinsi] || 'XX';
    
    // Get existing agents to determine sequence
    const existingAgents = await db.select({ id_agen: agenTable.id_agen })
      .from(agenTable)
      .execute();

    let maxSequence = 0;
    const pattern = new RegExp(`^${provinceCode}-${currentYear}(\\d{4})$`);
    
    for (const agent of existingAgents) {
      const match = agent.id_agen.match(pattern);
      if (match) {
        const sequence = parseInt(match[1]);
        if (sequence > maxSequence) {
          maxSequence = sequence;
        }
      }
    }

    const newSequence = (maxSequence + 1).toString().padStart(4, '0');
    const generatedIdAgen = `${provinceCode}-${currentYear}${newSequence}`;

    // Create agent record
    const agenResult = await db.insert(agenTable)
      .values({
        user_id: input.user_id,
        id_agen: generatedIdAgen,
        nama_lengkap: input.nama_lengkap,
        nomor_ktp: input.nomor_ktp,
        jenis_kelamin: input.jenis_kelamin,
        nomor_hp: input.nomor_hp,
        email: input.email,
        alamat_lengkap: input.alamat_lengkap,
        kelurahan: input.kelurahan,
        kecamatan: input.kecamatan,
        kota_kabupaten: input.kota_kabupaten,
        provinsi: input.provinsi,
        nomor_rekening: input.nomor_rekening,
        nama_rekening: input.nama_rekening,
        sponsor_id: input.sponsor_id,
        status_paket: input.status_paket,
        link_referral: `https://herbamart.id/ref/${generatedIdAgen}`
      })
      .returning()
      .execute();

    const newAgen = agenResult[0];

    // Create network structure if sponsor exists
    if (input.sponsor_id) {
      // Get sponsor's network levels
      const sponsorNetwork = await db.select()
        .from(jaringanTable)
        .where(eq(jaringanTable.agen_id, input.sponsor_id))
        .execute();

      // Create network entries for all uplines (up to 15 levels)
      const networkEntries = [];

      // Direct sponsor relationship (level 1)
      networkEntries.push({
        agen_id: newAgen.id,
        sponsor_id: input.sponsor_id,
        level: 1
      });

      // Additional levels from sponsor's uplines
      for (const networkEntry of sponsorNetwork) {
        if (networkEntry.level < 15) {
          networkEntries.push({
            agen_id: newAgen.id,
            sponsor_id: networkEntry.sponsor_id,
            level: networkEntry.level + 1
          });
        }
      }

      // Insert all network entries
      if (networkEntries.length > 0) {
        await db.insert(jaringanTable)
          .values(networkEntries)
          .execute();
      }
    }

    // Convert numeric fields back to numbers
    const agen: Agen = {
      ...newAgen,
      total_komisi: parseFloat(newAgen.total_komisi),
      saldo_komisi: parseFloat(newAgen.saldo_komisi)
    };

    return {
      agen,
      idAgen: generatedIdAgen
    };

  } catch (error) {
    console.error('Agent creation failed:', error);
    throw error;
  }
};

export async function getAgenByUserId(userId: number): Promise<Agen | null> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching agent data by user ID from database.
    return Promise.resolve({
        id: 1,
        user_id: userId,
        id_agen: 'JB-250001',
        nama_lengkap: 'Test Agen',
        nomor_ktp: '1234567890123456',
        jenis_kelamin: 'PRIA',
        nomor_hp: '08123456789',
        email: 'agen@test.com',
        alamat_lengkap: 'Jl. Agen Test',
        kelurahan: 'Test',
        kecamatan: 'Test',
        kota_kabupaten: 'Test',
        provinsi: 'Jawa Barat',
        nomor_rekening: '1234567890',
        nama_rekening: 'Test Agen',
        sponsor_id: null,
        status_paket: 'SILVER',
        peringkat: 'AGEN',
        tipe_agen: 'AGEN',
        stok_produk: 0,
        total_komisi: 0,
        saldo_komisi: 0,
        link_referral: 'https://herbamart.id/ref/JB-250001',
        created_at: new Date(),
        updated_at: new Date()
    });
}

export async function getAgenDashboardStats(agenId: number): Promise<any> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is calculating agent dashboard statistics including downlines, commission, rewards, etc.
    return Promise.resolve({
        total_agen: 15,
        agen_silver: 10,
        agen_gold: 4,
        agen_platinum: 1,
        total_stokis: 2,
        total_distributor: 0,
        total_omset: 5600000,
        total_komisi: 840000,
        saldo_komisi_pending: 340000
    });
}

export async function getAgenNetwork(agenId: number): Promise<any[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching agent's network structure up to 15 levels.
    return Promise.resolve([
        {
            id: 1,
            agen_id: 2,
            sponsor_id: agenId,
            level: 1,
            created_at: new Date()
        }
    ]);
}

export async function getNetworkByLevel(sponsorId: number, level: number): Promise<any[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching all agents at specific network level under a sponsor.
    return Promise.resolve([
        {
            id: 2,
            user_id: 2,
            id_agen: 'JB-250002',
            nama_lengkap: 'Downline Test',
            nomor_ktp: '1234567890123457',
            jenis_kelamin: 'WANITA',
            nomor_hp: '08123456788',
            email: 'downline@test.com',
            alamat_lengkap: 'Jl. Downline Test',
            kelurahan: 'Test',
            kecamatan: 'Test',
            kota_kabupaten: 'Bandung',
            provinsi: 'Jawa Barat',
            nomor_rekening: '1234567891',
            nama_rekening: 'Downline Test',
            sponsor_id: sponsorId,
            status_paket: 'GOLD',
            peringkat: 'AGEN',
            tipe_agen: 'AGEN',
            stok_produk: 6,
            total_komisi: 120000,
            saldo_komisi: 45000,
            link_referral: 'https://herbamart.id/ref/JB-250002',
            created_at: new Date(),
            updated_at: new Date()
        }
    ]);
}

export async function upgradeAgen(agenId: number, upgrade: any): Promise<{ success: boolean; transaksiId: number }> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is upgrading agent package (Silver->Gold, etc) and creating transaction.
    return Promise.resolve({
        success: true,
        transaksiId: 1
    });
}

export async function processRepeatOrder(agenId: number, jumlahBox: number): Promise<{ success: boolean; transaksiId: number }> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is processing repeat order for agents and creating transaction.
    return Promise.resolve({
        success: true,
        transaksiId: 2
    });
}

export async function registerStokis(agenId: number, minimalBox: number): Promise<{ success: boolean }> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is registering agent as stokis with minimum box requirement.
    return Promise.resolve({
        success: true
    });
}

export async function registerDistributor(agenId: number, minimalBox: number): Promise<{ success: boolean }> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is registering agent as distributor with minimum box requirement.
    return Promise.resolve({
        success: true
    });
}

export async function updateAgenProfile(id: number, input: Partial<CreateAgen>): Promise<Agen> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is updating agent profile information in database.
    return Promise.resolve({
        id: id,
        user_id: 1,
        id_agen: 'JB-250001',
        nama_lengkap: input.nama_lengkap || 'Updated Agen',
        nomor_ktp: input.nomor_ktp || '1234567890123456',
        jenis_kelamin: input.jenis_kelamin || 'PRIA',
        nomor_hp: input.nomor_hp || '08123456789',
        email: input.email || 'agen@test.com',
        alamat_lengkap: input.alamat_lengkap || 'Updated address',
        kelurahan: input.kelurahan || 'Updated',
        kecamatan: input.kecamatan || 'Updated',
        kota_kabupaten: input.kota_kabupaten || 'Updated',
        provinsi: input.provinsi || 'Updated',
        nomor_rekening: input.nomor_rekening || '1234567890',
        nama_rekening: input.nama_rekening || 'Updated Agen',
        sponsor_id: input.sponsor_id || null,
        status_paket: input.status_paket || 'SILVER',
        peringkat: 'AGEN',
        tipe_agen: 'AGEN',
        stok_produk: 0,
        total_komisi: 0,
        saldo_komisi: 0,
        link_referral: 'https://herbamart.id/ref/JB-250001',
        created_at: new Date(),
        updated_at: new Date()
    });
}