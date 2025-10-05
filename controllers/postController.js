

const postModel = require("../models/postModel");

const createPost = async (req, res) => {
  try {
    const { content, statusCode } = req.body; // MODIFIED: Accept statusCode
    
    // Validation for content and statusCode
    const validStatusCodes = ['0', '1'];
    if (!content || !validStatusCodes.includes(statusCode)) {
      return res.status(400).json({ message: "Content and a valid status (Draft or Publish) are required." });
    }

    if (req.user.level === "0") {
      return res.status(403).json({ message: "Account not verified. Please verify your email to create posts." });
    }
    
    // MODIFIED: Include statusCode in the new post document
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
    // 1. Get the authenticated user's ID
    // req.user is populated by your 'authenticate' middleware from the cookie.
    const userId = req.user ? req.user._id : null;

    // 2. Define the base query conditions
    // The query must fetch posts that meet AT LEAST ONE of the conditions below.
    let queryConditions = [
      // Condition 1: Fetch all "Published" posts (statusCode: '2') for everyone.
      { statusCode: '2' },
    ];

    // Condition 2: Add the user's private posts to the query IF the user is logged in.
    if (userId) {
      queryConditions.push({
        author: userId,
        // Only fetch the current user's own Draft ('0') and Pending ('1') posts.
        statusCode: { $in: ['0', '1'] }
      });
    }

    // 3. Combine all conditions using the MongoDB $or operator
    // The query will match any document that satisfies one of the objects in the array.
    let query = {
      $or: queryConditions
    };

    // 4. Execute the final query
    const posts = await postModel
      .find(query)
      .populate('author', 'username _id')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    console.error("Error fetching all posts:", error);
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
    
    // --- Conditional Post Visibility Logic ---
    let queryFilter = { author: authorId };
    
    // Check if the authenticated viewer (req.user) is the author (authorId)
    // If NOT the author or NOT logged in, only fetch Published posts.
    if (!req.user || req.user._id.toString() !== authorId.toString()) {
      queryFilter.statusCode = '1';
    } 
    // If the viewer IS the author, no status code filter is applied, showing ALL posts.
    
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

    // Authorization Check: only author can edit
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not authorized to edit this post" });
    }

    if (content) {
      post.content = content;
      // NEW LOGIC: Reset the publish timer (by updating createdAt) and set status to '1'
      post.createdAt = Date.now(); // This restarts the 3-hour timer
      post.statusCode = '1';       // Status 1: Edited/Pending publication (Author Only)
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