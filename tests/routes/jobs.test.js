const {Job, Profile} = require('./../../src/model');
const seed = require('./../../scripts/seedDb');
const { payForJob } = require('./../../src/routes/jobs');

describe('Unit tests sample set for payForJob', () => {
  beforeAll(async () => {
    await seed();
  });

  test('payForJob throws exception when Job is not found', async () => {
    await expect( async() => {
      await payForJob(100, 2);
    })
    .rejects
    .toThrow("Job '100' is not found");
  });

  test('payForJob throws exception when Job is already paid', async () => {
    await expect( async() => {
      await payForJob(14, 2);
    })
    .rejects
    .toThrow("Job '14' is already paid");
  });

  test('payForJob throws exception when Job costs higher than Client\'s balance', async () => {
    await expect( async() => {
      await payForJob(5, 4);
    })
    .rejects
    .toThrow("You have not enough money to pay for Job costing '200'");
  });

  test('payForJob executes successfully', async () => {
    let clientProfile = await Profile.findByPk(1);
    let contractorProfile = await Profile.findByPk(6);
    // act
    const updatedJob = await payForJob(2, 1);
    // assert
    expect(updatedJob.paid).toBeTruthy();
    expect(updatedJob.paymentDate).toBeDefined();
    const expectedClientBalance = clientProfile.balance - updatedJob.price;
    const expectedContractorBalance = contractorProfile.balance + updatedJob.price;
    clientProfile = await Profile.findByPk(1);
    contractorProfile = await Profile.findByPk(6);
    expect(expectedClientBalance).toBe(clientProfile.balance);
    expect(expectedContractorBalance).toBe(contractorProfile.balance);
  });
})
