const axios = require('axios');
const https = require('https');
const fs = require('fs');
const config = require('../config/treeal');
const crypto = require('crypto');

class TreealService {
  constructor() {
    this.accessToken = null;
    
    try {
      if (!fs.existsSync("Certificados 2/TREEAL/PROD/ACCOUNTS/TREEAL_15.pfx")) {
        throw new Error(`Certificado não encontrado no caminho: ${config.certPath}`);
      }

      // Criando agente HTTPS com o certificado PFX
      this.httpsAgent = new https.Agent({
        pfx: fs.readFileSync('Certificados 2/TREEAL/PROD/ACCOUNTS/TREEAL_15.pfx'),
        passphrase: process.env.TREEAL_CERT_PASSWORD,
      });

      this.api = axios.create({
        baseURL: config.apiUrl,
        httpsAgent: this.httpsAgent,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
    } catch (error) {
      console.error('Erro ao inicializar TreealService:', error.message);
      throw error;
    }
  }

  generateIdempotencyKey() {
    const timestamp = Date.now().toString();
    const randomString = crypto.randomBytes(16).toString('hex');
    return `${timestamp}-${randomString}`;
  }

  formatErrorDetail(error) {
    if (error.response?.data?.detail) {
      if (Array.isArray(error.response.data.detail)) {
        return error.response.data.detail
          .map(err => {
            if (err.field && err.message) {
              return `Campo '${err.field}': ${err.message}`;
            }
            return err.message || err;
          })
          .join('; ');
      }
      return error.response.data.detail;
    }
    return error.message;
  }

  async authenticate() {
    try {
      const requestBody = {
        grantType: 'client_credentials',
        clientId: process.env.TREEAL_CLIENT_ID,
        clientSecret: process.env.TREEAL_CLIENT_SECRET,
        scope: 'pix.write'
      };

      console.log('Tentando autenticar com:', {
        url: `${config.apiUrl}/oauth/token`,
        clientId: process.env.TREEAL_CLIENT_ID
      });

      const response = await this.api.post('/oauth/token', requestBody);

      console.log('Resposta da autenticação:', response.data);

      if (!response.data.accessToken) {
        throw new Error('Token não recebido na resposta');
      }

      this.accessToken = response.data.accessToken;
      return this.accessToken;
    } catch (error) {
      const errorDetail = this.formatErrorDetail(error);
      console.error('Erro na autenticação:', error.response?.data || error.message);
      throw new Error(`Falha na autenticação com a Treeal: ${errorDetail}`);
    }
  }

  async makePixPayment(paymentData) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    try {
      // Validando dados obrigatórios
      if (!paymentData.amount) {
        throw new Error('O valor do pagamento é obrigatório');
      }
      if (!paymentData.document) {
        throw new Error('O documento do beneficiário é obrigatório');
      }
      if (!paymentData.pixKey) {
        throw new Error('A chave PIX é obrigatória');
      }

      // Formatando o payload conforme necessário
      const formattedPayload = {
        paymentFlow: "INSTANT",
        expiration: paymentData.expiration || 600,
        payment: {
          currency: "BRL",
          amount: paymentData.amount
        },
        priority: "HIGH",
        // creditorDocument: paymentData.document,
        pixKey: paymentData.pixKey
      };

      console.log('Enviando pagamento PIX:', {
        url: `${config.apiUrl}/pix/payments/dict`,
        payload: formattedPayload
      });

      const response = await this.api.post('/pix/payments/dict', formattedPayload, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'x-idempotency-key': this.generateIdempotencyKey()
        }
      });

      console.log('Resposta do pagamento PIX:', response.data);

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        // Se o token expirou, tenta autenticar novamente
        await this.authenticate();
        return this.makePixPayment(paymentData);
      }

      const errorDetail = this.formatErrorDetail(error);
      console.error('Erro no pagamento PIX:', error.response?.data || error.message);
      throw new Error(`Falha ao realizar pagamento PIX: ${errorDetail}`);
    }
  }
}

module.exports = new TreealService(); 