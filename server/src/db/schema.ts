import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  boolean,
  pgEnum,
  varchar,
  unique
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const jenisKelaminEnum = pgEnum('jenis_kelamin', ['PRIA', 'WANITA']);
export const statusAgenEnum = pgEnum('status_agen', ['SILVER', 'GOLD', 'PLATINUM']);
export const peringkatAgenEnum = pgEnum('peringkat_agen', ['AGEN', 'MANAGER', 'EXECUTIVE_MANAGER', 'DIRECTOR', 'EXECUTIVE_DIRECTOR', 'SENIOR_EXECUTIVE_DIRECTOR']);
export const tipeAgenEnum = pgEnum('tipe_agen', ['AGEN', 'STOKIS', 'DISTRIBUTOR']);
export const statusTransaksiEnum = pgEnum('status_transaksi', ['DIPROSES', 'DIKEMAS', 'DIKIRIM', 'TIBA_DI_KOTA', 'DITERIMA', 'SELESAI']);
export const tipeTransaksiEnum = pgEnum('tipe_transaksi', ['PAKET', 'UPGRADE', 'REPEAT_ORDER', 'STOK_ORDER', 'PELANGGAN']);
export const jenisKomisiEnum = pgEnum('jenis_komisi', ['SPONSOR', 'REPEAT_ORDER', 'UPGRADE']);
export const statusKomisiEnum = pgEnum('status_komisi', ['PENDING', 'DIBAYAR']);
export const tipeUpgradeEnum = pgEnum('tipe_upgrade', ['SILVER_TO_GOLD', 'GOLD_TO_PLATINUM', 'SILVER_TO_PLATINUM']);
export const statusPenarikanaEnum = pgEnum('status_penarikan', ['PENDING', 'DIPROSES', 'SELESAI', 'DITOLAK']);
export const roleEnum = pgEnum('role', ['PELANGGAN', 'AGEN', 'ADMIN']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password: text('password').notNull(),
  role: roleEnum('role').notNull().default('PELANGGAN'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Pelanggan table
export const pelangganTable = pgTable('pelanggan', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  nama_lengkap: text('nama_lengkap').notNull(),
  jenis_kelamin: jenisKelaminEnum('jenis_kelamin').notNull(),
  nomor_hp: varchar('nomor_hp', { length: 20 }).notNull(),
  email: varchar('email', { length: 100 }).notNull(),
  alamat_lengkap: text('alamat_lengkap').notNull(),
  kelurahan: text('kelurahan').notNull(),
  kecamatan: text('kecamatan').notNull(),
  kota_kabupaten: text('kota_kabupaten').notNull(),
  provinsi: text('provinsi').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Agen table - define separately to avoid circular reference
export const agenTable = pgTable('agen', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  id_agen: varchar('id_agen', { length: 20 }).notNull().unique(),
  nama_lengkap: text('nama_lengkap').notNull(),
  nomor_ktp: varchar('nomor_ktp', { length: 16 }).notNull(),
  jenis_kelamin: jenisKelaminEnum('jenis_kelamin').notNull(),
  nomor_hp: varchar('nomor_hp', { length: 20 }).notNull(),
  email: varchar('email', { length: 100 }).notNull(),
  alamat_lengkap: text('alamat_lengkap').notNull(),
  kelurahan: text('kelurahan').notNull(),
  kecamatan: text('kecamatan').notNull(),
  kota_kabupaten: text('kota_kabupaten').notNull(),
  provinsi: text('provinsi').notNull(),
  nomor_rekening: varchar('nomor_rekening', { length: 50 }).notNull(),
  nama_rekening: text('nama_rekening').notNull(),
  sponsor_id: integer('sponsor_id'),
  status_paket: statusAgenEnum('status_paket').notNull().default('SILVER'),
  peringkat: peringkatAgenEnum('peringkat').notNull().default('AGEN'),
  tipe_agen: tipeAgenEnum('tipe_agen').notNull().default('AGEN'),
  stok_produk: integer('stok_produk').notNull().default(0),
  total_komisi: numeric('total_komisi', { precision: 15, scale: 2 }).notNull().default('0'),
  saldo_komisi: numeric('saldo_komisi', { precision: 15, scale: 2 }).notNull().default('0'),
  link_referral: text('link_referral').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Produk table
export const produkTable = pgTable('produk', {
  id: serial('id').primaryKey(),
  nama_produk: text('nama_produk').notNull(),
  harga_per_box: numeric('harga_per_box', { precision: 10, scale: 2 }).notNull(),
  deskripsi: text('deskripsi'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Paket table
export const paketTable = pgTable('paket', {
  id: serial('id').primaryKey(),
  nama_paket: statusAgenEnum('nama_paket').notNull(),
  harga: numeric('harga', { precision: 10, scale: 2 }).notNull(),
  jumlah_box: integer('jumlah_box').notNull(),
  deskripsi: text('deskripsi'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Transaksi table
export const transaksiTable = pgTable('transaksi', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  agen_id: integer('agen_id').references(() => agenTable.id),
  tipe_transaksi: tipeTransaksiEnum('tipe_transaksi').notNull(),
  total_harga: numeric('total_harga', { precision: 15, scale: 2 }).notNull(),
  total_box: integer('total_box').notNull(),
  status: statusTransaksiEnum('status').notNull().default('DIPROSES'),
  payment_method: text('payment_method'),
  payment_reference: text('payment_reference'),
  catatan: text('catatan'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Komisi table
export const komisiTable = pgTable('komisi', {
  id: serial('id').primaryKey(),
  agen_id: integer('agen_id').notNull().references(() => agenTable.id, { onDelete: 'cascade' }),
  transaksi_id: integer('transaksi_id').notNull().references(() => transaksiTable.id, { onDelete: 'cascade' }),
  jenis_komisi: jenisKomisiEnum('jenis_komisi').notNull(),
  level: integer('level').notNull(),
  nominal: numeric('nominal', { precision: 15, scale: 2 }).notNull(),
  status: statusKomisiEnum('status').notNull().default('PENDING'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Penarikan Komisi table
export const penarikanKomisiTable = pgTable('penarikan_komisi', {
  id: serial('id').primaryKey(),
  agen_id: integer('agen_id').notNull().references(() => agenTable.id, { onDelete: 'cascade' }),
  nominal: numeric('nominal', { precision: 15, scale: 2 }).notNull(),
  status: statusPenarikanaEnum('status').notNull().default('PENDING'),
  tanggal_pengajuan: timestamp('tanggal_pengajuan').defaultNow().notNull(),
  tanggal_proses: timestamp('tanggal_proses'),
  catatan: text('catatan'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Jaringan table
export const jaringanTable = pgTable('jaringan', {
  id: serial('id').primaryKey(),
  agen_id: integer('agen_id').notNull().references(() => agenTable.id, { onDelete: 'cascade' }),
  sponsor_id: integer('sponsor_id').notNull().references(() => agenTable.id, { onDelete: 'cascade' }),
  level: integer('level').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  uniqueAgenLevel: unique('unique_agen_level').on(table.agen_id, table.sponsor_id, table.level)
}));

// Reward table
export const rewardTable = pgTable('reward', {
  id: serial('id').primaryKey(),
  nama_reward: text('nama_reward').notNull(),
  peringkat_required: peringkatAgenEnum('peringkat_required').notNull(),
  deskripsi: text('deskripsi'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Perolehan Reward table
export const perolehanRewardTable = pgTable('perolehan_reward', {
  id: serial('id').primaryKey(),
  agen_id: integer('agen_id').notNull().references(() => agenTable.id, { onDelete: 'cascade' }),
  reward_id: integer('reward_id').notNull().references(() => rewardTable.id, { onDelete: 'cascade' }),
  tanggal_perolehan: timestamp('tanggal_perolehan').defaultNow().notNull(),
  status: pgEnum('status_reward', ['DITERIMA', 'PENDING', 'DITOLAK'])('status').notNull().default('PENDING'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Pengaturan Komisi table
export const pengaturanKomisiTable = pgTable('pengaturan_komisi', {
  id: serial('id').primaryKey(),
  jenis_komisi: jenisKomisiEnum('jenis_komisi').notNull(),
  tipe_paket: statusAgenEnum('tipe_paket'),
  level: integer('level').notNull(),
  nominal: numeric('nominal', { precision: 15, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  uniqueKomisiLevel: unique('unique_komisi_level').on(table.jenis_komisi, table.tipe_paket, table.level)
}));

// Inventory table
export const inventoryTable = pgTable('inventory', {
  id: serial('id').primaryKey(),
  produk_id: integer('produk_id').notNull().references(() => produkTable.id, { onDelete: 'cascade' }),
  stok_masuk: integer('stok_masuk').notNull().default(0),
  stok_keluar: integer('stok_keluar').notNull().default(0),
  sisa_stok: integer('sisa_stok').notNull().default(0),
  tanggal: timestamp('tanggal').defaultNow().notNull(),
  keterangan: text('keterangan'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Upgrade table
export const upgradeTable = pgTable('upgrade', {
  id: serial('id').primaryKey(),
  agen_id: integer('agen_id').notNull().references(() => agenTable.id, { onDelete: 'cascade' }),
  transaksi_id: integer('transaksi_id').notNull().references(() => transaksiTable.id, { onDelete: 'cascade' }),
  tipe_upgrade: tipeUpgradeEnum('tipe_upgrade').notNull(),
  dari_paket: statusAgenEnum('dari_paket').notNull(),
  ke_paket: statusAgenEnum('ke_paket').notNull(),
  jumlah_box: integer('jumlah_box').notNull(),
  total_harga: numeric('total_harga', { precision: 15, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ one }) => ({
  pelanggan: one(pelangganTable),
  agen: one(agenTable)
}));

export const pelangganRelations = relations(pelangganTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [pelangganTable.user_id],
    references: [usersTable.id]
  })
}));

export const agenRelations = relations(agenTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [agenTable.user_id],
    references: [usersTable.id]
  }),
  sponsor: one(agenTable, {
    fields: [agenTable.sponsor_id],
    references: [agenTable.id],
    relationName: 'sponsor'
  }),
  downlines: many(agenTable, { relationName: 'sponsor' }),
  komisi: many(komisiTable),
  transaksi: many(transaksiTable),
  jaringan: many(jaringanTable, { relationName: 'agen_jaringan' }),
  sponsorJaringan: many(jaringanTable, { relationName: 'sponsor_jaringan' }),
  penarikanKomisi: many(penarikanKomisiTable),
  perolehanReward: many(perolehanRewardTable),
  upgrade: many(upgradeTable)
}));

export const transaksiRelations = relations(transaksiTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [transaksiTable.user_id],
    references: [usersTable.id]
  }),
  agen: one(agenTable, {
    fields: [transaksiTable.agen_id],
    references: [agenTable.id]
  }),
  komisi: many(komisiTable),
  upgrade: many(upgradeTable)
}));

export const komisiRelations = relations(komisiTable, ({ one }) => ({
  agen: one(agenTable, {
    fields: [komisiTable.agen_id],
    references: [agenTable.id]
  }),
  transaksi: one(transaksiTable, {
    fields: [komisiTable.transaksi_id],
    references: [transaksiTable.id]
  })
}));

export const jaringanRelations = relations(jaringanTable, ({ one }) => ({
  agen: one(agenTable, {
    fields: [jaringanTable.agen_id],
    references: [agenTable.id],
    relationName: 'agen_jaringan'
  }),
  sponsor: one(agenTable, {
    fields: [jaringanTable.sponsor_id],
    references: [agenTable.id],
    relationName: 'sponsor_jaringan'
  })
}));

export const rewardRelations = relations(rewardTable, ({ many }) => ({
  perolehanReward: many(perolehanRewardTable)
}));

export const perolehanRewardRelations = relations(perolehanRewardTable, ({ one }) => ({
  agen: one(agenTable, {
    fields: [perolehanRewardTable.agen_id],
    references: [agenTable.id]
  }),
  reward: one(rewardTable, {
    fields: [perolehanRewardTable.reward_id],
    references: [rewardTable.id]
  })
}));

export const inventoryRelations = relations(inventoryTable, ({ one }) => ({
  produk: one(produkTable, {
    fields: [inventoryTable.produk_id],
    references: [produkTable.id]
  })
}));

export const upgradeRelations = relations(upgradeTable, ({ one }) => ({
  agen: one(agenTable, {
    fields: [upgradeTable.agen_id],
    references: [agenTable.id]
  }),
  transaksi: one(transaksiTable, {
    fields: [upgradeTable.transaksi_id],
    references: [transaksiTable.id]
  })
}));

// Export all tables
export const tables = {
  users: usersTable,
  pelanggan: pelangganTable,
  agen: agenTable,
  produk: produkTable,
  paket: paketTable,
  transaksi: transaksiTable,
  komisi: komisiTable,
  penarikanKomisi: penarikanKomisiTable,
  jaringan: jaringanTable,
  reward: rewardTable,
  perolehanReward: perolehanRewardTable,
  pengaturanKomisi: pengaturanKomisiTable,
  inventory: inventoryTable,
  upgrade: upgradeTable
};