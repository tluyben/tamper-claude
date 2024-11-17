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
    const debounceTimers = new Map();
    const lastUpdateTimes = new Map();

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

   /* function initializeObserver(chatContainer) {
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
    }*/

/*function processMessageNode(node) {
    // Check for assistant message
    let messageDiv = node.querySelector('div.font-claude-message');
    if (messageDiv) {
        // Expand code blocks if necessary
        expandAllCodeBlocks(messageDiv);

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
}*/
        /*function processMessageNode(node) {
        // Check if node is a text node
        if (node.nodeType === Node.TEXT_NODE) {
            node = node.parentNode;
        }

        // Find the message container
        let messageDiv = node.closest('div.font-claude-message');
        if (messageDiv) {
            // Expand code blocks if necessary
            expandAllCodeBlocks(messageDiv);

            // Generate or retrieve a unique message ID
            let messageId = messageDiv.dataset.messageId;
            if (!messageId) {
                messageId = 'message-' + Math.random().toString(36).substr(2, 9);
                messageDiv.dataset.messageId = messageId;
            }

            const messageText = extractMessageText(messageDiv);

            const lastSentText = lastSentMessages.get(messageId) || '';

            const DEBOUNCE_DELAY = 200; // milliseconds

            // Clear any existing timer for this messageId
            clearTimeout(debounceTimers.get(messageId));

            // Set a new debounce timer
            const timer = setTimeout(() => {
                // Send the message after the delay
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

                    // Clean up stored message and timer
                    lastSentMessages.delete(messageId);
                    debounceTimers.delete(messageId);
                }
            }, DEBOUNCE_DELAY);

            debounceTimers.set(messageId, timer);

            return;
        }

        // Handle user messages if needed
    }*/

   /* function processMessageNode(node) {
    // Check if node is a text node
    if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
    }

    let messageDiv = node.closest('div.font-claude-message');
    if (messageDiv) {
        // Expand code blocks only once
        if (!messageDiv.dataset.codeBlocksExpanded) {
            expandAllCodeBlocks(messageDiv);
            messageDiv.dataset.codeBlocksExpanded = 'true';
        }

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

            if (tmSocket.readyState === WebSocket.OPEN) {
                tmSocket.send(JSON.stringify({ event: 'stream-message', message: messageText }));
            }
        }

        // Check if the assistant has finished responding
        const isStreamingElement = messageDiv.closest('[data-is-streaming]');
        const isStreaming = isStreamingElement ? isStreamingElement.getAttribute('data-is-streaming') : 'false';

        if (isStreaming === 'false' && !messageDiv.dataset.messageComplete) {
            tmSocket.send(JSON.stringify({ event: 'message-complete', message: messageText }));
            lastSentMessages.delete(messageId);
            debounceTimers.delete(messageId);
            messageDiv.dataset.messageComplete = 'true';
        }

        return;
    }

    // Handle user messages if needed
}*/
   /*function processMessageNode(node) {
    // Check if node is a text node
    if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
    }

    let messageDiv = node.closest('div.font-claude-message');
    if (messageDiv) {
        // Expand code blocks only once
        if (!messageDiv.dataset.codeBlocksExpanded) {
            expandAllCodeBlocks(messageDiv);
            messageDiv.dataset.codeBlocksExpanded = 'true';
        }

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

            if (tmSocket.readyState === WebSocket.OPEN) {
                tmSocket.send(JSON.stringify({ event: 'stream-message', message: messageText }));
            }
        }

        // Check if the assistant has finished responding
        if (isMessageComplete() && !messageDiv.dataset.messageComplete) {
            tmSocket.send(JSON.stringify({ event: 'message-complete', message: messageText }));
            lastSentMessages.delete(messageId);
            debounceTimers.delete(messageId);
            messageDiv.dataset.messageComplete = 'true';
        }

        return;
    }

    // Handle user messages if needed
}*/
function processMessageNode(node) {
    // Check if node is a text node
    if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
    }

    let messageDiv = node.closest('div.font-claude-message');
    if (messageDiv) {
        // Expand code blocks only once
        if (!messageDiv.dataset.codeBlocksExpanded) {
            expandAllCodeBlocks(messageDiv);
            messageDiv.dataset.codeBlocksExpanded = 'true';
        }

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

            if (tmSocket.readyState === WebSocket.OPEN) {
                tmSocket.send(JSON.stringify({ event: 'stream-message', message: messageText }));
            }
        }

        // Update last update time
        lastUpdateTimes.set(messageId, Date.now());

        // Clear existing completion timer
        clearTimeout(debounceTimers.get(messageId));

        // Start a new completion timer
        const COMPLETION_DELAY = 1000; // 1 second
        const timer = setTimeout(() => {
            const now = Date.now();
            const lastUpdateTime = lastUpdateTimes.get(messageId) || 0;
            if (now - lastUpdateTime >= COMPLETION_DELAY) {
                // No updates in the last COMPLETION_DELAY milliseconds
                if (!messageDiv.dataset.messageComplete) {
                    tmSocket.send(JSON.stringify({ event: 'message-complete', message: messageText }));
                    lastSentMessages.delete(messageId);
                    lastUpdateTimes.delete(messageId);
                    messageDiv.dataset.messageComplete = 'true';

                    // Clear the debounce timer
                    debounceTimers.delete(messageId);
                }
            }
        }, COMPLETION_DELAY);

        debounceTimers.set(messageId, timer);

        return;
    }

    // Handle user messages if needed
}

