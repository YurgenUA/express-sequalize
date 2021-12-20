const { Op } = require('sequelize');
const { sequelize, Profile, Job, Contract } = require('../model');


async function bestProfession(startDate, endDate) {
  // I hesitated for some time between mega-SQL and ORM manipulation ;)
  const topEarnings = await Job.findOne(
    {
      attributes: [
        [sequelize.fn('sum', sequelize.col('price')), 'earnings_by_profession'],
        'Contract.Contractor.profession'
      ],
      where: {
        paymentDate: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        },
        paid: true
      },
      include: [
        {
          model: Contract,
          required: true,
          where: {
            status: {
              [Op.in]: ['in_progress', 'completed'] // limit by only sucessfull Contracts
            }
          },
          attributes: ['ContractorId'],
          include: [
            {
              model: Profile,
              where: { type: 'contractor' },
              as: 'Contractor',
            }
          ]
        },
      ],
      group: ['Contract.Contractor.profession'],
      order: [[sequelize.fn('sum', sequelize.col('price')), 'DESC']],
    }
  );

  if (!topEarnings) {
    return { message: 'No earnings recorded in sent period' };
  }
  const agregateData = topEarnings.get({ plain: true });
  return {
    earnings: agregateData.earnings_by_profession,
    profession: agregateData.Contract.Contractor.profession,
  }
}


async function bestClients(startDate, endDate, limit) {
  const spentByClient = await Job.findAll(
    {
      attributes: [
        [sequelize.fn('sum', sequelize.col('price')), 'spending_by_client'],
      ],
      where: {
        paymentDate: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        },
        paid: true
      },
      include: [
        {
          model: Contract,
          required: true,
          where: {
            status: {
              [Op.in]: ['in_progress', 'completed'] // limit by only sucessfull Contracts
            }
          },
          attributes: ['ClientId'],
          include: [
            {
              model: Profile,
              required: true,
              as: 'Client',
              attributes: ['id', 'firstName', 'lastName'],
            }
          ]
        },
      ],
      limit,
      group: ['Contract.Client.Id'],
      order: [[sequelize.fn('sum', sequelize.col('price')), 'DESC']],
    }
  );

  if (!spentByClient) {
    return { message: 'No payments recorded in sent period' };
  }
  return spentByClient.map(it => {
    const plainIt = it.get({ plain: true });
    return {
      id: plainIt.Contract.ClientId,
      paid: plainIt.spending_by_client,
      fullName: `${plainIt.Contract.Client.firstName} ${plainIt.Contract.Client.lastName}`,
    }
  });
}

module.exports = { bestProfession, bestClients }