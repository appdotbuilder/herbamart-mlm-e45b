import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  loginSchema, 
  createPelangganSchema,
  createAgenSchema,
  createTransaksiSchema,
  createKomisiSchema,
  createPenarikanKomisiSchema,
  createUpgradeSchema,
  createProdukSchema,
  createRewardSchema,
  createInventorySchema,
  createPengaturanKomisiSchema
} from './schema';

// Import handlers
import { login, getCurrentUser, resetPassword } from './handlers/auth';
import { 
  createPelanggan, 
  getPelangganByUserId, 
  updatePelanggan, 
  registerAgenFromPelanggan 
} from './handlers/pelanggan';
import { 
  createAgen,
  getAgenByUserId,
  getAgenDashboardStats,
  getAgenNetwork,
  getNetworkByLevel,
  upgradeAgen,
  processRepeatOrder,
  registerStokis,
  registerDistributor,
  updateAgenProfile
} from './handlers/agen';
import {
  createTransaksi,
  getTransaksiByUserId,
  getTransaksiByAgenId,
  getAllTransaksi,
  updateTransaksiStatus,
  processPayment,
  trackOrder
} from './handlers/transaksi';
import {
  calculateKomisi,
  getKomisiByAgenId,
  createPenarikanKomisi,
  getPenarikanKomisiByAgenId,
  processPenarikanKomisi,
  getPengaturanKomisi,
  updatePengaturanKomisi,
  createPengaturanKomisi,
  getTotalKomisiStats
} from './handlers/komisi';
import {
  getAdminDashboardStats,
  getAllAgen,
  getAgenById,
  deleteAgen,
  updateAgenByAdmin,
  getLaporanAgen,
  getLaporanOmset,
  getLaporanPeringkat,
  getAgenByPeringkat,
  createProduk,
  getAllProduk,
  createReward,
  getAllReward,
  getInventoryReport,
  addInventoryStock
} from './handlers/admin';
import {
  checkRewardEligibility,
  getPerolehanRewardByAgenId,
  processRewardClaim,
  getAllPerolehanReward,
  updateRewardStatus,
  getLaporanReward
} from './handlers/reward';
import {
  sendWhatsappNotification,
  sendAgenRegistrationNotification,
  sendTransactionNotification,
  sendCommissionNotification,
  sendRewardNotification,
  sendPasswordResetNotification,
  sendStockAlert,
  sendBulkNotification
} from './handlers/notification';
import {
  createTripayPayment,
  verifyTripayCallback,
  getTripayPaymentMethods,
  createFlipTransfer,
  getFlipTransferStatus,
  getFlipBankList,
  validateBankAccount,
  processAutomaticCommissionPayment
} from './handlers/payment';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  auth: router({
    login: publicProcedure
      .input(loginSchema)
      .mutation(({ input }) => login(input)),
    getCurrentUser: publicProcedure
      .input(z.string())
      .query(({ input }) => getCurrentUser(input)),
    resetPassword: publicProcedure
      .input(z.string().email())
      .mutation(({ input }) => resetPassword(input)),
  }),

  // Pelanggan routes
  pelanggan: router({
    create: publicProcedure
      .input(createPelangganSchema)
      .mutation(({ input }) => createPelanggan(input)),
    getByUserId: publicProcedure
      .input(z.number())
      .query(({ input }) => getPelangganByUserId(input)),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        data: createPelangganSchema.partial()
      }))
      .mutation(({ input }) => updatePelanggan(input.id, input.data)),
    registerAsAgen: publicProcedure
      .input(z.object({
        pelangganId: z.number(),
        agenData: createAgenSchema
      }))
      .mutation(({ input }) => registerAgenFromPelanggan(input.pelangganId, input.agenData)),
  }),

  // Agen routes
  agen: router({
    create: publicProcedure
      .input(createAgenSchema)
      .mutation(({ input }) => createAgen(input)),
    getByUserId: publicProcedure
      .input(z.number())
      .query(({ input }) => getAgenByUserId(input)),
    getDashboardStats: publicProcedure
      .input(z.number())
      .query(({ input }) => getAgenDashboardStats(input)),
    getNetwork: publicProcedure
      .input(z.number())
      .query(({ input }) => getAgenNetwork(input)),
    getNetworkByLevel: publicProcedure
      .input(z.object({
        sponsorId: z.number(),
        level: z.number()
      }))
      .query(({ input }) => getNetworkByLevel(input.sponsorId, input.level)),
    upgrade: publicProcedure
      .input(z.object({
        agenId: z.number(),
        upgrade: createUpgradeSchema
      }))
      .mutation(({ input }) => upgradeAgen(input.agenId, input.upgrade)),
    repeatOrder: publicProcedure
      .input(z.object({
        agenId: z.number(),
        jumlahBox: z.number().int().positive()
      }))
      .mutation(({ input }) => processRepeatOrder(input.agenId, input.jumlahBox)),
    registerStokis: publicProcedure
      .input(z.object({
        agenId: z.number(),
        minimalBox: z.number().int().min(50)
      }))
      .mutation(({ input }) => registerStokis(input.agenId, input.minimalBox)),
    registerDistributor: publicProcedure
      .input(z.object({
        agenId: z.number(),
        minimalBox: z.number().int().min(500)
      }))
      .mutation(({ input }) => registerDistributor(input.agenId, input.minimalBox)),
    updateProfile: publicProcedure
      .input(z.object({
        id: z.number(),
        data: createAgenSchema.partial()
      }))
      .mutation(({ input }) => updateAgenProfile(input.id, input.data)),
  }),

  // Transaksi routes
  transaksi: router({
    create: publicProcedure
      .input(createTransaksiSchema)
      .mutation(({ input }) => createTransaksi(input)),
    getByUserId: publicProcedure
      .input(z.number())
      .query(({ input }) => getTransaksiByUserId(input)),
    getByAgenId: publicProcedure
      .input(z.number())
      .query(({ input }) => getTransaksiByAgenId(input)),
    getAll: publicProcedure
      .query(() => getAllTransaksi()),
    updateStatus: publicProcedure
      .input(z.object({
        id: z.number(),
        status: z.string()
      }))
      .mutation(({ input }) => updateTransaksiStatus(input.id, input.status)),
    processPayment: publicProcedure
      .input(z.object({
        transaksiId: z.number(),
        paymentData: z.any()
      }))
      .mutation(({ input }) => processPayment(input.transaksiId, input.paymentData)),
    trackOrder: publicProcedure
      .input(z.number())
      .query(({ input }) => trackOrder(input)),
  }),

  // Komisi routes
  komisi: router({
    calculate: publicProcedure
      .input(z.number())
      .mutation(({ input }) => calculateKomisi(input)),
    getByAgenId: publicProcedure
      .input(z.number())
      .query(({ input }) => getKomisiByAgenId(input)),
    createPenarikan: publicProcedure
      .input(createPenarikanKomisiSchema)
      .mutation(({ input }) => createPenarikanKomisi(input)),
    getPenarikanByAgenId: publicProcedure
      .input(z.number())
      .query(({ input }) => getPenarikanKomisiByAgenId(input)),
    processPenarikan: publicProcedure
      .input(z.number())
      .mutation(({ input }) => processPenarikanKomisi(input)),
    getPengaturan: publicProcedure
      .query(() => getPengaturanKomisi()),
    updatePengaturan: publicProcedure
      .input(z.object({
        id: z.number(),
        nominal: z.number()
      }))
      .mutation(({ input }) => updatePengaturanKomisi(input.id, input.nominal)),
    createPengaturan: publicProcedure
      .input(createPengaturanKomisiSchema)
      .mutation(({ input }) => createPengaturanKomisi(input)),
    getTotalStats: publicProcedure
      .query(() => getTotalKomisiStats()),
  }),

  // Admin routes
  admin: router({
    getDashboardStats: publicProcedure
      .query(() => getAdminDashboardStats()),
    getAllAgen: publicProcedure
      .query(() => getAllAgen()),
    getAgenById: publicProcedure
      .input(z.number())
      .query(({ input }) => getAgenById(input)),
    deleteAgen: publicProcedure
      .input(z.number())
      .mutation(({ input }) => deleteAgen(input)),
    updateAgen: publicProcedure
      .input(z.object({
        id: z.number(),
        data: z.any()
      }))
      .mutation(({ input }) => updateAgenByAdmin(input.id, input.data)),
    getLaporanAgen: publicProcedure
      .input(z.object({
        bulan: z.number().optional(),
        tahun: z.number().optional()
      }))
      .query(({ input }) => getLaporanAgen(input.bulan, input.tahun)),
    getLaporanOmset: publicProcedure
      .input(z.object({
        bulan: z.number().optional(),
        tahun: z.number().optional()
      }))
      .query(({ input }) => getLaporanOmset(input.bulan, input.tahun)),
    getLaporanPeringkat: publicProcedure
      .query(() => getLaporanPeringkat()),
    getAgenByPeringkat: publicProcedure
      .input(z.string())
      .query(({ input }) => getAgenByPeringkat(input)),
    getInventoryReport: publicProcedure
      .query(() => getInventoryReport()),
    addInventoryStock: publicProcedure
      .input(createInventorySchema)
      .mutation(({ input }) => addInventoryStock(input)),
  }),

  // Produk routes
  produk: router({
    create: publicProcedure
      .input(createProdukSchema)
      .mutation(({ input }) => createProduk(input)),
    getAll: publicProcedure
      .query(() => getAllProduk()),
  }),

  // Reward routes
  reward: router({
    checkEligibility: publicProcedure
      .input(z.number())
      .query(({ input }) => checkRewardEligibility(input)),
    getPerolehanByAgenId: publicProcedure
      .input(z.number())
      .query(({ input }) => getPerolehanRewardByAgenId(input)),
    processClaim: publicProcedure
      .input(z.object({
        agenId: z.number(),
        rewardId: z.number()
      }))
      .mutation(({ input }) => processRewardClaim(input.agenId, input.rewardId)),
    getAllPerolehan: publicProcedure
      .query(() => getAllPerolehanReward()),
    updateStatus: publicProcedure
      .input(z.object({
        perolehanId: z.number(),
        status: z.enum(['DITERIMA', 'PENDING', 'DITOLAK'])
      }))
      .mutation(({ input }) => updateRewardStatus(input.perolehanId, input.status)),
    getLaporanReward: publicProcedure
      .query(() => getLaporanReward()),
    create: publicProcedure
      .input(createRewardSchema)
      .mutation(({ input }) => createReward(input)),
    getAll: publicProcedure
      .query(() => getAllReward()),
  }),

  // Notification routes
  notification: router({
    sendWhatsapp: publicProcedure
      .input(z.object({
        phoneNumber: z.string(),
        message: z.string()
      }))
      .mutation(({ input }) => sendWhatsappNotification(input.phoneNumber, input.message)),
    sendAgenRegistration: publicProcedure
      .input(z.object({
        nama: z.string(),
        idAgen: z.string(),
        nomorHp: z.string(),
        paket: z.string()
      }))
      .mutation(({ input }) => sendAgenRegistrationNotification(input)),
    sendTransaction: publicProcedure
      .input(z.object({
        nama: z.string(),
        nomorHp: z.string(),
        transaksiId: z.number(),
        totalHarga: z.number(),
        status: z.string()
      }))
      .mutation(({ input }) => sendTransactionNotification(input)),
    sendCommission: publicProcedure
      .input(z.object({
        nama: z.string(),
        idAgen: z.string(),
        nomorHp: z.string(),
        nominal: z.number(),
        jenisKomisi: z.string()
      }))
      .mutation(({ input }) => sendCommissionNotification(input)),
    sendReward: publicProcedure
      .input(z.object({
        nama: z.string(),
        idAgen: z.string(),
        nomorHp: z.string(),
        namaReward: z.string(),
        peringkat: z.string()
      }))
      .mutation(({ input }) => sendRewardNotification(input)),
    sendPasswordReset: publicProcedure
      .input(z.object({
        nama: z.string(),
        email: z.string(),
        nomorHp: z.string(),
        resetToken: z.string()
      }))
      .mutation(({ input }) => sendPasswordResetNotification(input)),
    sendStockAlert: publicProcedure
      .input(z.object({
        nama: z.string(),
        idAgen: z.string(),
        nomorHp: z.string(),
        stokTersisa: z.number(),
        minimalStok: z.number()
      }))
      .mutation(({ input }) => sendStockAlert(input)),
    sendBulk: publicProcedure
      .input(z.object({
        recipients: z.array(z.object({
          nomorHp: z.string(),
          nama: z.string()
        })),
        message: z.string()
      }))
      .mutation(({ input }) => sendBulkNotification(input.recipients, input.message)),
  }),

  // Payment routes
  payment: router({
    createTripayPayment: publicProcedure
      .input(z.object({
        transaksiId: z.number(),
        amount: z.number(),
        customerName: z.string(),
        customerEmail: z.string(),
        customerPhone: z.string(),
        items: z.array(z.object({
          name: z.string(),
          price: z.number(),
          quantity: z.number()
        }))
      }))
      .mutation(({ input }) => createTripayPayment(input)),
    verifyTripayCallback: publicProcedure
      .input(z.object({
        merchant_ref: z.string(),
        status: z.string(),
        paid_amount: z.number(),
        signature: z.string()
      }))
      .mutation(({ input }) => verifyTripayCallback(input)),
    getTripayPaymentMethods: publicProcedure
      .query(() => getTripayPaymentMethods()),
    createFlipTransfer: publicProcedure
      .input(z.object({
        agenId: z.number(),
        accountNumber: z.string(),
        bankCode: z.string(),
        amount: z.number(),
        recipientName: z.string(),
        remark: z.string()
      }))
      .mutation(({ input }) => createFlipTransfer(input)),
    getFlipTransferStatus: publicProcedure
      .input(z.string())
      .query(({ input }) => getFlipTransferStatus(input)),
    getFlipBankList: publicProcedure
      .query(() => getFlipBankList()),
    validateBankAccount: publicProcedure
      .input(z.object({
        bankCode: z.string(),
        accountNumber: z.string()
      }))
      .query(({ input }) => validateBankAccount(input.bankCode, input.accountNumber)),
    processAutomaticCommission: publicProcedure
      .input(z.number())
      .mutation(({ input }) => processAutomaticCommissionPayment(input)),
  }),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`HERBAMART INDONESIA TRPC server listening at port: ${port}`);
  console.log(`🌟 Sehat, Sukses, Berkah! 🌟`);
}

start();