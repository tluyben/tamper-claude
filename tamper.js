// ==UserScript==
// @name         Claude Interact via WebSocket
// @namespace    http://tampermonkey.net/
// @version      2024-11-17
// @description  Interact with Claude.ai chat pages via WebSocket communication
// @author       Tycho
// @match        https://claude.ai/*
// @grant        none
// @connect      localhost
// ==/UserScript==

(function() {
    'use strict';

    // Replace with your server's WebSocket address
    const socket = new WebSocket('ws://localhost:8080');

    socket.addEventListener('open', function () {
        console.log('WebSocket connection established');
        socket.send(JSON.stringify({ type: 'connected', message: 'Tampermonkey script connected' }));
    });

    socket.addEventListener('message', function (event) {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
    });

    socket.addEventListener('close', function () {
        console.log('WebSocket connection closed');
    });

    socket.addEventListener('error', function (error) {
        console.error('WebSocket error:', error);
    });

    function handleServerMessage(data) {
        switch (data.event) {
            case 'new-chat':
                startNewChat();
                break;
            case 'send-user-message':
                sendMessageToChat(data.message);
                break;
            // Add more event cases as needed
            default:
                console.warn('Unknown event:', data.event);
        }
    }

    function startNewChat() {
        const startChatButton = document.querySelector('a[href="/new"]');

        if (startChatButton) {
            startChatButton.click();
            console.log('Clicked "Start new chat" button');
        } else {
            console.error('"Start new chat" button not found');
        }
    }

    function sendMessageToChat(message) {
        // Updated selector to target the message input field
        const messageInputSelector = 'div[contenteditable="true"].ProseMirror';

        waitForElement(messageInputSelector)
            .then((messageInput) => {
                messageInput.focus();
                messageInput.innerHTML = '';
                document.execCommand('insertText', false, message);

                // Find the Send button
                const sendButtonSelector = 'button[aria-label="Send Message"]';
                const sendButton = document.querySelector(sendButtonSelector);

                if (sendButton) {
                    // Simulate a click on the Send button
                    sendButton.click();
                    console.log('Message sent:', message);
                } else {
                    console.error('Send button not found');
                }
            })
            .catch((error) => {
                console.error('Message input field not found:', error);
            });
    }


    function observeChatMessages() {
        const chatContainerSelector = 'div.flex-1.flex.flex-col.gap-3.px-4.max-w-3xl.mx-auto.w-full.pt-1';

        waitForElement(chatContainerSelector)
            .then((chatContainer) => {
                const observer = new MutationObserver((mutationsList) => {
                    for (const mutation of mutationsList) {
                        if (mutation.type === 'childList') {
                            mutation.addedNodes.forEach((node) => {
                                if (node.nodeType === Node.ELEMENT_NODE) {
                                    const messageDiv = node.querySelector('div.font-claude-message');
                                    if (messageDiv) {
                                        const messageText = extractMessageText(messageDiv);
                                        console.log('New message from Claude:', messageText);

                                        // Send the message back to the server
                                        socket.send(JSON.stringify({ event: 'stream-message', message: messageText }));
                                    }
                                }
                            });
                        }
                    }
                });

                observer.observe(chatContainer, { childList: true, subtree: true });
            })
            .catch((error) => {
                console.error('Chat container not found:', error);
            });
    }

    function extractMessageText(messageDiv) {
        // Extract the text content from the message div
        const messageText = messageDiv.innerText.trim();
        return messageText;
    }

    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const interval = 100;
            let elapsedTime = 0;

            const checkExist = setInterval(() => {
                const element = document.querySelector(selector);
                if (element) {
                    clearInterval(checkExist);
                    resolve(element);
                } else if (elapsedTime >= timeout) {
                    clearInterval(checkExist);
                    reject(new Error(`Element with selector "${selector}" not found within timeout`));
                }
                elapsedTime += interval;
            }, interval);
        });
    }

    // Start observing chat messages when the page loads
    window.addEventListener('load', () => {
        observeChatMessages();
    });

})();
