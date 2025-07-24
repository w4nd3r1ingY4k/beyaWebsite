import express from 'express';
const pipedreamRouter = express.Router();

// POST /workflow
pipedreamRouter.post('/workflow', async (req, res) => {
    const { userRequest, externalUserId } = req.body;
    if (!userRequest) {
        return res.status(400).json({ error: 'userRequest is required' });
    }
    try {
        const result = await runWorkflow(userRequest, externalUserId || 'test-user-123');
        return res.status(200).json({ response: result });
    } catch (error) {
        console.error('🔥 Workflow error:', error);
        return res.status(500).json({
            error: error.message || 'Internal Server Error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// POST /debug/list-tools
pipedreamRouter.post('/debug/list-tools', async (req, res) => {
    const { appSlug, externalUserId } = req.body;
    if (!appSlug) {
        return res.status(400).json({ error: 'appSlug is required' });
    }
    try {
        // You may need to import pd from app-setup.js
        const accessToken = await pd.rawAccessToken();
        const tools = await debugListTools(appSlug, accessToken, externalUserId || 'test-user-123');
        return res.status(200).json({ tools });
    } catch (error) {
        console.error('🔥 Debug error:', error);
        return res.status(500).json({ error: error.message });
    }
});

// POST /debug/check-connection
pipedreamRouter.post('/debug/check-connection', async (req, res) => {
    const { appSlug, externalUserId } = req.body;
    if (!appSlug) {
        return res.status(400).json({ error: 'appSlug is required' });
    }
    try {
        const credentials = await getConnectedAccountCredentials(appSlug, externalUserId || 'test-user-123');
        if (credentials) {
            return res.status(200).json({
                connected: true,
                hasAccessToken: !!credentials.access_token,
                appSlug: appSlug
            });
        } else {
            return res.status(200).json({
                connected: false,
                appSlug: appSlug
            });
        }
    } catch (error) {
        console.error('🔥 Connection check error:', error);
        return res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
pipedreamRouter.get("/health", (req, res) => {
    res.json({
        status: "ok",
        environment: process.env.PIPEDREAM_PROJECT_ENVIRONMENT,
        timestamp: new Date().toISOString()
    });
});

// Export pipedreamRouter
export default pipedreamRouter; 