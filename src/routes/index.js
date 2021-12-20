const { Router } = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { getProfile } = require('./../middleware/getProfile');
const { getContractById, getContracts } = require('./contracts');
const { depositToContractor } = require('./balances');
const { getUnpaidJobs, payForJob } = require('./jobs');
const { bestProfession, bestClients } = require('./leaders');

const { AppError, ErrorTypes } = require('../errors');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Profiles, Contracts, Jobs (test assignment)',
      version: '1.0.0',
    },
  },
  apis: ['./src/routes/index.js'],
};

const propagateError = fn => {
  return function AWrap(...args) {
    const fnReturn = fn(...args);
    const next = args[args.length - 1]
    return Promise.resolve(fnReturn).catch(next);
  }
}

const openapiSpecification = swaggerJsdoc(options);

const router = new Router();
router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpecification));

/**
 * @openapi
 * /contracts/{id}:
 *   get:
 *     summary: get Contract by id
 *     parameters:
 *       - in: header
 *         name: profile_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: returns Contract.
 */
router.get('/contracts/:id', getProfile, propagateError(async (req, res) => {
  const profileId = req.profile.id;
  const { id } = req.params;
  const contract = await getContractById(id, profileId);
  if (!contract) return res.status(404).end();
  res.json(contract);
}))

/**
 * @openapi
 * /contracts:
 *   get:
 *     summary: get Contract list
 *     parameters:
 *       - in: header
 *         name: profile_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: returns Contract list.
 */
router.get('/contracts', getProfile, propagateError(async (req, res) => {
  const profileId = req.profile.id;
  const contracts = await getContracts(profileId);
  res.json(contracts);
}))

/**
 * @openapi
 * /jobs/unpaid:
 *   get:
 *     summary: get updaid Job list
 *     parameters:
 *       - in: header
 *         name: profile_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: updaid Job list.
 */
router.get('/jobs/unpaid', getProfile, propagateError(async (req, res) => {
  const response = await getUnpaidJobs(req.profile.id);
  return res.json(response);
}));

/**
 * @openapi
 * /jobs/{id}/pay:
 *   post:
 *     summary: pay for Job by id
 *     parameters:
 *       - in: header
 *         name: profile_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: returns updated Job.
 */
router.post('/jobs/:id/pay', getProfile, propagateError(async (req, res) => {
  const { id } = req.params;
  // not passing full Profile into function forcing to read it again under transaction
  const response = await payForJob(id, req.profile.id);
  return res.json(response);
}));

/**
 * @openapi
 * /balances/deposit/{user_id}:
 *   post:
 *     summary: deposit money to other User wallet
 *     parameters:
 *       - in: header
 *         name: profile_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *         required: true
 *         content:
 *            application/json:  
 *              schema:
 *                type: object
 *                properties:
 *                  sum:
 *                    type: number
 *     responses:
 *       200:
 *         description: returns Contractor details
 */
router.post('/balances/deposit/:userId', getProfile, propagateError(async (req, res) => {
  const { userId } = req.params;
  const { sum } = req.body;
  const response = await depositToContractor(req.profile.id, userId, sum);
  return res.json(response);
}));


/**
 * @openapi
 * /admin/best-profession?start={dateStart}&end={dateEnd}:
 *   get:
 *     summary: Profession earned the most during period
 *     parameters:
 *       - in: path
 *         name: dateStart
 *         required: true
 *         schema:
 *           type: string
 *           default: '2020-08-16 00:00:00.000 +00:00'
 *       - in: path
 *         name: dateEnd
 *         required: true
 *         schema:
 *           type: string
 *           default: '2020-08-16 23:59:00.000 +00:00'
 *     responses:
 *       200:
 *         description: returns prefession and his earnings
 */
// assuming this enpoints is not secured
router.get('/admin/best-profession', propagateError(async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) {
    throw new AppError(ErrorTypes.InputData, 'Please set both start/end query params');
  }
  const startDate = Date.parse(start);
  const endDate = Date.parse(end);
  if (!startDate || !endDate) {
    throw new AppError(ErrorTypes.InputData, 'Please set both start/end query params as ISO dates');
  }

  return res.json(await bestProfession(startDate, endDate));
}));

/**
 * @openapi
 * /admin/best-clients?start={dateStart}&end={dateEnd}&limit={limit}:
 *   get:
 *     summary: the most generous Clients during period
 *     parameters:
 *       - in: path
 *         name: dateStart
 *         required: true
 *         schema:
 *           type: string
 *           default: '2020-08-16 00:00:00.000 +00:00'
 *       - in: path
 *         name: dateEnd
 *         required: true
 *         schema:
 *           type: string
 *           default: '2020-08-16 23:59:00.000 +00:00'
 *       - in: path
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 2
 *     responses:
 *       200:
 *         description: returns list of clients with amount spent
 */
// assuming this enpoints is not secured
router.get('/admin/best-clients', propagateError(async (req, res) => {
  const { start, end, limit } = req.query;
  if (!start || !end) {
    throw new AppError(ErrorTypes.InputData, 'Please set both start/end query params');
  }
  let parsedLimit;
  try {
    if (!limit || limit == '' || limit == '0') {
      parsedLimit = 2;
    } else {
      parsedLimit = Number.parseInt(limit);
    }
  } catch (error) {
    throw new AppError(ErrorTypes.InputData, "Please set integer value for 'limit' or omit it.");
  }

  const startDate = Date.parse(start);
  const endDate = Date.parse(end);
  if (!startDate || !endDate) {
    throw new AppError(ErrorTypes.InputData, 'Please set both start/end query params as ISO dates');
  }

  return res.json(await bestClients(startDate, endDate, parsedLimit));
}));


// exception handler
router.use(function (err, req, res, next) {
  if (err && err instanceof AppError) {
    console.error('Application exception', err);
    switch (err.errorType) {
      case ErrorTypes.InputData:
        return res.status(400).json({ message: err.message });
      case ErrorTypes.ServerSide:
        return res.status(500).json({ message: err.message });
    }
  }
  else {
    console.error('Uncaught exception', err);
    res.status(500).json({ message: 'Unexpected server side error' });
  }
});


module.exports = router;