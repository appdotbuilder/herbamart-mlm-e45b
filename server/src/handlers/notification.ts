// Notification handlers for WABLAS integration (WhatsApp Business API)

export interface WhatsAppNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BulkNotificationResult {
  success: boolean;
  sent: number;
  failed: number;
  results: WhatsAppNotificationResult[];
}

export interface AgenRegistrationData {
  nama: string;
  idAgen: string;
  nomorHp: string;
  paket: string;
}

export interface TransactionData {
  nama: string;
  nomorHp: string;
  transaksiId: number;
  totalHarga: number;
  status: string;
}

export interface CommissionData {
  nama: string;
  idAgen: string;
  nomorHp: string;
  nominal: number;
  jenisKomisi: string;
}

export interface RewardData {
  nama: string;
  idAgen: string;
  nomorHp: string;
  namaReward: string;
  peringkat: string;
}

export interface PasswordResetData {
  nama: string;
  email: string;
  nomorHp: string;
  resetToken: string;
}

export interface StockAlertData {
  nama: string;
  idAgen: string;
  nomorHp: string;
  stokTersisa: number;
  minimalStok: number;
}

export interface BulkRecipient {
  nomorHp: string;
  nama: string;
}

// Format Indonesian phone number to international format
function formatPhoneNumber(phoneNumber: string): string {
  try {
    // Validate input is a string
    if (typeof phoneNumber !== 'string') {
      throw new Error('Phone number must be a string');
    }
    
    // Remove all non-numeric characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle Indonesian phone numbers
    if (cleaned.startsWith('08')) {
      // Convert 08xx to 628xx
      cleaned = '628' + cleaned.substring(2);
    } else if (cleaned.startsWith('8')) {
      // Convert 8xx to 628xx
      cleaned = '62' + cleaned;
    } else if (cleaned.startsWith('628')) {
      // Already in correct format
      return cleaned;
    } else if (cleaned.startsWith('62')) {
      // Remove leading 62 and add it back to ensure consistency
      cleaned = '62' + cleaned.substring(2);
    }
    
    return cleaned;
  } catch (error) {
    console.error('Phone number formatting error:', error);
    return phoneNumber;
  }
}

// Validate phone number format
function isValidPhoneNumber(phoneNumber: string): boolean {
  const formatted = formatPhoneNumber(phoneNumber);
  // Indonesian phone numbers should be 10-13 digits after 62
  return /^628\d{8,11}$/.test(formatted);
}

