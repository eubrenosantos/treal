const path = require('path');
const dotenv = require('dotenv');

// Carrega as variáveis de ambiente do arquivo .env
const result = dotenv.config();

if (result.error) {
  throw new Error('Não foi possível carregar o arquivo .env');
}

module.exports = {
  apiUrl: 'https://secureapi.treeal-prod.onz.software/api/v2',
  clientId: process.env.TREEAL_CLIENT_ID,
  clientSecret: process.env.TREEAL_CLIENT_SECRET,
  certPath: path.resolve(__dirname, 'Certificados 2/TREEAL/PROD/ACCOUNTS/TREEAL_15.pfx'),
  certPassword: process.env.TREEAL_CERT_PASSWORD,
  endpoints: {
    token: '/oauth/token',
    pixPayment: '/pix/payments/dict'
  }
}; 