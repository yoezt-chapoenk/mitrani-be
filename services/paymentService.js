const crypto = require('crypto');

class PaymentService {
  constructor() {
    // Payment gateway configurations
    this.gateways = {
      midtrans: {
        serverKey: process.env.MIDTRANS_SERVER_KEY,
        clientKey: process.env.MIDTRANS_CLIENT_KEY,
        isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
        baseUrl: process.env.MIDTRANS_IS_PRODUCTION === 'true' 
          ? 'https://api.midtrans.com/v2'
          : 'https://api.sandbox.midtrans.com/v2'
      },
      xendit: {
        secretKey: process.env.XENDIT_SECRET_KEY,
        webhookToken: process.env.XENDIT_WEBHOOK_TOKEN,
        baseUrl: 'https://api.xendit.co'
      },
      stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        baseUrl: 'https://api.stripe.com/v1'
      }
    };
  }

  /**
   * Create payment request for Midtrans
   * @param {Object} transactionData - Transaction data
   * @returns {Object} Payment response
   */
  async createMidtransPayment(transactionData) {
    try {
      const { id, order_id, amount } = transactionData;
      
      const payload = {
        transaction_details: {
          order_id: id,
          gross_amount: Math.round(amount)
        },
        credit_card: {
          secure: true
        },
        customer_details: {
          first_name: transactionData.customer_name || 'Customer',
          email: transactionData.customer_email || 'customer@example.com',
          phone: transactionData.customer_phone || '+62812345678'
        },
        callbacks: {
          finish: `${process.env.FRONTEND_URL}/payment/success`,
          error: `${process.env.FRONTEND_URL}/payment/error`,
          pending: `${process.env.FRONTEND_URL}/payment/pending`
        }
      };

      const response = await fetch(`${this.gateways.midtrans.baseUrl}/charge`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(this.gateways.midtrans.serverKey + ':').toString('base64')}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`Midtrans API error: ${result.error_messages?.join(', ') || 'Unknown error'}`);
      }

      return {
        payment_url: result.redirect_url,
        token: result.token,
        gateway_transaction_id: result.transaction_id
      };
    } catch (error) {
      console.error('Error creating Midtrans payment:', error);
      throw error;
    }
  }

  /**
   * Create payment request for Xendit
   * @param {Object} transactionData - Transaction data
   * @returns {Object} Payment response
   */
  async createXenditPayment(transactionData) {
    try {
      const { id, amount } = transactionData;
      
      const payload = {
        external_id: id,
        amount: amount,
        payer_email: transactionData.customer_email || 'customer@example.com',
        description: `Payment for Order ${transactionData.order_id}`,
        success_redirect_url: `${process.env.FRONTEND_URL}/payment/success`,
        failure_redirect_url: `${process.env.FRONTEND_URL}/payment/error`
      };

      const response = await fetch(`${this.gateways.xendit.baseUrl}/v2/invoices`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(this.gateways.xendit.secretKey + ':').toString('base64')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`Xendit API error: ${result.error_code || 'Unknown error'}`);
      }

      return {
        payment_url: result.invoice_url,
        token: result.id,
        gateway_transaction_id: result.id
      };
    } catch (error) {
      console.error('Error creating Xendit payment:', error);
      throw error;
    }
  }

  /**
   * Create payment request for Stripe
   * @param {Object} transactionData - Transaction data
   * @returns {Object} Payment response
   */
  async createStripePayment(transactionData) {
    try {
      const { id, amount } = transactionData;
      
      const payload = {
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Order ${transactionData.order_id}`
            },
            unit_amount: Math.round(amount * 100) // Stripe uses cents
          },
          quantity: 1
        }],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/error`,
        metadata: {
          transaction_id: id,
          order_id: transactionData.order_id
        }
      };

      const response = await fetch(`${this.gateways.stripe.baseUrl}/checkout/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.gateways.stripe.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(this.flattenObject(payload))
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`Stripe API error: ${result.error?.message || 'Unknown error'}`);
      }

      return {
        payment_url: result.url,
        token: result.id,
        gateway_transaction_id: result.id
      };
    } catch (error) {
      console.error('Error creating Stripe payment:', error);
      throw error;
    }
  }

  /**
   * Create payment request based on gateway
   * @param {string} gateway - Payment gateway
   * @param {Object} transactionData - Transaction data
   * @returns {Object} Payment response
   */
  async createPayment(gateway, transactionData) {
    switch (gateway) {
      case 'midtrans':
        return await this.createMidtransPayment(transactionData);
      case 'xendit':
        return await this.createXenditPayment(transactionData);
      case 'stripe':
        return await this.createStripePayment(transactionData);
      default:
        throw new Error(`Unsupported payment gateway: ${gateway}`);
    }
  }

  /**
   * Verify Midtrans webhook signature
   * @param {Object} payload - Webhook payload
   * @param {string} signature - Signature from header
   * @returns {boolean} Is signature valid
   */
  verifyMidtransSignature(payload, signature) {
    try {
      const { order_id, status_code, gross_amount } = payload;
      const signatureKey = this.gateways.midtrans.serverKey;
      const input = `${order_id}${status_code}${gross_amount}${signatureKey}`;
      const hash = crypto.createHash('sha512').update(input).digest('hex');
      return hash === signature;
    } catch (error) {
      console.error('Error verifying Midtrans signature:', error);
      return false;
    }
  }

  /**
   * Verify Xendit webhook signature
   * @param {string} payload - Raw webhook payload
   * @param {string} signature - Signature from header
   * @returns {boolean} Is signature valid
   */
  verifyXenditSignature(payload, signature) {
    try {
      const webhookToken = this.gateways.xendit.webhookToken;
      const hash = crypto.createHash('sha256').update(payload + webhookToken).digest('hex');
      return hash === signature;
    } catch (error) {
      console.error('Error verifying Xendit signature:', error);
      return false;
    }
  }

  /**
   * Verify Stripe webhook signature
   * @param {string} payload - Raw webhook payload
   * @param {string} signature - Signature from header
   * @returns {boolean} Is signature valid
   */
  verifyStripeSignature(payload, signature) {
    try {
      const webhookSecret = this.gateways.stripe.webhookSecret;
      const elements = signature.split(',');
      const signatureHash = elements.find(element => element.startsWith('v1='))?.split('v1=')[1];
      
      if (!signatureHash) {
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signatureHash, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('Error verifying Stripe signature:', error);
      return false;
    }
  }

  /**
   * Verify webhook signature based on gateway
   * @param {string} gateway - Payment gateway
   * @param {string|Object} payload - Webhook payload
   * @param {string} signature - Signature from header
   * @returns {boolean} Is signature valid
   */
  verifyWebhookSignature(gateway, payload, signature) {
    switch (gateway) {
      case 'midtrans':
        return this.verifyMidtransSignature(payload, signature);
      case 'xendit':
        return this.verifyXenditSignature(payload, signature);
      case 'stripe':
        return this.verifyStripeSignature(payload, signature);
      default:
        return false;
    }
  }

  /**
   * Parse webhook payload to extract transaction info
   * @param {string} gateway - Payment gateway
   * @param {Object} payload - Webhook payload
   * @returns {Object} Parsed transaction info
   */
  parseWebhookPayload(gateway, payload) {
    switch (gateway) {
      case 'midtrans':
        return {
          transaction_id: payload.order_id,
          gateway_transaction_id: payload.transaction_id,
          status: payload.transaction_status,
          amount: parseFloat(payload.gross_amount),
          is_success: ['capture', 'settlement'].includes(payload.transaction_status),
          is_failed: ['deny', 'cancel', 'expire', 'failure'].includes(payload.transaction_status)
        };
      
      case 'xendit':
        return {
          transaction_id: payload.external_id,
          gateway_transaction_id: payload.id,
          status: payload.status,
          amount: parseFloat(payload.amount),
          is_success: payload.status === 'PAID',
          is_failed: ['EXPIRED', 'FAILED'].includes(payload.status)
        };
      
      case 'stripe':
        return {
          transaction_id: payload.data?.object?.metadata?.transaction_id,
          gateway_transaction_id: payload.data?.object?.id,
          status: payload.type,
          amount: payload.data?.object?.amount_total ? payload.data.object.amount_total / 100 : 0,
          is_success: payload.type === 'checkout.session.completed',
          is_failed: payload.type === 'checkout.session.expired'
        };
      
      default:
        throw new Error(`Unsupported payment gateway: ${gateway}`);
    }
  }

  /**
   * Helper function to flatten object for URL encoding
   * @param {Object} obj - Object to flatten
   * @param {string} prefix - Prefix for keys
   * @returns {Object} Flattened object
   */
  flattenObject(obj, prefix = '') {
    const flattened = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}[${key}]` : key;
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(flattened, this.flattenObject(obj[key], newKey));
        } else if (Array.isArray(obj[key])) {
          obj[key].forEach((item, index) => {
            if (typeof item === 'object') {
              Object.assign(flattened, this.flattenObject(item, `${newKey}[${index}]`));
            } else {
              flattened[`${newKey}[${index}]`] = item;
            }
          });
        } else {
          flattened[newKey] = obj[key];
        }
      }
    }
    
    return flattened;
  }
}

module.exports = new PaymentService();