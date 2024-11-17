const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', function connection(ws) {
    console.log('Client connected');

    ws.on('message', function incoming(message) {
        const data = JSON.parse(message);
        console.log('Received from client:', data);

        // Handle 'stream-message' events from the client
        if (data.event === 'stream-message') {
            console.log('Streamed message from Claude:', data.message);
        }
        if (data.event === 'message-complete') {
            console.log('Completed message from Claude:', data.message);
        }
    });

    // Send a 'new-chat' event after 2 seconds
    setTimeout(() => {
        ws.send(JSON.stringify({ event: 'new-chat' }));
    }, 6000);

    // Send a 'send-user-message' event after 4 seconds
    setTimeout(() => {
        ws.send(JSON.stringify({ event: 'send-user-message', message: 'Hello, Claude!' }));
    }, 8000);

    // Send a 'send-user-message' event after 4 seconds
    setTimeout(() => {
        ws.send(JSON.stringify({ event: 'send-user-message', message: 'Testing this interaction' }));
    }, 14000);
});
