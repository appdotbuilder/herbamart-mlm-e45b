import { db } from '../db';
import { 
  agenTable, 
  rewardTable
} from '../db/schema';
import { 
  type Reward, 
  type PerolehanReward, 
  type Agen 
} from '../schema';
import { eq, and, sql } from 'drizzle-orm';

export async function checkRewardEligibility(agenId: number): Promise<{ eligible: boolean; rewards: Reward[] }> {
  try {
    // Get agent data
    const agen = await db.select()
      .from(agenTable)
      .where(eq(agenTable.id, agenId))
      .execute();

    if (agen.length === 0) {
      throw new Error('Agent not found');
    }

    const agenData = agen[0];

    // Get rewards that match or are below agent's rank
    const rankHierarchy = ['AGEN', 'MANAGER', 'EXECUTIVE_MANAGER', 'DIRECTOR', 'EXECUTIVE_DIRECTOR', 'SENIOR_EXECUTIVE_DIRECTOR'];
    const agenRankIndex = rankHierarchy.indexOf(agenData.peringkat);
    
    if (agenRankIndex === -1) {
      return { eligible: false, rewards: [] };
    }

    const eligibleRanks = rankHierarchy.slice(0, agenRankIndex + 1);

    // Get all active rewards
    const results = await db.select()
      .from(rewardTable)
      .where(eq(rewardTable.is_active, true))
      .execute();
    
    // Filter rewards based on rank eligibility
    const eligibleRewards = results.filter(reward => 
      eligibleRanks.includes(reward.peringkat_required)
    );

    // Check if agent hasn't claimed these rewards yet using raw SQL
    const unclaimedRewards: Reward[] = [];
    
    for (const reward of eligibleRewards) {
      const existingClaim = await db.execute(sql`
        SELECT id FROM perolehan_reward 
        WHERE agen_id = ${agenId} AND reward_id = ${reward.id}
      `);

      if (existingClaim.rowCount === 0) {
        unclaimedRewards.push(reward);
      }
    }

    return {
      eligible: unclaimedRewards.length > 0,
      rewards: unclaimedRewards
    };
  } catch (error) {
    console.error('Check reward eligibility failed:', error);
    throw error;
  }
}

