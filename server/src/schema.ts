import { z } from 'zod';

// Enums
export const jenisKelaminEnum = z.enum(['PRIA', 'WANITA']);
export const statusAgenEnum = z.enum(['SILVER', 'GOLD', 'PLATINUM']);
export const peringkatAgenEnum = z.enum(['AGEN', 'MANAGER', 'EXECUTIVE_MANAGER', 'DIRECTOR', 'EXECUTIVE_DIRECTOR', 'SENIOR_EXECUTIVE_DIRECTOR']);
export const tipeAgenEnum = z.enum(['AGEN', 'STOKIS', 'DISTRIBUTOR']);
export const statusTransaksiEnum = z.enum(['DIPROSES', 'DIKEMAS', 'DIKIRIM', 'TIBA_DI_KOTA', 'DITERIMA', 'SELESAI']);
export const tipeTransaksiEnum = z.enum(['PAKET', 'UPGRADE', 'REPEAT_ORDER', 'STOK_ORDER', 'PELANGGAN']);
export const jenisKomisiEnum = z.enum(['SPONSOR', 'REPEAT_ORDER', 'UPGRADE']);
export const statusKomisiEnum = z.enum(['PENDING', 'DIBAYAR']);
export const tipeUpgradeEnum = z.enum(['SILVER_TO_GOLD', 'GOLD_TO_PLATINUM', 'SILVER_TO_PLATINUM']);
export const statusPenarikanaEnum = z.enum(['PENDING', 'DIPROSES', 'SELESAI', 'DITOLAK']);

// User/Authentication schemas
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  password: z.string(),
  role: z.enum(['PELANGGAN', 'AGEN', 'ADMIN']),
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(['PELANGGAN', 'AGEN', 'ADMIN'])
});

export type CreateUser = z.infer<typeof createUserSchema>;

export const loginSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginSchema>;

// Pelanggan schema
export const pelangganSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  nama_lengkap: z.string(),
  jenis_kelamin: jenisKelaminEnum,
  nomor_hp: z.string(),
  email: z.string(),
  alamat_lengkap: z.string(),
  kelurahan: z.string(),
  kecamatan: z.string(),
  kota_kabupaten: z.string(),
  provinsi: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Pelanggan = z.infer<typeof pelangganSchema>;

export const createPelangganSchema = z.object({
  user_id: z.number(),
  nama_lengkap: z.string(),
  jenis_kelamin: jenisKelaminEnum,
  nomor_hp: z.string(),
  email: z.string().email(),
  alamat_lengkap: z.string(),
  kelurahan: z.string(),
  kecamatan: z.string(),
  kota_kabupaten: z.string(),
  provinsi: z.string()
});

export type CreatePelanggan = z.infer<typeof createPelangganSchema>;

// Agen schema
export const agenSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  id_agen: z.string(),
  nama_lengkap: z.string(),
  nomor_ktp: z.string(),
  jenis_kelamin: jenisKelaminEnum,
  nomor_hp: z.string(),
  email: z.string(),
  alamat_lengkap: z.string(),
  kelurahan: z.string(),
  kecamatan: z.string(),
  kota_kabupaten: z.string(),
  provinsi: z.string(),
  nomor_rekening: z.string(),
  nama_rekening: z.string(),
  sponsor_id: z.number().nullable(),
  status_paket: statusAgenEnum,
  peringkat: peringkatAgenEnum,
  tipe_agen: tipeAgenEnum,
  stok_produk: z.number().int(),
  total_komisi: z.number(),
  saldo_komisi: z.number(),
  link_referral: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Agen = z.infer<typeof agenSchema>;

export const createAgenSchema = z.object({
  user_id: z.number(),
  nama_lengkap: z.string(),
  nomor_ktp: z.string().length(16),
  jenis_kelamin: jenisKelaminEnum,
  nomor_hp: z.string(),
  email: z.string().email(),
  alamat_lengkap: z.string(),
  kelurahan: z.string(),
  kecamatan: z.string(),
  kota_kabupaten: z.string(),
  provinsi: z.string(),
  nomor_rekening: z.string(),
  nama_rekening: z.string(),
  sponsor_id: z.number().nullable(),
  status_paket: statusAgenEnum,
  password: z.string().min(6)
});

export type CreateAgen = z.infer<typeof createAgenSchema>;

