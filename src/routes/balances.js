const { sequelize, Profile, Job, Contract } = require('../model');
const { AppError, ErrorTypes } = require('../errors');

async function depositToContractor(userId, contractorId, sum) {
  // use unmanaged transaction as it's auto commit/rollback
  return sequelize.transaction(async (t) => {
    const contractor = await Profile.findByPk(contractorId);
    if (!contractor) {
      throw new AppError(ErrorTypes.InputData, `Contractor '${contractorId}' not found`);
    }
    if (contractor.type !== 'contractor') {
      throw new AppError(ErrorTypes.InputData, `Cannot pay to '${contractorId}' as it is not a Contractor`);
    }

    const jobSum = await Job.sum('price',
      {
        include: [
          {
            model: Contract,
            required: true,
            where: { // assuming only 'in_progress' Contracts where both parties involved are in scope
              ClientId: userId,
              ContractorId: contractorId,
              status: 'in_progress'
            },
          },
        ],
      },
      { transaction: t }
    );

    if (sum > jobSum * 0.25) {
      throw new AppError(ErrorTypes.InputData, `Cannot pay '${sum}' to '${contractorId}' as it exceeds threshold`);
    }

    contractor.balance += sum;
    return await contractor.save({ transaction: t });
  });

}

module.exports = { depositToContractor }