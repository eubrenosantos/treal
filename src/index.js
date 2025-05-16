require('dotenv').config();
const express = require('express');
const withdrawalRoutes = require('./routes/withdrawals');

const app = express();

app.use(express.json());

// Rotas
app.use('/api/withdrawals', withdrawalRoutes);

// Middleware de erro
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
}); 