export async function sendWhatsappNotification(phoneNumber: string, message: string): Promise<WhatsAppNotificationResult> {
  try {
    // Validate input types and values
    if (typeof phoneNumber !== 'string' || typeof message !== 'string') {
      return {
        success: false,
        error: 'Phone number and message must be strings'
      };
    }

    if (!phoneNumber || !message) {
      return {
        success: false,
        error: 'Phone number and message are required'
      };
    }

    // Format and validate phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (!isValidPhoneNumber(formattedPhone)) {
      return {
        success: false,
        error: 'Invalid Indonesian phone number format'
      };
    }

    // In a real implementation, this would call the WABLAS API
    // For now, we simulate the API call with a delay and validation
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate API response
    const messageId = `WA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      success: true,
      messageId
    };
  } catch (error) {
    console.error('WhatsApp notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function sendAgenRegistrationNotification(agenData: AgenRegistrationData): Promise<WhatsAppNotificationResult> {
  try {
    // Validate required fields
    if (!agenData.nama || !agenData.idAgen || !agenData.nomorHp || !agenData.paket) {
      return {
        success: false,
        error: 'Missing required agent registration data'
      };
    }

    const message = `🎉 Selamat! Pendaftaran Agen HERBAMART INDONESIA berhasil.

👤 Nama: ${agenData.nama}
🆔 ID Agen: ${agenData.idAgen}
📦 Paket: ${agenData.paket}

Selamat bergabung di keluarga besar HERBAMART INDONESIA!

✨ Sehat, Sukses, Berkah! ✨`;

    return await sendWhatsappNotification(agenData.nomorHp, message);
  } catch (error) {
    console.error('Agent registration notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send agent registration notification'
    };
  }
}

export async function sendTransactionNotification(userData: TransactionData): Promise<WhatsAppNotificationResult> {
  try {
    // Validate required fields
    if (!userData.nama || !userData.nomorHp || !userData.transaksiId || userData.totalHarga === undefined || !userData.status) {
      return {
        success: false,
        error: 'Missing required transaction data'
      };
    }

    const message = `📦 Update Transaksi HERBAMART INDONESIA

👤 Nama: ${userData.nama}
🆔 ID Transaksi: #${userData.transaksiId}
💰 Total: Rp ${userData.totalHarga.toLocaleString('id-ID')}
📋 Status: ${userData.status}

Terima kasih atas kepercayaan Anda! 🙏`;

    return await sendWhatsappNotification(userData.nomorHp, message);
  } catch (error) {
    console.error('Transaction notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send transaction notification'
    };
  }
}

export async function sendCommissionNotification(agenData: CommissionData): Promise<WhatsAppNotificationResult> {
  try {
    // Validate required fields
    if (!agenData.nama || !agenData.idAgen || !agenData.nomorHp || agenData.nominal === undefined || !agenData.jenisKomisi) {
      return {
        success: false,
        error: 'Missing required commission data'
      };
    }

    const message = `💰 Komisi Baru - HERBAMART INDONESIA

👤 Agen: ${agenData.nama} (${agenData.idAgen})
📊 Jenis Komisi: ${agenData.jenisKomisi}
💵 Nominal: Rp ${agenData.nominal.toLocaleString('id-ID')}

🎉 Selamat! Komisi Anda bertambah. Terus semangat! 💪`;

    return await sendWhatsappNotification(agenData.nomorHp, message);
  } catch (error) {
    console.error('Commission notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send commission notification'
    };
  }
}

export async function sendRewardNotification(agenData: RewardData): Promise<WhatsAppNotificationResult> {
  try {
    // Validate required fields
    if (!agenData.nama || !agenData.idAgen || !agenData.nomorHp || !agenData.namaReward || !agenData.peringkat) {
      return {
        success: false,
        error: 'Missing required reward data'
      };
    }

    const message = `🎉 REWARD ACHIEVEMENT - HERBAMART INDONESIA

🌟 Selamat ${agenData.nama} (${agenData.idAgen})!

Anda telah mencapai peringkat ${agenData.peringkat} dan berhak mendapatkan:
✨ ${agenData.namaReward}

Tim kami akan menghubungi Anda segera untuk pengaturan reward.

🏆 Sehat, Sukses, Berkah! 🌟`;

    return await sendWhatsappNotification(agenData.nomorHp, message);
  } catch (error) {
    console.error('Reward notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send reward notification'
    };
  }
}

export async function sendPasswordResetNotification(userData: PasswordResetData): Promise<WhatsAppNotificationResult> {
  try {
    // Validate required fields
    if (!userData.nama || !userData.email || !userData.nomorHp || !userData.resetToken) {
      return {
        success: false,
        error: 'Missing required password reset data'
      };
    }

    const message = `🔐 Reset Password - HERBAMART INDONESIA

👋 Halo ${userData.nama},

Anda telah meminta reset password untuk akun: ${userData.email}

🔗 Klik link berikut untuk mengatur ulang password:
https://herbamart.id/reset-password?token=${userData.resetToken}

⏰ Link akan kadaluarsa dalam 1 jam.

❗ Jika Anda tidak meminta reset password, abaikan pesan ini.`;

    return await sendWhatsappNotification(userData.nomorHp, message);
  } catch (error) {
    console.error('Password reset notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send password reset notification'
    };
  }
}

export async function sendStockAlert(stokisData: StockAlertData): Promise<WhatsAppNotificationResult> {
  try {
    // Validate required fields
    if (!stokisData.nama || !stokisData.idAgen || !stokisData.nomorHp || 
        stokisData.stokTersisa === undefined || stokisData.minimalStok === undefined) {
      return {
        success: false,
        error: 'Missing required stock alert data'
      };
    }

    const message = `⚠️ PERINGATAN STOK - HERBAMART INDONESIA

👤 ${stokisData.nama} (${stokisData.idAgen})

📦 Stok Anda tersisa: ${stokisData.stokTersisa} box
📊 Minimal stok: ${stokisData.minimalStok} box

🚨 Segera lakukan pemesanan stok untuk menghindari kehabisan!

📞 Hubungi tim kami untuk pemesanan stok.`;

    return await sendWhatsappNotification(stokisData.nomorHp, message);
  } catch (error) {
    console.error('Stock alert notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send stock alert notification'
    };
  }
}

export async function sendBulkNotification(recipients: BulkRecipient[], message: string): Promise<BulkNotificationResult> {
  try {
    // Validate input
    if (!recipients || recipients.length === 0) {
      return {
        success: false,
        sent: 0,
        failed: 0,
        results: []
      };
    }

    if (!message) {
      return {
        success: false,
        sent: 0,
        failed: recipients.length,
        results: recipients.map(() => ({
          success: false,
          error: 'Message is required'
        }))
      };
    }

    let sent = 0;
    let failed = 0;
    const results: WhatsAppNotificationResult[] = [];
    
    // Process recipients in batches to avoid overwhelming the API
    for (const recipient of recipients) {
      try {
        // Validate recipient data
        if (!recipient.nomorHp || !recipient.nama) {
          results.push({
            success: false,
            error: 'Missing recipient phone number or name'
          });
          failed++;
          continue;
        }

        // Replace placeholders in message
        const personalizedMessage = message.replace(/{nama}/g, recipient.nama);
        const result = await sendWhatsappNotification(recipient.nomorHp, personalizedMessage);
        
        results.push(result);
        
        if (result.success) {
          sent++;
        } else {
          failed++;
        }

        // Add small delay between messages to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`Bulk notification error for ${recipient.nomorHp}:`, error);
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        failed++;
      }
    }
    
    return {
      success: true,
      sent,
      failed,
      results
    };
  } catch (error) {
    console.error('Bulk notification error:', error);
    return {
      success: false,
      sent: 0,
      failed: recipients?.length || 0,
      results: []
    };
  }
}