// Produk schema
export const produkSchema = z.object({
  id: z.number(),
  nama_produk: z.string(),
  harga_per_box: z.number(),
  deskripsi: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Produk = z.infer<typeof produkSchema>;

export const createProdukSchema = z.object({
  nama_produk: z.string(),
  harga_per_box: z.number().positive(),
  deskripsi: z.string().nullable().optional()
});

export type CreateProduk = z.infer<typeof createProdukSchema>;

// Paket schema
export const paketSchema = z.object({
  id: z.number(),
  nama_paket: statusAgenEnum,
  harga: z.number(),
  jumlah_box: z.number().int(),
  deskripsi: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Paket = z.infer<typeof paketSchema>;

// Transaksi schema
export const transaksiSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  agen_id: z.number().nullable(),
  tipe_transaksi: tipeTransaksiEnum,
  total_harga: z.number(),
  total_box: z.number().int(),
  status: statusTransaksiEnum,
  payment_method: z.string().nullable(),
  payment_reference: z.string().nullable(),
  catatan: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Transaksi = z.infer<typeof transaksiSchema>;

export const createTransaksiSchema = z.object({
  user_id: z.number(),
  agen_id: z.number().nullable(),
  tipe_transaksi: tipeTransaksiEnum,
  total_harga: z.number().positive(),
  total_box: z.number().int().positive(),
  catatan: z.string().optional()
});

export type CreateTransaksi = z.infer<typeof createTransaksiSchema>;

// Komisi schema
export const komisiSchema = z.object({
  id: z.number(),
  agen_id: z.number(),
  transaksi_id: z.number(),
  jenis_komisi: jenisKomisiEnum,
  level: z.number().int(),
  nominal: z.number(),
  status: statusKomisiEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Komisi = z.infer<typeof komisiSchema>;

export const createKomisiSchema = z.object({
  agen_id: z.number(),
  transaksi_id: z.number(),
  jenis_komisi: jenisKomisiEnum,
  level: z.number().int().min(1).max(15),
  nominal: z.number()
});

export type CreateKomisi = z.infer<typeof createKomisiSchema>;

// Penarikan Komisi schema
export const penarikanKomisiSchema = z.object({
  id: z.number(),
  agen_id: z.number(),
  nominal: z.number(),
  status: statusPenarikanaEnum,
  tanggal_pengajuan: z.coerce.date(),
  tanggal_proses: z.coerce.date().nullable(),
  catatan: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type PenarikanKomisi = z.infer<typeof penarikanKomisiSchema>;

export const createPenarikanKomisiSchema = z.object({
  agen_id: z.number(),
  nominal: z.number().positive()
});

export type CreatePenarikanKomisi = z.infer<typeof createPenarikanKomisiSchema>;

// Jaringan schema
export const jaringanSchema = z.object({
  id: z.number(),
  agen_id: z.number(),
  sponsor_id: z.number(),
  level: z.number().int(),
  created_at: z.coerce.date()
});

export type Jaringan = z.infer<typeof jaringanSchema>;

export const createJaringanSchema = z.object({
  agen_id: z.number(),
  sponsor_id: z.number(),
  level: z.number().int().min(1).max(15)
});

export type CreateJaringan = z.infer<typeof createJaringanSchema>;

// Reward schema
export const rewardSchema = z.object({
  id: z.number(),
  nama_reward: z.string(),
  peringkat_required: peringkatAgenEnum,
  deskripsi: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Reward = z.infer<typeof rewardSchema>;

export const createRewardSchema = z.object({
  nama_reward: z.string(),
  peringkat_required: peringkatAgenEnum,
  deskripsi: z.string().nullable().optional()
});

export type CreateReward = z.infer<typeof createRewardSchema>;

// Perolehan Reward schema
export const perolehanRewardSchema = z.object({
  id: z.number(),
  agen_id: z.number(),
  reward_id: z.number(),
  tanggal_perolehan: z.coerce.date(),
  status: z.enum(['DITERIMA', 'PENDING', 'DITOLAK']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type PerolehanReward = z.infer<typeof perolehanRewardSchema>;

// Pengaturan Komisi schema
export const pengaturanKomisiSchema = z.object({
  id: z.number(),
  jenis_komisi: jenisKomisiEnum,
  tipe_paket: statusAgenEnum.nullable(),
  level: z.number().int(),
  nominal: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type PengaturanKomisi = z.infer<typeof pengaturanKomisiSchema>;

export const createPengaturanKomisiSchema = z.object({
  jenis_komisi: jenisKomisiEnum,
  tipe_paket: statusAgenEnum.nullable(),
  level: z.number().int().min(1).max(15),
  nominal: z.number()
});

export type CreatePengaturanKomisi = z.infer<typeof createPengaturanKomisiSchema>;

// Inventory schema
export const inventorySchema = z.object({
  id: z.number(),
  produk_id: z.number(),
  stok_masuk: z.number().int(),
  stok_keluar: z.number().int(),
  sisa_stok: z.number().int(),
  tanggal: z.coerce.date(),
  keterangan: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Inventory = z.infer<typeof inventorySchema>;

export const createInventorySchema = z.object({
  produk_id: z.number(),
  stok_masuk: z.number().int().nonnegative(),
  stok_keluar: z.number().int().nonnegative(),
  keterangan: z.string().nullable().optional()
});

export type CreateInventory = z.infer<typeof createInventorySchema>;

// Upgrade schema
export const upgradeSchema = z.object({
  id: z.number(),
  agen_id: z.number(),
  transaksi_id: z.number(),
  tipe_upgrade: tipeUpgradeEnum,
  dari_paket: statusAgenEnum,
  ke_paket: statusAgenEnum,
  jumlah_box: z.number().int(),
  total_harga: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Upgrade = z.infer<typeof upgradeSchema>;

export const createUpgradeSchema = z.object({
  agen_id: z.number(),
  tipe_upgrade: tipeUpgradeEnum
});

export type CreateUpgrade = z.infer<typeof createUpgradeSchema>;

// Dashboard stats schemas
export const dashboardStatsSchema = z.object({
  total_agen: z.number().int(),
  agen_silver: z.number().int(),
  agen_gold: z.number().int(),
  agen_platinum: z.number().int(),
  total_stokis: z.number().int(),
  total_distributor: z.number().int(),
  total_omset: z.number(),
  total_komisi: z.number(),
  saldo_komisi_pending: z.number()
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// Export all enum types
export type JenisKelamin = z.infer<typeof jenisKelaminEnum>;
export type StatusAgen = z.infer<typeof statusAgenEnum>;
export type PeringkatAgen = z.infer<typeof peringkatAgenEnum>;
export type TipeAgen = z.infer<typeof tipeAgenEnum>;
export type StatusTransaksi = z.infer<typeof statusTransaksiEnum>;
export type TipeTransaksi = z.infer<typeof tipeTransaksiEnum>;
export type JenisKomisi = z.infer<typeof jenisKomisiEnum>;
export type StatusKomisi = z.infer<typeof statusKomisiEnum>;
export type TipeUpgrade = z.infer<typeof tipeUpgradeEnum>;
export type StatusPenarikan = z.infer<typeof statusPenarikanaEnum>;