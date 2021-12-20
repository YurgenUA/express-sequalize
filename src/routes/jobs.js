const { Op } = require('sequelize');
const { Job, Contract, sequelize, Profile } = require('../model');
const { AppError, ErrorTypes } = require('../errors');

function  getUnpaidJobs(userId) {
  const jobs = Job.findAll({
    where: {
      paid: null,
    },
    include: [
      {
        model: Contract,
        required: true,
        where: {
          [Op.or]: [
            {
              ClientId: userId,
            },
            {
              ContractorId: userId,
            },
          ],
          status: {
            [Op.in]: ['new', 'in_progress'] // limit by active Contracts
          }
        },
        attributes: ['id'],
      },
    ],
  });
  return jobs;
}


function payForJob(jobId, userId) {
  // use unmanaged transaction as it's auto commit/rollback and modifications needs to be done in many tables
  return sequelize.transaction(async (t) => {
    const job = await Job.findOne(
      {
        where: { id: jobId },
        include: [
          {
            model: Contract,
            required: true,
            where: {
              ClientId: userId,
            },
            attributes: ['ContractorId'],
          },
        ],
      },
      { transaction: t }
    );
    if (!job) {
      throw new AppError(ErrorTypes.InputData, `Job '${jobId}' is not found`);
    }

    if (job.paid) {
      throw new AppError(ErrorTypes.InputData, `Job '${jobId}' is already paid`);
    }

    const [clientProfile, contractorProfile] = await Promise.all([
      Profile.findByPk(userId, { transaction: t }),
      Profile.findByPk(job.Contract.ContractorId, { transaction: t })
    ]);
    if (job.price > clientProfile.balance) {
      throw new AppError(ErrorTypes.InputData, `You have not enough money to pay for Job costing '${job.price}'`);
    }

    //transfer money & close Job
    contractorProfile.balance += job.price;
    clientProfile.balance -= job.price;
    job.paid = true;
    job.paymentDate = new Date();

    const [updatedJob] = await Promise.all([
      job.save({ transaction: t }),
      contractorProfile.save({ transaction: t }),
      clientProfile.save({ transaction: t })
    ]);
    return updatedJob;

  });
}

module.exports = { payForJob, getUnpaidJobs }