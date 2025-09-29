const cron = require('node-cron');
const postModel = require('./models/postModel');

// A cron job that runs every minute
cron.schedule('* * * * *', async () => {
    console.log('Running a scheduled task to update post statuses...');
    try {
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
        
        // Find all posts with statusCode '0' that were created more than 3 hours ago
        const postsToUpdate = await postModel.find({
            statusCode: '0',
            createdAt: { $lte: threeHoursAgo }
        });

        // Update the statusCode of each found post to '1'
        if (postsToUpdate.length > 0) {
            const postIds = postsToUpdate.map(post => post._id);
            await postModel.updateMany(
                { _id: { $in: postIds } },
                { $set: { statusCode: '1' } }
            );
            console.log(`Updated status for ${postsToUpdate.length} posts.`);
        }
    } catch (error) {
        console.error("Error in scheduled post update task:", error);
    }
});