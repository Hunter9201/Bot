const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Serve your HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Telegram API endpoint
app.post('/api/save-to-telegram', async (req, res) => {
    try {
        const { userData, botToken, channelId, userId } = req.body;
        
        if (!botToken || !channelId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Bot token and channel ID required' 
            });
        }

        const timestamp = new Date().toISOString();
        const messageText = `STUDY_PLANNER:${userId}:${timestamp}\n${JSON.stringify(userData)}`;
        
        const telegramResponse = await axios.post(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
                chat_id: channelId,
                text: messageText,
                parse_mode: 'HTML'
            }
        );

        res.json({ 
            success: true, 
            messageId: telegramResponse.data.result.message_id 
        });
        
    } catch (error) {
        console.error('Telegram API error:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            error: error.response?.data?.description || error.message 
        });
    }
});

// Load data from Telegram
app.post('/api/load-from-telegram', async (req, res) => {
    try {
        const { botToken, channelId, userId } = req.body;
        
        if (!botToken || !channelId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Bot token and channel ID required' 
            });
        }

        const response = await axios.get(
            `https://api.telegram.org/bot${botToken}/getChatHistory`,
            {
                params: {
                    chat_id: channelId,
                    limit: 100
                }
            }
        );

        const messages = response.data.result;
        const userMessages = messages.filter(msg => 
            msg.text && msg.text.startsWith(`STUDY_PLANNER:${userId}:`)
        );

        if (userMessages.length === 0) {
            return res.json({ success: true, data: null });
        }

        // Get latest message
        const latestMessage = userMessages[0];
        const dataText = latestMessage.text.split('\n')[1];
        
        res.json({ 
            success: true, 
            data: JSON.parse(dataText),
            lastUpdated: latestMessage.date
        });
        
    } catch (error) {
        console.error('Telegram API error:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            error: error.response?.data?.description || error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Study Planner Server running on http://localhost:${PORT}`);
});