export async function getPerolehanRewardByAgenId(agenId: number): Promise<PerolehanReward[]> {
  try {
    const results = await db.execute(sql`
      SELECT * FROM perolehan_reward 
      WHERE agen_id = ${agenId}
    `);

    return (results.rows || []).map((row: any) => ({
      id: row.id,
      agen_id: row.agen_id,
      reward_id: row.reward_id,
      tanggal_perolehan: row.tanggal_perolehan,
      status: row.status as 'DITERIMA' | 'PENDING' | 'DITOLAK',
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
  } catch (error) {
    console.error('Get perolehan reward failed:', error);
    throw error;
  }
}

export async function processRewardClaim(agenId: number, rewardId: number): Promise<{ success: boolean; message: string }> {
  try {
    // Check if agent exists
    const agen = await db.select()
      .from(agenTable)
      .where(eq(agenTable.id, agenId))
      .execute();

    if (agen.length === 0) {
      return { success: false, message: 'Agent tidak ditemukan' };
    }

    // Check if reward exists and is active
    const reward = await db.select()
      .from(rewardTable)
      .where(
        and(
          eq(rewardTable.id, rewardId),
          eq(rewardTable.is_active, true)
        )
      )
      .execute();

    if (reward.length === 0) {
      return { success: false, message: 'Reward tidak ditemukan atau tidak aktif' };
    }

    // Check eligibility
    const eligibility = await checkRewardEligibility(agenId);
    const isEligible = eligibility.rewards.some(r => r.id === rewardId);

    if (!isEligible) {
      return { success: false, message: 'Anda belum memenuhi syarat untuk reward ini' };
    }

    // Check if already claimed using raw SQL
    const existingClaim = await db.execute(sql`
      SELECT id FROM perolehan_reward 
      WHERE agen_id = ${agenId} AND reward_id = ${rewardId}
    `);

    if ((existingClaim.rowCount || 0) > 0) {
      return { success: false, message: 'Reward sudah pernah diklaim sebelumnya' };
    }

    // Create reward claim using raw SQL
    await db.execute(sql`
      INSERT INTO perolehan_reward (agen_id, reward_id, status) 
      VALUES (${agenId}, ${rewardId}, 'PENDING')
    `);

    return {
      success: true,
      message: 'Reward berhasil diklaim! Tim akan menghubungi Anda untuk pengaturan lebih lanjut.'
    };
  } catch (error) {
    console.error('Process reward claim failed:', error);
    throw error;
  }
}

export async function getAllPerolehanReward(): Promise<(PerolehanReward & { 
  agen: { nama_lengkap: string; id_agen: string };
  reward: { nama_reward: string };
})[]> {
  try {
    const results = await db.execute(sql`
      SELECT 
        pr.*,
        a.nama_lengkap,
        a.id_agen,
        r.nama_reward
      FROM perolehan_reward pr
      INNER JOIN agen a ON pr.agen_id = a.id
      INNER JOIN reward r ON pr.reward_id = r.id
    `);

    return (results.rows || []).map((row: any) => ({
      id: row.id,
      agen_id: row.agen_id,
      reward_id: row.reward_id,
      tanggal_perolehan: row.tanggal_perolehan,
      status: row.status as 'DITERIMA' | 'PENDING' | 'DITOLAK',
      created_at: row.created_at,
      updated_at: row.updated_at,
      agen: {
        nama_lengkap: row.nama_lengkap,
        id_agen: row.id_agen
      },
      reward: {
        nama_reward: row.nama_reward
      }
    }));
  } catch (error) {
    console.error('Get all perolehan reward failed:', error);
    throw error;
  }
}

export async function updateRewardStatus(perolehanId: number, status: 'DITERIMA' | 'PENDING' | 'DITOLAK'): Promise<PerolehanReward> {
  try {
    const result = await db.execute(sql`
      UPDATE perolehan_reward 
      SET status = ${status}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${perolehanId}
      RETURNING *
    `);

    if ((result.rowCount || 0) === 0) {
      throw new Error('Perolehan reward not found');
    }

    const row = result.rows?.[0] as any;
    return {
      id: row.id,
      agen_id: row.agen_id,
      reward_id: row.reward_id,
      tanggal_perolehan: row.tanggal_perolehan,
      status: row.status as 'DITERIMA' | 'PENDING' | 'DITOLAK',
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  } catch (error) {
    console.error('Update reward status failed:', error);
    throw error;
  }
}

export async function getLaporanReward(): Promise<{
  wisataBali: { count: number; agen: Agen[] };
  wisataDuaNegara: { count: number; agen: Agen[] };
  umrohWisataEropa: { count: number; agen: Agen[] };
  mobilCash: { count: number; agen: Agen[] };
  rumahMewah: { count: number; agen: Agen[] };
}> {
  try {
    // Get all accepted reward claims with agent and reward details
    const allClaims = await db.execute(sql`
      SELECT 
        pr.*,
        a.*,
        r.nama_reward
      FROM perolehan_reward pr
      INNER JOIN agen a ON pr.agen_id = a.id
      INNER JOIN reward r ON pr.reward_id = r.id
      WHERE pr.status = 'DITERIMA'
    `);

    const rewardCategories = {
      wisataBali: { count: 0, agen: [] as Agen[] },
      wisataDuaNegara: { count: 0, agen: [] as Agen[] },
      umrohWisataEropa: { count: 0, agen: [] as Agen[] },
      mobilCash: { count: 0, agen: [] as Agen[] },
      rumahMewah: { count: 0, agen: [] as Agen[] }
    };

    // Process each claim and categorize
    (allClaims.rows || []).forEach((claim: any) => {
      const agenData: Agen = {
        id: claim.id,
        user_id: claim.user_id,
        id_agen: claim.id_agen,
        nama_lengkap: claim.nama_lengkap,
        nomor_ktp: claim.nomor_ktp,
        jenis_kelamin: claim.jenis_kelamin,
        nomor_hp: claim.nomor_hp,
        email: claim.email,
        alamat_lengkap: claim.alamat_lengkap,
        kelurahan: claim.kelurahan,
        kecamatan: claim.kecamatan,
        kota_kabupaten: claim.kota_kabupaten,
        provinsi: claim.provinsi,
        nomor_rekening: claim.nomor_rekening,
        nama_rekening: claim.nama_rekening,
        sponsor_id: claim.sponsor_id,
        status_paket: claim.status_paket,
        peringkat: claim.peringkat,
        tipe_agen: claim.tipe_agen,
        stok_produk: claim.stok_produk,
        total_komisi: parseFloat(claim.total_komisi),
        saldo_komisi: parseFloat(claim.saldo_komisi),
        link_referral: claim.link_referral,
        created_at: claim.created_at,
        updated_at: claim.updated_at
      };

      const rewardName = claim.nama_reward.toLowerCase();

      if (rewardName.includes('wisata bali') || rewardName.includes('bali')) {
        rewardCategories.wisataBali.count++;
        rewardCategories.wisataBali.agen.push(agenData);
      } else if (rewardName.includes('wisata dua negara') || rewardName.includes('dua negara')) {
        rewardCategories.wisataDuaNegara.count++;
        rewardCategories.wisataDuaNegara.agen.push(agenData);
      } else if (rewardName.includes('umroh') || rewardName.includes('wisata eropa')) {
        rewardCategories.umrohWisataEropa.count++;
        rewardCategories.umrohWisataEropa.agen.push(agenData);
      } else if (rewardName.includes('mobil') || rewardName.includes('cash')) {
        rewardCategories.mobilCash.count++;
        rewardCategories.mobilCash.agen.push(agenData);
      } else if (rewardName.includes('rumah')) {
        rewardCategories.rumahMewah.count++;
        rewardCategories.rumahMewah.agen.push(agenData);
      }
    });

    return rewardCategories;
  } catch (error) {
    console.error('Get laporan reward failed:', error);
    throw error;
  }
}