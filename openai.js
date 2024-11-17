const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Create a WebSocket server
const wss = new WebSocket.Server({ port: 8080 });
let tmWebSocket = null;
let tmWebSocketReady = false;
let waitingClients = [];

wss.on('connection', function connection(ws) {
    console.log('Tampermonkey client connected');
    tmWebSocket = ws;
    tmWebSocketReady = true;

    ws.on('message', function incoming(message) {
        const data = JSON.parse(message);

        // Handle messages from Tampermonkey
        handleTampermonkeyMessage(data);
    });

    ws.on('close', () => {
        console.log('Tampermonkey client disconnected');
        tmWebSocket = null;
        tmWebSocketReady = false;
    });
});

function handleTampermonkeyMessage(data) {
    if (waitingClients.length === 0) {
        console.warn('No waiting clients to send data to.');
        return;
    }

    if (data.event === 'stream-message') {
        const client = waitingClients[0];
        client.write(`data: ${JSON.stringify(formatAssistantMessage(data.message))}\n\n`);
    } else if (data.event === 'message-complete') {
        const client = waitingClients.shift();
        client.write(`data: [DONE]\n\n`);
        client.end();
    }
}

function formatAssistantMessage(content) {
    return {
        choices: [{
            delta: { content },
            index: 0,
            finish_reason: null,
        }],
        object: 'chat.completion.chunk',
    };
}

app.post('/v1/chat/completions', async (req, res) => {
    const { messages, stream } = req.body;

    if (!tmWebSocketReady) {
        return res.status(503).json({ error: 'Assistant not ready' });
    }

    // Extract the latest user message
    const userMessages = messages.filter(msg => msg.role === 'user');
    const userMessage = userMessages[userMessages.length - 1].content;

    // Send the message to the Tampermonkey script
    tmWebSocket.send(JSON.stringify({ event: 'send-user-message', message: userMessage }));

    if (stream) {
        // Set headers for SSE (Server-Sent Events)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Add the response object to the waitingClients queue
        waitingClients.push(res);
    } else {
        // Handle non-streaming response
        let fullMessage = '';

        function onData(data) {
            fullMessage += data.message;
        }

        function onComplete() {
            res.json({
                id: `chatcmpl-${Date.now()}`,
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                choices: [{
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: fullMessage,
                    },
                    finish_reason: 'stop',
                }],
            });
        }

        // Bind event handlers
        tmWebSocket.on('message', function incoming(message) {
            const data = JSON.parse(message);

            if (data.event === 'stream-message') {
                onData(data);
            } else if (data.event === 'message-complete') {
                onComplete();
            }
        });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
