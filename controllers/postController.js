

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
    const userId = req.user ? req.user._id : null; 

    // 2. Define the mandatory condition: Fetch all "Published" ('2') and "Withdrawn" ('3') posts for everyone.
    let queryConditions = [
      { statusCode: { $in: ['2', '3'] } }, // MODIFIED: Include '3' (Withdrawn) posts for public view
    ];

    // 3. Add the author-only condition IF the user is logged in.
    if (userId) {
      queryConditions.push({
        author: userId,
        // Include the author's own drafted ('0') and edited/pending ('1') posts.
        statusCode: { $in: ['0', '1'] }
      });
    }

    // 4. Combine conditions using $or.
    let query = {
      $or: queryConditions
    };

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

// --- NEW FUNCTION: withdrawPost ---
const withdrawPost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user._id;

    // 1. Find the post and check authorization
    const post = await postModel.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Must be the author
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: "You are not authorized to withdraw this post." });
    }

    // Must be a published post (statusCode '2') to be withdrawn
    if (post.statusCode !== '2') {
        return res.status(400).json({ message: "Only published posts can be withdrawn." });
    }

    // 2. Update the status code to '3' (Withdrawn)
    post.statusCode = '3';
    await post.save();
    
    // 3. Populate and return the updated post
    await post.populate('author', 'username _id');
    res.json(post);
  } catch (error) {
    console.error("Error withdrawing post:", error);
    res.status(500).json({ message: "Error withdrawing post" });
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
      queryFilter.statusCode = '2';
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
    const postId = req.params.id;
    const { content, statusCode } = req.body;
    const userId = req.user._id;

    const post = await postModel.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    if (post.statusCode === '3') {
        return res.status(400).json({ message: "Withdrawn posts cannot be edited." });
    }
    if (post.author.toString() !== userId.toString()) {
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
    const userId = req.user._id;

    const post = await postModel.findById(postId).populate('author', 'level');

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const isAuthor = post.author._id.toString() === userId.toString();
    const hasAdminRights = parseInt(req.user.level) >= 7;
    const isPublished = post.statusCode === '2';
    // --- NEW: Check if the post is withdrawn ---
    const isWithdrawn = post.statusCode === '3'; 
    // ------------------------------------------

    // --- MODIFIED AUTHORIZATION LOGIC ---
    // 1. Author can delete if it's not published AND not withdrawn. (i.e., it's '0' or '1')
    const canAuthorDelete = isAuthor && !isPublished && !isWithdrawn;
    // 2. Admin can delete other users' posts if they have admin rights and are not the author. 
    //    An admin should also be blocked from deleting a withdrawn post to prepare for the "repost" feature.
    const canAdminDelete = hasAdminRights && !isAuthor && !isWithdrawn;
    
    if (isWithdrawn) {
        return res.status(400).json({ message: "Withdrawn posts cannot be deleted." });
    }
    
    if (!canAuthorDelete && !canAdminDelete) {
        return res.status(403).json({ message: "You are not authorized to delete this post." });
    }
    // END MODIFIED AUTHORIZATION LOGIC

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
  getPostsByAuthorId,
  withdrawPost
};