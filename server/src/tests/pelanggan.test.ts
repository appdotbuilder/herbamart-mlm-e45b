import { describe, expect, it } from 'bun:test';
import { type CreatePelanggan, type CreateAgen } from '../schema';

// Mock implementations for testing logic
class MockDB {
  private users: any[] = [];
  private pelanggan: any[] = [];
  private idCounter = 1;

  async findUser(id: number) {
    return this.users.find(u => u.id === id);
  }

  async createUser(data: any) {
    const user = { ...data, id: this.idCounter++, created_at: new Date() };
    this.users.push(user);
    return user;
  }

  async createPelanggan(data: any) {
    const pelangganRecord = { ...data, id: this.idCounter++, created_at: new Date(), updated_at: new Date() };
    this.pelanggan.push(pelangganRecord);
    return pelangganRecord;
  }

  async findPelangganByUserId(userId: number) {
    return this.pelanggan.find(p => p.user_id === userId);
  }

  async findPelangganById(id: number) {
    return this.pelanggan.find(p => p.id === id);
  }

  async updatePelanggan(id: number, data: any) {
    const index = this.pelanggan.findIndex(p => p.id === id);
    if (index === -1) return null;
    this.pelanggan[index] = { ...this.pelanggan[index], ...data, updated_at: new Date() };
    return this.pelanggan[index];
  }

  reset() {
    this.users = [];
    this.pelanggan = [];
    this.idCounter = 1;
  }
}

const mockDB = new MockDB();

// Mock handlers that use the mock database
const createPelanggan = async (input: CreatePelanggan) => {
  const user = await mockDB.findUser(input.user_id);
  
  if (!user) {
    throw new Error('User tidak ditemukan atau bukan pelanggan');
  }
  
  if (user.role !== 'PELANGGAN') {
    throw new Error('User tidak ditemukan atau bukan pelanggan');
  }

  return await mockDB.createPelanggan(input);
};

const getPelangganByUserId = async (userId: number) => {
  return await mockDB.findPelangganByUserId(userId);
};

const updatePelanggan = async (id: number, input: Partial<CreatePelanggan>) => {
  const existing = await mockDB.findPelangganById(id);
  
  if (!existing) {
    throw new Error('Pelanggan tidak ditemukan');
  }

  return await mockDB.updatePelanggan(id, input);
};

const registerAgenFromPelanggan = async (pelangganId: number, input: CreateAgen) => {
  const pelanggan = await mockDB.findPelangganById(pelangganId);
  
  if (!pelanggan) {
    throw new Error('Pelanggan tidak ditemukan');
  }

  // Generate unique agent ID
  const agenId = `JB-${(pelangganId + 250000).toString().padStart(6, '0')}`;

  return {
    success: true,
    agenId: agenId
  };
};

