const DiscussionGroup = require('../models/DiscussionGroup');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

// @desc    Get all discussion groups
// @route   GET /api/groups
exports.getGroups = async (req, res) => {
  try {
    const groups = await DiscussionGroup.find().populate('creator', 'name role');
    res.status(200).json({ success: true, data: groups });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create discussion group
// @route   POST /api/groups
exports.createGroup = async (req, res) => {
  const { name, description } = req.body;

  try {
    const groupExists = await DiscussionGroup.findOne({ name });
    if (groupExists) {
      return res.status(400).json({ success: false, message: 'Group name already exists' });
    }

    const group = new DiscussionGroup({
      name,
      description,
      creator: req.user._id,
      members: [req.user._id]
    });

    await group.save();
    res.status(201).json({ success: true, data: group });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get posts in a group
// @route   GET /api/groups/:id/posts
exports.getGroupPosts = async (req, res) => {
  try {
    const posts = await Post.find({ group: req.params.id })
      .populate('author', 'name role profilePic')
      .sort({ isPinned: -1, createdAt: -1 });
    res.status(200).json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create post in group
// @route   POST /api/groups/:id/posts
exports.createPost = async (req, res) => {
  const { title, content } = req.body;

  try {
    const post = new Post({
      group: req.params.id,
      author: req.user._id,
      title,
      content
    });

    await post.save();
    res.status(201).json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add comment to a post
// @route   POST /api/groups/posts/:postId/comments
exports.addPostComment = async (req, res) => {
  const { content } = req.body;

  try {
    const comment = new Comment({
      post: req.params.postId,
      author: req.user._id,
      content
    });

    await comment.save();

    const populated = await Comment.findById(comment._id).populate('author', 'name role profilePic');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get post comments
// @route   GET /api/groups/posts/:postId/comments
exports.getPostComments = async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate('author', 'name role profilePic')
      .sort({ createdAt: 1 });
    res.status(200).json({ success: true, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Like a post
// @route   POST /api/groups/posts/:postId/like
exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const likeIdx = post.likes.indexOf(req.user._id);
    if (likeIdx > -1) {
      post.likes.splice(likeIdx, 1); // Unlike
    } else {
      post.likes.push(req.user._id); // Like
    }

    await post.save();
    res.status(200).json({ success: true, likesCount: post.likes.length, hasLiked: likeIdx === -1 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
