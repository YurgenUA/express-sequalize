
const { Op } = require('sequelize');
const { Contract } = require('../model');

async function getContractById(id, userId) {
  const contract = await Contract.findOne({
    where: {
      id,
      [Op.or]: [
        { ClientId: userId },
        { ContractorId: userId }
      ]
    }
  })
  return contract;
}

async function getContracts(userId) {
  return Contract.findAll({
    where: {
      [Op.or]: [
        {
          ClientId: userId,
        },
        {
          ContractorId: userId,
        },
      ],
      status: { [Op.ne]: 'terminated' },
    },
  });
}

module.exports = { getContractById, getContracts };