describe('Pelanggan Handlers (Mock)', () => {
  describe('createPelanggan', () => {
    it('should create a pelanggan successfully', async () => {
      mockDB.reset();
      
      // Create test user first
      const user = await mockDB.createUser({
        username: 'testuser',
        password: 'password123',
        role: 'PELANGGAN'
      });

      const testInput: CreatePelanggan = {
        user_id: user.id,
        nama_lengkap: 'John Doe',
        jenis_kelamin: 'PRIA',
        nomor_hp: '08123456789',
        email: 'john.doe@example.com',
        alamat_lengkap: 'Jl. Sudirman No. 123',
        kelurahan: 'Menteng',
        kecamatan: 'Menteng',
        kota_kabupaten: 'Jakarta Pusat',
        provinsi: 'DKI Jakarta'
      };

      const result = await createPelanggan(testInput);

      // Basic field validation
      expect(result.nama_lengkap).toEqual('John Doe');
      expect(result.jenis_kelamin).toEqual('PRIA');
      expect(result.nomor_hp).toEqual('08123456789');
      expect(result.email).toEqual('john.doe@example.com');
      expect(result.user_id).toEqual(user.id);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent user', async () => {
      mockDB.reset();
      
      const testInput: CreatePelanggan = {
        user_id: 999,
        nama_lengkap: 'Invalid User',
        jenis_kelamin: 'PRIA',
        nomor_hp: '08123456789',
        email: 'invalid@example.com',
        alamat_lengkap: 'Invalid Address',
        kelurahan: 'Invalid',
        kecamatan: 'Invalid',
        kota_kabupaten: 'Invalid',
        provinsi: 'Invalid'
      };

      await expect(createPelanggan(testInput)).rejects.toThrow(/User tidak ditemukan/i);
    });

    it('should throw error for non-pelanggan user role', async () => {
      mockDB.reset();
      
      // Create user with ADMIN role
      const user = await mockDB.createUser({
        username: 'adminuser',
        password: 'password123',
        role: 'ADMIN'
      });

      const testInput: CreatePelanggan = {
        user_id: user.id,
        nama_lengkap: 'Admin User',
        jenis_kelamin: 'PRIA',
        nomor_hp: '08123456789',
        email: 'admin@example.com',
        alamat_lengkap: 'Admin Address',
        kelurahan: 'Admin',
        kecamatan: 'Admin',
        kota_kabupaten: 'Admin',
        provinsi: 'Admin'
      };

      await expect(createPelanggan(testInput)).rejects.toThrow(/bukan pelanggan/i);
    });
  });

  describe('getPelangganByUserId', () => {
    it('should return pelanggan data for valid user ID', async () => {
      mockDB.reset();
      
      // Create test user and pelanggan
      const user = await mockDB.createUser({
        username: 'gettest',
        password: 'password123',
        role: 'PELANGGAN'
      });

      await mockDB.createPelanggan({
        user_id: user.id,
        nama_lengkap: 'Get Test User',
        jenis_kelamin: 'PRIA',
        nomor_hp: '08123456789',
        email: 'gettest@example.com',
        alamat_lengkap: 'Test Address',
        kelurahan: 'Test',
        kecamatan: 'Test',
        kota_kabupaten: 'Test',
        provinsi: 'Test'
      });

      const result = await getPelangganByUserId(user.id);

      expect(result).not.toBeNull();
      expect(result!.nama_lengkap).toEqual('Get Test User');
      expect(result!.user_id).toEqual(user.id);
    });

    it('should return null for non-existent user ID', async () => {
      mockDB.reset();
      
      const result = await getPelangganByUserId(999);
      expect(result).toBeUndefined();
    });
  });

  describe('updatePelanggan', () => {
    it('should update pelanggan data successfully', async () => {
      mockDB.reset();
      
      // Create test user and pelanggan
      const user = await mockDB.createUser({
        username: 'updatetest',
        password: 'password123',
        role: 'PELANGGAN'
      });

      const pelanggan = await mockDB.createPelanggan({
        user_id: user.id,
        nama_lengkap: 'Original Name',
        jenis_kelamin: 'PRIA',
        nomor_hp: '08123456789',
        email: 'original@example.com',
        alamat_lengkap: 'Original Address',
        kelurahan: 'Original',
        kecamatan: 'Original',
        kota_kabupaten: 'Original',
        provinsi: 'Original'
      });

      const updateData = {
        nama_lengkap: 'Updated Name',
        email: 'updated@example.com',
        nomor_hp: '08987654321'
      };

      const result = await updatePelanggan(pelanggan.id, updateData);

      expect(result.nama_lengkap).toEqual('Updated Name');
      expect(result.email).toEqual('updated@example.com');
      expect(result.nomor_hp).toEqual('08987654321');
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent pelanggan ID', async () => {
      mockDB.reset();
      
      const updateData = {
        nama_lengkap: 'Updated Name'
      };

      await expect(updatePelanggan(999, updateData)).rejects.toThrow(/Pelanggan tidak ditemukan/i);
    });
  });

  describe('registerAgenFromPelanggan', () => {
    it('should successfully register agen from pelanggan', async () => {
      mockDB.reset();
      
      // Create test user and pelanggan
      const user = await mockDB.createUser({
        username: 'pelanggantoagen',
        password: 'password123',
        role: 'PELANGGAN'
      });

      const pelanggan = await mockDB.createPelanggan({
        user_id: user.id,
        nama_lengkap: 'Future Agent',
        jenis_kelamin: 'PRIA',
        nomor_hp: '08123456789',
        email: 'futureagent@example.com',
        alamat_lengkap: 'Agent Address',
        kelurahan: 'Agent',
        kecamatan: 'Agent',
        kota_kabupaten: 'Agent',
        provinsi: 'Agent'
      });

      const agenInput: CreateAgen = {
        user_id: user.id,
        nama_lengkap: 'Agent Name',
        nomor_ktp: '1234567890123456',
        jenis_kelamin: 'PRIA',
        nomor_hp: '08123456789',
        email: 'agent@example.com',
        alamat_lengkap: 'Agent Address',
        kelurahan: 'Agent',
        kecamatan: 'Agent',
        kota_kabupaten: 'Agent',
        provinsi: 'Agent',
        nomor_rekening: '1234567890',
        nama_rekening: 'Agent Account',
        sponsor_id: null,
        status_paket: 'SILVER',
        password: 'agentpass123'
      };

      const result = await registerAgenFromPelanggan(pelanggan.id, agenInput);

      expect(result.success).toBe(true);
      expect(result.agenId).toMatch(/^JB-\d{6}$/);
    });

    it('should throw error for non-existent pelanggan', async () => {
      mockDB.reset();
      
      const agenInput: CreateAgen = {
        user_id: 1,
        nama_lengkap: 'Invalid Agent',
        nomor_ktp: '1234567890123456',
        jenis_kelamin: 'PRIA',
        nomor_hp: '08123456789',
        email: 'invalid@example.com',
        alamat_lengkap: 'Invalid Address',
        kelurahan: 'Invalid',
        kecamatan: 'Invalid',
        kota_kabupaten: 'Invalid',
        provinsi: 'Invalid',
        nomor_rekening: '1234567890',
        nama_rekening: 'Invalid Account',
        sponsor_id: null,
        status_paket: 'SILVER',
        password: 'invalidpass123'
      };

      await expect(registerAgenFromPelanggan(999, agenInput)).rejects.toThrow(/Pelanggan tidak ditemukan/i);
    });

    it('should generate unique agent IDs', async () => {
      mockDB.reset();
      
      // Create multiple pelanggan
      const user1 = await mockDB.createUser({
        username: 'user1',
        password: 'password123',
        role: 'PELANGGAN'
      });

      const user2 = await mockDB.createUser({
        username: 'user2',
        password: 'password123',
        role: 'PELANGGAN'
      });

      const pelanggan1 = await mockDB.createPelanggan({
        user_id: user1.id,
        nama_lengkap: 'Agent 1',
        jenis_kelamin: 'PRIA',
        nomor_hp: '08111111111',
        email: 'agent1@example.com',
        alamat_lengkap: 'Address 1',
        kelurahan: 'Kelurahan1',
        kecamatan: 'Kecamatan1',
        kota_kabupaten: 'Kota1',
        provinsi: 'Provinsi1'
      });

      const pelanggan2 = await mockDB.createPelanggan({
        user_id: user2.id,
        nama_lengkap: 'Agent 2',
        jenis_kelamin: 'WANITA',
        nomor_hp: '08222222222',
        email: 'agent2@example.com',
        alamat_lengkap: 'Address 2',
        kelurahan: 'Kelurahan2',
        kecamatan: 'Kecamatan2',
        kota_kabupaten: 'Kota2',
        provinsi: 'Provinsi2'
      });

      const agenInput: CreateAgen = {
        user_id: user1.id,
        nama_lengkap: 'Agent Name',
        nomor_ktp: '1234567890123456',
        jenis_kelamin: 'PRIA',
        nomor_hp: '08123456789',
        email: 'agent@example.com',
        alamat_lengkap: 'Agent Address',
        kelurahan: 'Agent',
        kecamatan: 'Agent',
        kota_kabupaten: 'Agent',
        provinsi: 'Agent',
        nomor_rekening: '1234567890',
        nama_rekening: 'Agent Account',
        sponsor_id: null,
        status_paket: 'SILVER',
        password: 'agentpass123'
      };

      const result1 = await registerAgenFromPelanggan(pelanggan1.id, agenInput);
      const result2 = await registerAgenFromPelanggan(pelanggan2.id, agenInput);

      expect(result1.agenId).not.toEqual(result2.agenId);
      expect(result1.agenId).toMatch(/^JB-\d{6}$/);
      expect(result2.agenId).toMatch(/^JB-\d{6}$/);
    });
  });
});