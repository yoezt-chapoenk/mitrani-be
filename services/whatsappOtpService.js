const axios = require('axios');
const { supabase } = require('../config/supabase');

class WhatsAppOtpService {
  constructor() {
    this.wablasApiKey = 'pXPEg2ia163QKnampAGHoTo8s5B4rXsKPwoOchEFG3lg24Y0Yc3MxGO';
    this.wablasSecretKey = 'gqKpmD1b';
    this.wablasBaseUrl = 'https://tegal.wablas.com/api';
  }

  /**
   * Generate a 6-digit OTP
   */
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Format phone number for WhatsApp (remove + and ensure it starts with country code)
   */
  formatPhoneNumber(phone) {
    // Remove all non-numeric characters
    let cleanPhone = phone.replace(/\D/g, '');
    
    // If it starts with 0, replace with 62 (Indonesia)
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    }
    
    // If it doesn't start with country code, assume Indonesia
    if (!cleanPhone.startsWith('62')) {
      cleanPhone = '62' + cleanPhone;
    }
    
    return cleanPhone;
  }

  /**
   * Send OTP via WhatsApp using Wablas.com API
   */
  async sendOTP(phone, otp, type = 'registration') {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      
      let message;
      if (type === 'login') {
        message = `🔐 Kode Login Mitrani: ${otp}\n\nKode ini berlaku selama 5 menit untuk login ke akun Anda.\nJangan bagikan kode ini kepada siapa pun.\n\n#MitraniLogin`;
      } else {
        message = `🔐 Kode OTP Mitrani: ${otp}\n\nKode ini berlaku selama 5 menit untuk pendaftaran akun.\nJangan bagikan kode ini kepada siapa pun.\n\n#MitraniOTP`;
      }

      const response = await axios.post(
        `${this.wablasBaseUrl}/send-message`,
        {
          phone: formattedPhone,
          message: message,
          isGroup: false
        },
        {
          headers: {
            'Authorization': this.wablasApiKey,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 seconds timeout
        }
      );

      console.log('WhatsApp OTP sent successfully:', {
        phone: formattedPhone,
        type,
        status: response.data.status,
        messageId: response.data.data?.id
      });

      return {
        success: true,
        messageId: response.data.data?.id,
        phone: formattedPhone
      };
    } catch (error) {
      console.error('Failed to send WhatsApp OTP:', {
        phone,
        type,
        error: error.message,
        response: error.response?.data
      });

      throw new Error(`Failed to send OTP: ${error.message}`);
    }
  }

  /**
   * Store OTP in database with user registration data
   */
  async storeOTP(phone, otp, userData, purpose = 'register') {
    try {
      // Validate purpose
      if (!['register', 'login'].includes(purpose)) {
        throw new Error('Invalid purpose. Must be either "register" or "login"');
      }

      // Clean up any existing OTP for this phone
      await supabase
        .from('otp_verifications')
        .delete()
        .eq('phone', phone)
        .eq('is_used', false);

      // Store new OTP
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
      
      const { data, error } = await supabase
        .from('otp_verifications')
        .insert({
          phone,
          otp_code: otp,
          purpose,
          user_data: userData,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error('Failed to store OTP: ' + error.message);
      }

      console.log('OTP stored successfully:', {
        phone,
        purpose,
        expires_at: expiresAt.toISOString()
      });

      return data;
    } catch (error) {
      console.error('Error storing OTP:', error);
      throw error;
    }
  }

  /**
   * Verify OTP and return stored user data with detailed logging
   */
  async verifyOTP(phone, otp, purpose = 'register') {
    const currentTime = new Date().toISOString();
    
    console.log('🔍 OTP Verification Started:', {
      phone: phone?.replace(/.(?=.{4})/g, '*'), // Mask phone for security
      otp: otp?.replace(/.(?=.{2})/g, '*'), // Mask OTP for security
      purpose,
      timestamp: currentTime
    });

    try {
      // Step 1: First check if there's any OTP record for this phone and purpose
      const { data: existingRecords, error: checkError } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('phone', phone)
        .eq('purpose', purpose)
        .eq('is_used', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (checkError) {
        console.error('❌ Error checking existing OTP records:', checkError);
        throw new Error('Database error during OTP verification');
      }

      if (!existingRecords || existingRecords.length === 0) {
        console.log('❌ No OTP records found for phone and purpose');
        await this.diagnoseOtpIssue(phone, otp, purpose, currentTime);
        throw new Error('No OTP found for this phone number and purpose');
      }

      const latestRecord = existingRecords[0];
      console.log('📋 Latest OTP Record Found:', {
        id: latestRecord.id,
        created_at: latestRecord.created_at,
        expires_at: latestRecord.expires_at,
        attempts: latestRecord.attempts || 0, // Handle missing attempts column
        is_used: latestRecord.is_used,
        purpose: latestRecord.purpose
      });

      // Step 2: Check if OTP is expired
      if (new Date(latestRecord.expires_at) <= new Date(currentTime)) {
        console.log('❌ OTP has expired:', {
          expires_at: latestRecord.expires_at,
          current_time: currentTime
        });
        throw new Error('OTP has expired. Please request a new OTP.');
      }

      // Step 3: Check attempts limit (handle missing attempts column)
      const currentAttempts = latestRecord.attempts || 0;
      if (currentAttempts >= 3) {
        console.log('❌ Maximum attempts exceeded:', {
          attempts: currentAttempts,
          maxAttempts: 3
        });
        throw new Error('Maximum OTP attempts exceeded. Please request a new OTP.');
      }

      // Step 4: Verify OTP code
      if (latestRecord.otp_code !== otp) {
        console.log('❌ OTP code mismatch, incrementing attempts:', {
          provided: otp?.replace(/.(?=.{2})/g, '*'),
          expected: latestRecord.otp_code?.replace(/.(?=.{2})/g, '*'),
          currentAttempts: currentAttempts
        });

        // Increment attempts (only if attempts column exists)
        if (latestRecord.hasOwnProperty('attempts')) {
          const { error: incrementError } = await supabase
            .from('otp_verifications')
            .update({ attempts: currentAttempts + 1 })
            .eq('id', latestRecord.id);

          if (incrementError) {
            console.error('❌ Failed to increment attempts:', incrementError);
          }
        }

        const remainingAttempts = 3 - (currentAttempts + 1);
        if (remainingAttempts <= 0) {
          throw new Error('Invalid OTP. Maximum attempts exceeded. Please request a new OTP.');
        } else {
          throw new Error(`Invalid OTP. ${remainingAttempts} attempt(s) remaining.`);
        }
      }

      // Step 5: Mark as used
      console.log('✅ OTP Verification Successful, updating record...');
      const { error: updateError } = await supabase
        .from('otp_verifications')
        .update({ is_used: true })
        .eq('id', latestRecord.id);

      if (updateError) {
        console.error('❌ Failed to update OTP status:', updateError);
        throw new Error('Failed to update OTP status');
      }

      console.log('🎉 OTP Verification Completed Successfully:', {
        recordId: latestRecord.id,
        phone: phone?.replace(/.(?=.{4})/g, '*'),
        purpose,
        timestamp: new Date().toISOString()
      });

      return latestRecord.user_data;
    } catch (error) {
      console.error('💥 OTP Verification Error:', {
        phone: phone?.replace(/.(?=.{4})/g, '*'),
        purpose,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Diagnose OTP verification issues for better error messages
   */
  async diagnoseOtpIssue(phone, otp, purpose, currentTime) {
    try {
      console.log('🔍 Diagnosing OTP Issue...');

      // Check if phone exists at all
      const { data: phoneRecords } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('phone', phone)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!phoneRecords || phoneRecords.length === 0) {
        console.log('❌ Diagnosis: No OTP records found for this phone number');
        return;
      }

      console.log('📋 Found OTP records for phone:', phoneRecords.length);

      // Check each potential issue
      for (const record of phoneRecords) {
        const issues = [];
        
        if (record.otp_code !== otp) {
          issues.push('OTP_CODE_MISMATCH');
        }
        if (record.purpose !== purpose) {
          issues.push(`PURPOSE_MISMATCH (expected: ${purpose}, found: ${record.purpose})`);
        }
        if (record.is_used === true) {
          issues.push('ALREADY_USED');
        }
        if (new Date(record.expires_at) <= new Date(currentTime)) {
          issues.push('EXPIRED');
        }
        if ((record.attempts || 0) >= 3) {
          issues.push('MAX_ATTEMPTS_EXCEEDED');
        }

        console.log('🔍 Record Analysis:', {
          id: record.id,
          created_at: record.created_at,
          expires_at: record.expires_at,
          attempts: record.attempts || 0,
          is_used: record.is_used,
          purpose: record.purpose,
          issues: issues.length > 0 ? issues : ['NO_ISSUES_FOUND']
        });
      }

      // Check for recent valid records
      const validRecord = phoneRecords.find(record => 
        record.otp_code === otp && 
        record.purpose === purpose && 
        !record.is_used && 
        new Date(record.expires_at) > new Date(currentTime) &&
        (record.attempts || 0) < 3
      );

      if (validRecord) {
        console.log('⚠️ Found valid record but query failed - possible race condition');
      }

    } catch (diagError) {
      console.error('❌ Error during OTP diagnosis:', diagError);
    }
  }

  /**
   * Clean up expired OTP records
   */
  async cleanupExpiredOTPs() {
    try {
      const { error } = await supabase
        .from('otp_verifications')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error cleaning up expired OTPs:', error);
      }
    } catch (error) {
      console.error('Error in cleanup process:', error);
    }
  }
}

module.exports = new WhatsAppOtpService();