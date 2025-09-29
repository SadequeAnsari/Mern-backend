const postModel = require("../models/postModel");

const createPost = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: "Content is required" });
    if (req.user.level === "0") {
      return res.status(403).json({ message: "Account not verified. Please verify your email to create posts." });
    }
    const newPost = await postModel.create({ content, author: req.user._id });
    await newPost.populate('author', 'username _id');
    res.status(201).json(newPost);
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ message: "Error creating post" });
  }
};


// Corrected
const getAllPosts = async (req, res) => {
  try {
    // ONLY fetch posts with statusCode '1' (Published)
    const posts = await postModel.find({ statusCode: '1' }).populate('author', 'username _id').sort({ createdAt: -1 });
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
    
    // 🔑 NEW SECURITY CHECK: If the post is a draft (statusCode: '0'), 
    // only the author (req.user._id) should be allowed to view it.
    if (post.statusCode === '0' && (!req.user || post.author._id.toString() !== req.user._id.toString())) {
        return res.status(404).json({ message: "Post not found" }); // Respond with 404 to hide the existence of the draft
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
    
    // --- Determine the Query Filter ---
    let queryFilter = { author: authorId };
    if (!req.user || req.user._id.toString() !== authorId.toString()) {
      // If the viewer is NOT the author, or not logged in, only fetch Published posts.
      queryFilter.statusCode = '1';
    } 
    // If the viewer IS the author, no further status code filter is needed (they see all their posts).
      const posts = await postModel.find(queryFilter)
      .populate('author', 'username _id') // Changed 'id' to '_id' for consistency with postModel.findById in getPostById
      .sort({ createdAt: -1 });
      
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts by author ID:', error);
    res.status(500).json({ message: 'Error fetching user posts' });
  }
};


const updatePost = async (req, res) => {
  try {
    const { content } = req.body;
    const post = await postModel.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not authorized to edit this post" });
    }
    post.content = content;
    const updatedPost = await post.save();
    await updatedPost.populate('author', 'username _id');
    res.json(updatedPost);
  } catch (error) {
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
    
    // --- AUTHORIZATION LOGIC ---
    // 1. Check if req.user exists (set by your 'authenticate' middleware)
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Authentication required." });
    }

    // Safely get and convert the user's level to a number (e.g., '7' -> 7)
    // If req.user.level is missing, it converts to NaN, which prevents unauthorized deletion.
    const userLevel = Number(req.user.level); 
    
    // Check if the user is the author OR has level 7 or higher
    const isAuthor = post.author.toString() === req.user._id.toString();
    const hasAdminRights = !isNaN(userLevel) && userLevel >= 7; 
    
    // If not the author AND not admin, deny access.
    if (!isAuthor && !hasAdminRights) {
      // This returns the 403 Forbidden error you are seeing
      return res.status(403).json({ message: "You are not authorized to delete this post" });
    }

    // --- EXECUTION ---
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