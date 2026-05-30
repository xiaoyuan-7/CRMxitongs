// Debug endpoint - add to server.js temporarily
router.post('/debug', (req, res) => {
    console.log('Full body:', JSON.stringify(req.body));
    console.log('target_company value:', req.body.target_company);
    console.log('typeof:', typeof req.body.target_company);
    res.json(req.body);
});