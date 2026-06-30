const express = require('express');
const router = express.Router();
const { getPetitions, createPetition, votePetition, addComment } = require('../controllers/petitionController');
const { authenticate } = require('../middleware/auth');

router.route('/')
  .get(authenticate, getPetitions)
  .post(authenticate, createPetition);

router.post('/:id/vote', authenticate, votePetition);
router.post('/:id/comments', authenticate, addComment);

module.exports = router;
