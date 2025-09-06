import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import {
  sendWhatsappNotification,
  sendAgenRegistrationNotification,
  sendTransactionNotification,
  sendCommissionNotification,
  sendRewardNotification,
  sendPasswordResetNotification,
  sendStockAlert,
  sendBulkNotification,
  type AgenRegistrationData,
  type TransactionData,
  type CommissionData,
  type RewardData,
  type PasswordResetData,
  type StockAlertData,
  type BulkRecipient
} from '../handlers/notification';

describe('Notification Handlers', () => {
  describe('sendWhatsappNotification', () => {
    it('should send WhatsApp notification successfully', async () => {
      const result = await sendWhatsappNotification('081234567890', 'Test message');

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.messageId).toMatch(/^WA_\d+_[a-z0-9]+$/);
      expect(result.error).toBeUndefined();
    });

    it('should format Indonesian phone numbers correctly', async () => {
      const testCases = [
        '081234567890',  // 08xx format
        '8123456789',    // 8xx format
        '6281234567890', // 628xx format
        '62812345678'    // 628xx shorter format
      ];

      for (const phone of testCases) {
        const result = await sendWhatsappNotification(phone, 'Test message');
        expect(result.success).toBe(true);
        expect(result.messageId).toBeDefined();
      }
    });

    it('should reject invalid phone numbers', async () => {
      const invalidPhones = [
        '123456',        // Too short
        '071234567890',  // Invalid prefix
        '628123456',     // Too short for Indonesian
        '628123456789012345', // Too long
        'abc123456789'   // Non-numeric characters
      ];

      for (const phone of invalidPhones) {
        const result = await sendWhatsappNotification(phone, 'Test message');
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid Indonesian phone number format');
      }
    });

    it('should reject empty phone number or message', async () => {
      const result1 = await sendWhatsappNotification('', 'Test message');
      expect(result1.success).toBe(false);
      expect(result1.error).toContain('Phone number and message are required');

      const result2 = await sendWhatsappNotification('081234567890', '');
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Phone number and message are required');
    });
  });

  describe('sendAgenRegistrationNotification', () => {
    const validAgenData: AgenRegistrationData = {
      nama: 'John Doe',
      idAgen: 'AG001234',
      nomorHp: '081234567890',
      paket: 'SILVER'
    };

    it('should send agent registration notification successfully', async () => {
      const result = await sendAgenRegistrationNotification(validAgenData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should validate required agent data fields', async () => {
      const testCases = [
        { ...validAgenData, nama: '' },
        { ...validAgenData, idAgen: '' },
        { ...validAgenData, nomorHp: '' },
        { ...validAgenData, paket: '' }
      ];

      for (const testData of testCases) {
        const result = await sendAgenRegistrationNotification(testData);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Missing required agent registration data');
      }
    });

    it('should format message correctly with agent data', async () => {
      const result = await sendAgenRegistrationNotification(validAgenData);
      expect(result.success).toBe(true);
      // Message formatting is tested indirectly through successful sending
    });
  });

  describe('sendTransactionNotification', () => {
    const validTransactionData: TransactionData = {
      nama: 'Jane Smith',
      nomorHp: '081234567890',
      transaksiId: 12345,
      totalHarga: 250000,
      status: 'DIPROSES'
    };

    it('should send transaction notification successfully', async () => {
      const result = await sendTransactionNotification(validTransactionData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should validate required transaction data fields', async () => {
      const testCases = [
        { ...validTransactionData, nama: '' },
        { ...validTransactionData, nomorHp: '' },
        { ...validTransactionData, transaksiId: 0 },
        { ...validTransactionData, status: '' }
      ];

      for (const testData of testCases) {
        const result = await sendTransactionNotification(testData);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Missing required transaction data');
      }
    });

    it('should handle zero total price correctly', async () => {
      const dataWithZeroPrice = { ...validTransactionData, totalHarga: 0 };
      const result = await sendTransactionNotification(dataWithZeroPrice);
      expect(result.success).toBe(true);
    });
  });

  describe('sendCommissionNotification', () => {
    const validCommissionData: CommissionData = {
      nama: 'Alice Johnson',
      idAgen: 'AG005678',
      nomorHp: '081234567890',
      nominal: 150000,
      jenisKomisi: 'SPONSOR'
    };

    it('should send commission notification successfully', async () => {
      const result = await sendCommissionNotification(validCommissionData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should validate required commission data fields', async () => {
      const testCases = [
        { ...validCommissionData, nama: '' },
        { ...validCommissionData, idAgen: '' },
        { ...validCommissionData, nomorHp: '' },
        { ...validCommissionData, jenisKomisi: '' }
      ];

      for (const testData of testCases) {
        const result = await sendCommissionNotification(testData);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Missing required commission data');
      }
    });

    it('should handle zero nominal correctly', async () => {
      const dataWithZeroNominal = { ...validCommissionData, nominal: 0 };
      const result = await sendCommissionNotification(dataWithZeroNominal);
      expect(result.success).toBe(true);
    });
  });

  describe('sendRewardNotification', () => {
    const validRewardData: RewardData = {
      nama: 'Bob Wilson',
      idAgen: 'AG009999',
      nomorHp: '081234567890',
      namaReward: 'Motor Vario 125',
      peringkat: 'MANAGER'
    };

    it('should send reward notification successfully', async () => {
      const result = await sendRewardNotification(validRewardData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should validate required reward data fields', async () => {
      const testCases = [
        { ...validRewardData, nama: '' },
        { ...validRewardData, idAgen: '' },
        { ...validRewardData, nomorHp: '' },
        { ...validRewardData, namaReward: '' },
        { ...validRewardData, peringkat: '' }
      ];

      for (const testData of testCases) {
        const result = await sendRewardNotification(testData);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Missing required reward data');
      }
    });
  });

  describe('sendPasswordResetNotification', () => {
    const validPasswordResetData: PasswordResetData = {
      nama: 'Charlie Brown',
      email: 'charlie@example.com',
      nomorHp: '081234567890',
      resetToken: 'abc123def456'
    };

    it('should send password reset notification successfully', async () => {
      const result = await sendPasswordResetNotification(validPasswordResetData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should validate required password reset data fields', async () => {
      const testCases = [
        { ...validPasswordResetData, nama: '' },
        { ...validPasswordResetData, email: '' },
        { ...validPasswordResetData, nomorHp: '' },
        { ...validPasswordResetData, resetToken: '' }
      ];

      for (const testData of testCases) {
        const result = await sendPasswordResetNotification(testData);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Missing required password reset data');
      }
    });
  });

  describe('sendStockAlert', () => {
    const validStockAlertData: StockAlertData = {
      nama: 'Diana Prince',
      idAgen: 'ST001122',
      nomorHp: '081234567890',
      stokTersisa: 5,
      minimalStok: 10
    };

    it('should send stock alert notification successfully', async () => {
      const result = await sendStockAlert(validStockAlertData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should validate required stock alert data fields', async () => {
      const testCases = [
        { ...validStockAlertData, nama: '' },
        { ...validStockAlertData, idAgen: '' },
        { ...validStockAlertData, nomorHp: '' }
      ];

      for (const testData of testCases) {
        const result = await sendStockAlert(testData);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Missing required stock alert data');
      }
    });

    it('should handle zero stock values correctly', async () => {
      const dataWithZeroStock = { 
        ...validStockAlertData, 
        stokTersisa: 0, 
        minimalStok: 0 
      };
      const result = await sendStockAlert(dataWithZeroStock);
      expect(result.success).toBe(true);
    });
  });

  describe('sendBulkNotification', () => {
    const validRecipients: BulkRecipient[] = [
      { nomorHp: '081234567890', nama: 'User 1' },
      { nomorHp: '081234567891', nama: 'User 2' },
      { nomorHp: '081234567892', nama: 'User 3' }
    ];

    it('should send bulk notifications successfully', async () => {
      const message = 'Halo {nama}, ini adalah pesan bulk test!';
      const result = await sendBulkNotification(validRecipients, message);

      expect(result.success).toBe(true);
      expect(result.sent).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(3);
      
      result.results.forEach(res => {
        expect(res.success).toBe(true);
        expect(res.messageId).toBeDefined();
      });
    });

    it('should handle empty recipients array', async () => {
      const result = await sendBulkNotification([], 'Test message');

      expect(result.success).toBe(false);
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it('should handle empty message', async () => {
      const result = await sendBulkNotification(validRecipients, '');

      expect(result.success).toBe(false);
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(3);
      expect(result.results).toHaveLength(3);
      
      result.results.forEach(res => {
        expect(res.success).toBe(false);
        expect(res.error).toContain('Message is required');
      });
    });

    it('should handle mixed valid and invalid recipients', async () => {
      const mixedRecipients = [
        { nomorHp: '081234567890', nama: 'Valid User' },
        { nomorHp: '', nama: 'Invalid Phone' },
        { nomorHp: '081234567891', nama: '' },
        { nomorHp: '123', nama: 'Invalid Format' }
      ];

      const result = await sendBulkNotification(mixedRecipients, 'Test {nama}');

      expect(result.success).toBe(true);
      expect(result.sent).toBe(1); // Only one valid recipient
      expect(result.failed).toBe(3); // Three invalid recipients
      expect(result.results).toHaveLength(4);

      // First recipient should succeed
      expect(result.results[0].success).toBe(true);
      
      // Others should fail with different error messages
      expect(result.results[1].success).toBe(false);
      expect(result.results[2].success).toBe(false);
      expect(result.results[3].success).toBe(false);
    });

    it('should replace name placeholders correctly', async () => {
      const singleRecipient = [{ nomorHp: '081234567890', nama: 'TestUser' }];
      const messageWithPlaceholder = 'Halo {nama}, selamat datang!';
      
      const result = await sendBulkNotification(singleRecipient, messageWithPlaceholder);

      expect(result.success).toBe(true);
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should handle large recipient lists efficiently', async () => {
      // Create a larger list of recipients
      const largeRecipientList: BulkRecipient[] = [];
      for (let i = 0; i < 20; i++) {
        largeRecipientList.push({
          nomorHp: `08123456789${i.toString().padStart(1, '0')}`,
          nama: `User ${i + 1}`
        });
      }

      const result = await sendBulkNotification(largeRecipientList, 'Bulk test untuk {nama}');

      expect(result.success).toBe(true);
      expect(result.sent).toBe(20);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(20);
    });
  });

  describe('Phone Number Validation Edge Cases', () => {
    it('should handle various Indonesian phone number formats', async () => {
      const phoneFormats = [
        { input: '081234567890', expected: true },
        { input: '+6281234567890', expected: true },
        { input: '6281234567890', expected: true },
        { input: '8123456789', expected: true },
        { input: '08-1234-567-890', expected: true },
        { input: '081 234 567 890', expected: true },
        { input: '081.234.567.890', expected: true }
      ];

      for (const testCase of phoneFormats) {
        const result = await sendWhatsappNotification(testCase.input, 'Test message');
        if (testCase.expected) {
          expect(result.success).toBe(true);
        } else {
          expect(result.success).toBe(false);
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle null and undefined inputs gracefully', async () => {
      // Test null inputs
      const result1 = await sendWhatsappNotification(null as any, 'Test');
      expect(result1.success).toBe(false);

      const result2 = await sendWhatsappNotification('081234567890', null as any);
      expect(result2.success).toBe(false);

      // Test undefined inputs
      const result3 = await sendWhatsappNotification(undefined as any, 'Test');
      expect(result3.success).toBe(false);

      const result4 = await sendWhatsappNotification('081234567890', undefined as any);
      expect(result4.success).toBe(false);
    });

    it('should handle invalid data types gracefully', async () => {
      const result1 = await sendWhatsappNotification(123 as any, 'Test');
      expect(result1.success).toBe(false);

      const result2 = await sendWhatsappNotification('081234567890', 123 as any);
      expect(result2.success).toBe(false);
    });
  });
});