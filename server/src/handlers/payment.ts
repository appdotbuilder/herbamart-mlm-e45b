import { db } from '../db';
import { transaksiTable, penarikanKomisiTable, agenTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Payment handlers for TRIPAY integration and Flip Bisnis for commission transfers

export interface TripayPaymentRequest {
    merchant_ref: string;
    amount: number;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    order_items: Array<{
        name: string;
        price: number;
        quantity: number;
    }>;
    return_url: string;
    expired_time: number;
    signature: string;
}

export interface FlipTransferRequest {
    account_number: string;
    bank_code: string;
    amount: number;
    remark: string;
    recipient_name: string;
    recipient_city?: string;
    beneficiary_email?: string;
}

export async function createTripayPayment(paymentData: {
    transaksiId: number;
    amount: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    items: Array<{ name: string; price: number; quantity: number }>;
}): Promise<{
    success: boolean;
    checkoutUrl?: string;
    reference?: string;
    paymentCode?: string;
    expiredTime?: string;
}> {
    try {
        // Validate transaction exists
        const transaksi = await db.select()
            .from(transaksiTable)
            .where(eq(transaksiTable.id, paymentData.transaksiId))
            .execute();

        if (transaksi.length === 0) {
            return {
                success: false
            };
        }

        const merchantRef = `HERBA_${paymentData.transaksiId}_${Date.now()}`;
        const expiredTime = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours
        
        // Generate signature (mock implementation)
        const signatureData = `${merchantRef}${paymentData.amount}${paymentData.customerName}`;
        const signature = crypto.createHmac('sha256', 'mock_private_key')
            .update(signatureData)
            .digest('hex');

        // Mock TRIPAY API call
        const tripayResponse = await mockTripayAPI({
            merchant_ref: merchantRef,
            amount: paymentData.amount,
            customer_name: paymentData.customerName,
            customer_email: paymentData.customerEmail,
            customer_phone: paymentData.customerPhone,
            order_items: paymentData.items,
            return_url: `${process.env['APP_URL'] || 'http://localhost:3000'}/payment/return`,
            expired_time: expiredTime,
            signature: signature
        });

        if (tripayResponse.success) {
            // Update transaction with payment reference
            await db.update(transaksiTable)
                .set({ 
                    payment_reference: merchantRef,
                    updated_at: new Date()
                })
                .where(eq(transaksiTable.id, paymentData.transaksiId))
                .execute();
        }

        return tripayResponse;
    } catch (error) {
        console.error('TRIPAY payment creation failed:', error);
        return {
            success: false
        };
    }
}

export async function verifyTripayCallback(callbackData: {
    merchant_ref: string;
    status: string;
    paid_amount: number;
    signature: string;
}): Promise<{
    isValid: boolean;
    transaksiId?: number;
    status?: string;
}> {
    try {
        // Validate signature (mock implementation)
        const expectedSignature = crypto.createHmac('sha256', 'mock_private_key')
            .update(`${callbackData.merchant_ref}${callbackData.status}${callbackData.paid_amount}`)
            .digest('hex');

        if (callbackData.signature !== expectedSignature) {
            return {
                isValid: false
            };
        }

        // Extract transaction ID from merchant_ref format: HERBA_{transaksiId}_{timestamp}
        const refParts = callbackData.merchant_ref.split('_');
        if (refParts.length !== 3 || refParts[0] !== 'HERBA') {
            return {
                isValid: false
            };
        }

        const transaksiId = parseInt(refParts[1]);
        if (isNaN(transaksiId)) {
            return {
                isValid: false
            };
        }

        // Verify transaction exists and reference matches
        const transaksi = await db.select()
            .from(transaksiTable)
            .where(eq(transaksiTable.id, transaksiId))
            .execute();

        if (transaksi.length === 0 || transaksi[0].payment_reference !== callbackData.merchant_ref) {
            return {
                isValid: false
            };
        }

        // Update transaction status based on payment status
        let newStatus = transaksi[0].status;
        if (callbackData.status === 'PAID') {
            newStatus = 'DIKEMAS';
        } else if (callbackData.status === 'FAILED' || callbackData.status === 'EXPIRED') {
            newStatus = 'DIPROSES';
        }

        await db.update(transaksiTable)
            .set({ 
                status: newStatus,
                updated_at: new Date()
            })
            .where(eq(transaksiTable.id, transaksiId))
            .execute();

        return {
            isValid: true,
            transaksiId: transaksiId,
            status: callbackData.status
        };
    } catch (error) {
        console.error('TRIPAY callback verification failed:', error);
        return {
            isValid: false
        };
    }
}

export async function getTripayPaymentMethods(): Promise<Array<{
    code: string;
    name: string;
    type: string;
    fee: number;
    minimum_fee?: number;
    maximum_fee?: number;
    icon_url: string;
    active: boolean;
}>> {
    try {
        // Mock TRIPAY payment methods API call
        return [
            {
                code: 'BRIVA',
                name: 'BRI Virtual Account',
                type: 'Virtual Account',
                fee: 4000,
                minimum_fee: 4000,
                maximum_fee: 4000,
                icon_url: 'https://tripay.co.id/images/payment/bri.png',
                active: true
            },
            {
                code: 'BCAVA',
                name: 'BCA Virtual Account',
                type: 'Virtual Account',
                fee: 4000,
                minimum_fee: 4000,
                maximum_fee: 4000,
                icon_url: 'https://tripay.co.id/images/payment/bca.png',
                active: true
            },
            {
                code: 'MANDIRIVA',
                name: 'Mandiri Virtual Account',
                type: 'Virtual Account',
                fee: 4000,
                minimum_fee: 4000,
                maximum_fee: 4000,
                icon_url: 'https://tripay.co.id/images/payment/mandiri.png',
                active: true
            },
            {
                code: 'QRIS',
                name: 'QRIS',
                type: 'E-Wallet',
                fee: 700,
                minimum_fee: 700,
                maximum_fee: 5000,
                icon_url: 'https://tripay.co.id/images/payment/qris.png',
                active: true
            }
        ];
    } catch (error) {
        console.error('Failed to fetch TRIPAY payment methods:', error);
        return [];
    }
}

export async function createFlipTransfer(transferData: {
    agenId: number;
    accountNumber: string;
    bankCode: string;
    amount: number;
    recipientName: string;
    remark: string;
}): Promise<{
    success: boolean;
    transferId?: string;
    fee?: number;
    totalAmount?: number;
    status?: string;
}> {
    try {
        // Validate agent exists
        const agen = await db.select()
            .from(agenTable)
            .where(eq(agenTable.id, transferData.agenId))
            .execute();

        if (agen.length === 0) {
            return {
                success: false
            };
        }

        // Calculate fee (minimum Rp 2,500 or 0.3% of amount)
        const fee = Math.max(2500, Math.floor(transferData.amount * 0.003));
        const transferId = `FLIP_${transferData.agenId}_${Date.now()}`;

        // Mock Flip Bisnis API call
        const flipResponse = await mockFlipAPI({
            account_number: transferData.accountNumber,
            bank_code: transferData.bankCode,
            amount: transferData.amount,
            remark: transferData.remark,
            recipient_name: transferData.recipientName
        });

        if (flipResponse.success) {
            return {
                success: true,
                transferId: transferId,
                fee: fee,
                totalAmount: transferData.amount + fee,
                status: 'PENDING'
            };
        }

        return {
            success: false
        };
    } catch (error) {
        console.error('Flip transfer creation failed:', error);
        return {
            success: false
        };
    }
}

export async function getFlipTransferStatus(transferId: string): Promise<{
    id: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    amount: number;
    fee: number;
    recipient_name: string;
    recipient_account: string;
    bank_code: string;
    remark: string;
    created_at: string;
    updated_at: string;
}> {
    try {
        // Extract agent ID and timestamp from transfer ID
        const transferParts = transferId.split('_');
        if (transferParts.length !== 3 || transferParts[0] !== 'FLIP') {
            throw new Error('Invalid transfer ID format');
        }

        // Mock Flip status check API call
        return {
            id: transferId,
            status: 'SUCCESS',
            amount: 100000,
            fee: 2500,
            recipient_name: 'Test Recipient',
            recipient_account: '1234567890',
            bank_code: 'BRI',
            remark: 'Komisi HERBAMART',
            created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            updated_at: new Date().toISOString()
        };
    } catch (error) {
        console.error('Failed to get Flip transfer status:', error);
        throw error;
    }
}

export async function getFlipBankList(): Promise<Array<{
    code: string;
    name: string;
}>> {
    try {
        // Mock Flip bank list API call
        return [
            { code: 'BRI', name: 'Bank BRI' },
            { code: 'BCA', name: 'Bank BCA' },
            { code: 'MANDIRI', name: 'Bank Mandiri' },
            { code: 'BNI', name: 'Bank BNI' },
            { code: 'BSI', name: 'Bank BSI' },
            { code: 'CIMB', name: 'Bank CIMB Niaga' },
            { code: 'PERMATA', name: 'Bank Permata' },
            { code: 'DANAMON', name: 'Bank Danamon' },
            { code: 'BTPN', name: 'Bank BTPN' },
            { code: 'MUAMALAT', name: 'Bank Muamalat' }
        ];
    } catch (error) {
        console.error('Failed to fetch bank list:', error);
        return [];
    }
}

export async function validateBankAccount(bankCode: string, accountNumber: string): Promise<{
    valid: boolean;
    accountName?: string;
    bankName?: string;
}> {
    try {
        // Basic validation
        if (!bankCode || !accountNumber) {
            return {
                valid: false
            };
        }

        // Mock bank account validation API call
        const bankList = await getFlipBankList();
        const bank = bankList.find(b => b.code === bankCode);
        
        if (!bank) {
            return {
                valid: false
            };
        }

        // Mock validation - assume all accounts with 10+ digits are valid
        if (accountNumber.length >= 10) {
            return {
                valid: true,
                accountName: 'TEST ACCOUNT HOLDER',
                bankName: bank.name
            };
        }

        return {
            valid: false
        };
    } catch (error) {
        console.error('Bank account validation failed:', error);
        return {
            valid: false
        };
    }
}

export async function processAutomaticCommissionPayment(penarikanId: number): Promise<{
    success: boolean;
    transferId?: string;
    message: string;
}> {
    try {
        // Get withdrawal data with agent information
        const penarikan = await db.select({
            id: penarikanKomisiTable.id,
            agen_id: penarikanKomisiTable.agen_id,
            nominal: penarikanKomisiTable.nominal,
            status: penarikanKomisiTable.status,
            nomor_rekening: agenTable.nomor_rekening,
            nama_rekening: agenTable.nama_rekening
        })
        .from(penarikanKomisiTable)
        .innerJoin(agenTable, eq(penarikanKomisiTable.agen_id, agenTable.id))
        .where(eq(penarikanKomisiTable.id, penarikanId))
        .execute();

        if (penarikan.length === 0) {
            return {
                success: false,
                message: 'Data penarikan tidak ditemukan'
            };
        }

        const withdrawalData = penarikan[0];
        
        if (withdrawalData.status !== 'PENDING') {
            return {
                success: false,
                message: 'Penarikan sudah diproses sebelumnya'
            };
        }

        // Validate bank account first
        const validation = await validateBankAccount('BRI', withdrawalData.nomor_rekening);
        if (!validation.valid) {
            return {
                success: false,
                message: 'Nomor rekening tidak valid'
            };
        }

        // Create transfer via Flip
        const transferResult = await createFlipTransfer({
            agenId: withdrawalData.agen_id,
            accountNumber: withdrawalData.nomor_rekening,
            bankCode: 'BRI', // Default to BRI for mock
            amount: parseFloat(withdrawalData.nominal),
            recipientName: withdrawalData.nama_rekening,
            remark: `Komisi HERBAMART - Penarikan ID: ${penarikanId}`
        });

        if (transferResult.success && transferResult.transferId) {
            // Update withdrawal status
            await db.update(penarikanKomisiTable)
                .set({ 
                    status: 'DIPROSES',
                    tanggal_proses: new Date(),
                    catatan: `Transfer ID: ${transferResult.transferId}`,
                    updated_at: new Date()
                })
                .where(eq(penarikanKomisiTable.id, penarikanId))
                .execute();

            return {
                success: true,
                transferId: transferResult.transferId,
                message: 'Komisi berhasil ditransfer secara otomatis melalui Flip Bisnis'
            };
        }

        return {
            success: false,
            message: 'Gagal membuat transfer melalui Flip Bisnis'
        };
    } catch (error) {
        console.error('Automatic commission payment failed:', error);
        return {
            success: false,
            message: 'Terjadi kesalahan saat memproses pembayaran komisi'
        };
    }
}

// Mock API functions for testing
async function mockTripayAPI(data: TripayPaymentRequest): Promise<{
    success: boolean;
    checkoutUrl?: string;
    reference?: string;
    paymentCode?: string;
    expiredTime?: string;
}> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock successful response
    return {
        success: true,
        checkoutUrl: `https://tripay.co.id/checkout/${data.merchant_ref}`,
        reference: data.merchant_ref,
        paymentCode: `PAY${Date.now().toString().slice(-8)}`,
        expiredTime: new Date(data.expired_time * 1000).toISOString()
    };
}

async function mockFlipAPI(data: FlipTransferRequest): Promise<{ success: boolean }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock successful response (could be enhanced with failure scenarios)
    return {
        success: true
    };
}