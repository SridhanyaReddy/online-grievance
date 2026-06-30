const express = require('express');
const router = express.Router();
const { 
  getGroups, 
  createGroup, 
  getGroupPosts, 
  createPost, 
  addPostComment, 
  getPostComments, 
  likePost 
} = require('../controllers/groupController');
const { authenticate } = require('../middleware/auth');

router.route('/')
  .get(authenticate, getGroups)
  .post(authenticate, createGroup);

router.route('/:id/posts')
  .get(authenticate, getGroupPosts)
  .post(authenticate, createPost);

router.route('/posts/:postId/comments')
  .post(authenticate, addPostComment)
  .get(authenticate, getPostComments);

router.post('/posts/:postId/like', authenticate, likePost);

module.exports = router;
