const cron = require('node-cron');
const postModel = require('./models/postModel');

// A cron job that runs every minute
cron.schedule('* * * * *', async () => {
    console.log('Running a scheduled task to update post statuses...');
    try {
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
        
        // MODIFIED LOGIC: 
        // Find all posts with statusCode '0' or '1' that were created (or last edited/reset) more than 3 hours ago
        const postsToUpdate = await postModel.find({
            // Check for posts that are in the initial ('0') or pending edit ('1') state
            statusCode: { $in: ['0', '1'] }, 
            // Check if the post's creation time (reset on edit) is 3 hours or older
            createdAt: { $lte: threeHoursAgo }
        });

        // Update the statusCode of each found post to '2' (Published/Public)
        if (postsToUpdate.length > 0) {
            const postIds = postsToUpdate.map(post => post._id);
            await postModel.updateMany(
                { _id: { $in: postIds } },
                { $set: { statusCode: '2' } } // Set status to 2 (Published)
            );
            console.log(`Updated status for ${postsToUpdate.length} posts to status '2'.`);
        }
    } catch (error) {
        console.error("Error in scheduled post update task:", error);
    }
});