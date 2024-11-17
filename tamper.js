// ==UserScript==
// @name         Claude Interact via WebSocket
// @namespace    http://tampermonkey.net/
// @version      2024-11-17
// @description  Interact with Claude.ai chat pages via WebSocket communication
// @author       Tycho
// @match        https://claude.ai/*
// @grant        none
// @connect      localhost
// @inject-into  content
// ==/UserScript==

(function () {
    'use strict';

    // Replace with your server's WebSocket address
    const tmSocket = new WebSocket('ws://localhost:8080');

    tmSocket.addEventListener('open', function () {
        console.log('WebSocket connection established');
        tmSocket.send(JSON.stringify({ type: 'connected', message: 'Tampermonkey script connected' }));
    });

    tmSocket.addEventListener('message', function (event) {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
    });

    tmSocket.addEventListener('close', function () {
        console.log('WebSocket connection closed');
    });

    tmSocket.addEventListener('error', function (error) {
        console.error('WebSocket error:', error);
    });

    // **Declare and initialize lastSentMessages**
    const lastSentMessages = new Map();

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
            // Wait for the new chat page to load
            onPageChange();
        } else {
            console.error('"Start new chat" button not found');
        }
    }

    // Use the method that works best for sending messages
    const useSendButton = true;

    function sendMessageToChat(message) {
        const messageInputSelector = 'div[contenteditable="true"].ProseMirror';

        waitForElement(messageInputSelector)
            .then((messageInput) => {
                messageInput.focus();
                messageInput.innerHTML = '';
                document.execCommand('insertText', false, message);

                if (useSendButton) {
                    // Wait for the Send button
                    const sendButtonSelector = 'button[aria-label="Send Message"]';
                    waitForElement(sendButtonSelector, 5000)
                        .then((sendButton) => {
                            if (!sendButton.disabled) {
                                sendButton.click();
                                console.log('Message sent by clicking Send button:', message);
                                // Handle potential page change after sending message
                                onPageChange();
                            } else {
                                console.error('Send button is disabled');
                            }
                        })
                        .catch((error) => {
                            console.error('Send button not found:', error);
                        });
                } else {
                    // Simulate pressing 'Enter' key
                    const enterEvent = new KeyboardEvent('keydown', {
                        bubbles: true,
                        cancelable: true,
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                    });
                    messageInput.dispatchEvent(enterEvent);

                    console.log('Message sent by simulating Enter key:', message);
                    // Handle potential page change after sending message
                    onPageChange();
                }
            })
            .catch((error) => {
                console.error('Message input field not found:', error);
            });
    }

    function observeChatMessages() {
        console.log('observeChatMessages() function called');
        const chatContainerSelector = 'div.flex-1 > div.flex.flex-col.gap-3';

        waitForElement(chatContainerSelector)
            .then((chatContainer) => {
                console.log('Chat container found:', chatContainer);
                initializeObserver(chatContainer);
            })
            .catch((error) => {
                console.error('Chat container not found:', error);
            });
    }

    let chatObserver;

    function initializeObserver(chatContainer) {
        if (chatObserver) {
            chatObserver.disconnect();
            console.log('Disconnected previous MutationObserver');
        }

        console.log('Initializing MutationObserver on chat container:', chatContainer);
        chatObserver = new MutationObserver((mutationsList) => {
            // console.log('MutationObserver callback triggered');
            for (const mutation of mutationsList) {
                // console.log('Observed mutation:', mutation);
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            processMessageNode(node);
                        }
                    });
                } else if (mutation.type === 'characterData') {
                    const parentNode = mutation.target.parentNode;
                    if (parentNode) {
                        processMessageNode(parentNode);
                    }
                }
            }
        });

        chatObserver.observe(chatContainer, {
            childList: true,
            subtree: true,
            characterData: true,
            characterDataOldValue: true,
        });

        console.log('Started observing chat messages');
    }

    function processMessageNode(node) {
        // Check for assistant message
        let messageDiv = node.querySelector('div.font-claude-message');
        if (messageDiv) {
            // Generate or retrieve a unique message ID
            let messageId = messageDiv.dataset.messageId;
            if (!messageId) {
                messageId = 'message-' + Math.random().toString(36).substr(2, 9);
                messageDiv.dataset.messageId = messageId;
            }

            const messageText = extractMessageText(messageDiv);

            const lastSentText = lastSentMessages.get(messageId) || '';

            if (messageText !== lastSentText) {
                lastSentMessages.set(messageId, messageText);

                console.log('New message from Claude:', messageText);

                if (tmSocket.readyState === WebSocket.OPEN) {
                    tmSocket.send(JSON.stringify({ event: 'stream-message', message: messageText }));
                    console.log('Sent message to server:', messageText);
                } else {
                    console.error('WebSocket is not open');
                }
            }

            // Check if the assistant has finished responding
            if (isMessageComplete()) {
                console.log('Assistant message is complete.');

                // Send a final event indicating completion
                tmSocket.send(JSON.stringify({ event: 'message-complete', message: messageText }));

                // Clean up stored message
                lastSentMessages.delete(messageId);
            }

            return;
        }

        // Handle user messages if needed
    }

    function isMessageComplete() {
        // Check if the "Stop Response" button is present
        const stopButton = document.querySelector('button[aria-label="Stop Response"]');
        return !stopButton;
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
                    reject(
                        new Error(`Element with selector "${selector}" not found within timeout`)
                    );
                }
                elapsedTime += interval;
            }, interval);
        });
    }

    // Function to handle page changes
    function onPageChange() {
        console.log('Page changed, re-initializing observers and event listeners');
        observeChatMessages();
        // Add any other initialization functions as needed
    }

    // Monitor URL changes
    let currentURL = window.location.href;

    function checkURLChange() {
        if (currentURL !== window.location.href) {
            console.log('URL changed from', currentURL, 'to', window.location.href);
            currentURL = window.location.href;
            onPageChange();
        }
    }

    setInterval(checkURLChange, 500);

    // Start observing chat messages when the page loads
    window.addEventListener('load', () => {
        observeChatMessages();
    });
})();
