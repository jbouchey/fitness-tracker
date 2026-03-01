const { Router } = require('express');
const { getWorkouts, getWorkout, updateWorkout, deleteWorkout, getPersonalRecords, getActivityTrends } = require('../controllers/workout.controller');
const authenticate = require('../middleware/authenticate');

const router = Router();

router.use(authenticate);

router.get('/', getWorkouts);
router.get('/records', getPersonalRecords);
router.get('/trends', getActivityTrends);
router.get('/:id', getWorkout);
router.patch('/:id', updateWorkout);
router.delete('/:id', deleteWorkout);

module.exports = router;
