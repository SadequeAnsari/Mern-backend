const postModel = require("../models/postModel");

const createPost = async (req, res) => {
  try {
    const { content, statusCode } = req.body;
    
    const validStatusCodes = ['0', '1'];
    if (!content || !validStatusCodes.includes(statusCode)) {
      return res.status(400).json({ message: "Content and a valid status (Draft or Publish) are required." });
    }

    if (req.user.level === "0") {
      return res.status(403).json({ message: "Account not verified. Please verify your email to create posts." });
    }
    
    const newPost = await postModel.create({ content, author: req.user._id, statusCode: statusCode });
    await newPost.populate('author', 'username _id');
    res.status(201).json(newPost);
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ message: "Error creating post" });
  }
};


const getAllPosts = async (req, res) => {
  try {
    // MODIFIED: Dynamically fetch posts.
    // Fetches all published posts ('2') PLUS the current user's draft ('0') and pending ('1') posts.
    let query = {
      statusCode: '2'
    };

    if (req.user && req.user._id) {
      query = {
        $or: [
          { statusCode: '2' }, // Everyone sees published posts
          { author: req.user._id, statusCode: { $in: ['0', '1'] } } // The logged-in user sees their own drafts and pending posts
        ]
      };
    }

    const posts = await postModel.find(query)
      .populate('author', 'username _id')
      .sort({ createdAt: -1 });
      
    res.json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ message: "Error fetching posts" });
  }
};

const getPostById = async (req, res) => {
  try {
    const postId = req.params.postId;
    const post = await postModel.findById(postId).populate('author', 'username _id');
    
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    if (post.statusCode === '0' && (!req.user || post.author._id.toString() !== req.user._id.toString())) {
        return res.status(404).json({ message: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ message: "Error fetching post" });
  }
};

const getPostsByAuthorId = async (req, res) => {
  try {
    const authorId = req.params.authorId;
    
    let queryFilter = { author: authorId };
    
    if (!req.user || req.user._id.toString() !== authorId.toString()) {
      queryFilter.statusCode = '1';
    } 
    
    const posts = await postModel.find(queryFilter)
      .populate('author', 'username _id') 
      .sort({ createdAt: -1 });
      
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts by author ID:', error);
    res.status(500).json({ message: 'Error fetching user posts' });
  }
};



const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const post = await postModel.findById(id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not authorized to edit this post" });
    }

    if (content) {
      post.content = content;
      post.createdAt = Date.now();
      post.statusCode = '1';
    }

    await post.save();
    await post.populate('author', 'username _id');
    res.json(post);
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ message: "Error updating post" });
  }
};


const deletePost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const post = await postModel.findById(postId);
    
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Authentication required." });
    }

    const userLevel = Number(req.user.level); 
    
    const isAuthor = post.author.toString() === req.user._id.toString();
    const hasAdminRights = !isNaN(userLevel) && userLevel >= 7; 
    
    if (!isAuthor && !hasAdminRights) {
      return res.status(403).json({ message: "You are not authorized to delete this post" });
    }

    await postModel.findByIdAndDelete(postId);
    
    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ message: "Error deleting post" });
  }
  console.log("User attempting delete:", req.user);
};

module.exports = {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  getPostsByAuthorId
};