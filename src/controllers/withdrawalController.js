const asyncHandler = require('express-async-handler');
const Joi = require('joi');
const treealService = require('../services/treealService');
const { v4: uuidv4 } = require('uuid');

const withdrawalSchema = Joi.object({
  amount: Joi.number().required().min(0.01).messages({
    'number.base': 'O valor deve ser um número',
    'number.min': 'O valor mínimo é R$ 0,01',
    'any.required': 'O valor é obrigatório'
  }),
  pixKey: Joi.string().required().messages({
    'string.empty': 'A chave PIX não pode estar vazia',
    'any.required': 'A chave PIX é obrigatória'
  }),
  document: Joi.string().required().messages({
    'string.empty': 'O documento não pode estar vazio',
    'any.required': 'O documento é obrigatório'
  })
});

const withdraw = asyncHandler(async (req, res) => {
  try {
    const { error, value } = withdrawalSchema.validate(req.body, { abortEarly: false });
    if (error) {
      res.status(400);
      throw new Error(error.details.map(err => err.message).join('; '));
    }

    const result = await treealService.makePixPayment(value);
    
    res.status(200).json({
      success: true,
      data: result,
      message: 'Pagamento PIX realizado com sucesso'
    });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    res.status(statusCode);

    // Se for um erro de validação do Joi, já está formatado
    if (error.details) {
      throw error;
    }

    // Se for um erro da API da Treeal, já está formatado pelo serviço
    throw new Error(error.message);
  }
});

module.exports = {
  withdraw
}; 