function extractMessageText(messageDiv) {
    const clone = messageDiv.cloneNode(true);

    const unwantedElements = clone.querySelectorAll('div.text-text-400.line-clamp-1.text-xs.min-h-4');
    unwantedElements.forEach(elem => elem.remove());

    let messageText = '';

    const elements = clone.querySelectorAll('p, li, pre');
    elements.forEach(elem => {
        if (elem.tagName === 'PRE') {
            const codeElem = elem.querySelector('code');
            if (codeElem) {
                const codeLanguage = codeElem.className || '';
                const codeContent = codeElem.innerText;
                messageText += `\n\`\`\`${codeLanguage}\n${codeContent}\n\`\`\`\n`;
            } else {
                messageText += `\n\`\`\`\n${elem.innerText}\n\`\`\`\n`;
            }
        } else {
            messageText += '\n' + elem.innerText;
        }
    });

    return messageText.trim();
}

    function expandAllCodeBlocks(messageDiv) {
        const expandButtons = messageDiv.querySelectorAll('div.text-text-400.line-clamp-1.text-xs.min-h-4');
        expandButtons.forEach(button => {
            button.click();
        });
    }

    /*function extractMessageText(messageDiv) {
        // Clone the messageDiv to avoid modifying the original
        const clone = messageDiv.cloneNode(true);

        // Expand any code blocks (if not already expanded)
        expandAllCodeBlocks(clone);

        // Remove any 'Click to open code' elements
        const unwantedElements = clone.querySelectorAll('div.text-text-400.line-clamp-1.text-xs.min-h-4');
        unwantedElements.forEach(elem => elem.remove());

        // Initialize message text
        let messageText = '';

        // Extract content, including code blocks
        const elements = clone.querySelectorAll('p, li, pre, code, div');
        elements.forEach(elem => {
            if (elem.tagName === 'PRE' || elem.tagName === 'CODE') {
                // Handle code blocks
                messageText += '\n```' + (elem.className || '') + '\n' + elem.innerText + '\n```\n';
            } else {
                // Regular text
                messageText += '\n' + elem.innerText;
            }
        });

        messageText = messageText.trim();

        return messageText;
    }*/


function isMessageComplete() {
    // Check if the "Stop Response" button is present
    const stopButton = document.querySelector('button[aria-label="Stop Response"]');
    return !stopButton;
}

function initializeObserver(chatContainer) {
    if (chatObserver) {
        chatObserver.disconnect();
        console.log('Disconnected previous MutationObserver');
    }

    console.log('Initializing MutationObserver on chat container:', chatContainer);
    chatObserver = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                processMessageNode(mutation.target);
            }
        }
    });

    chatObserver.observe(chatContainer, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: false,
    });

    console.log('Started observing chat messages');
}
    /*
    function isMessageComplete() {
        // Check if the LLM is still streaming
        const streamingIndicator = document.querySelector('[data-is-streaming="true"]');
        return !streamingIndicator;
    }


function initializeObserver(chatContainer) {
    if (chatObserver) {
        chatObserver.disconnect();
        console.log('Disconnected previous MutationObserver');
    }

    console.log('Initializing MutationObserver on chat container:', chatContainer);
    chatObserver = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                processMessageNode(mutation.target);
            } else if (mutation.type === 'attributes') {
                // Check if data-is-streaming changed
                const target = mutation.target;
                if (mutation.attributeName === 'data-is-streaming') {
                    const isStreaming = target.getAttribute('data-is-streaming');
                    if (isStreaming === 'false') {
                        // Message is complete
                        processMessageNode(target);
                    }
                }
            }
        }
    });

    chatObserver.observe(chatContainer, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['data-is-streaming'],
    });

    console.log('Started observing chat messages');
}*/

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
