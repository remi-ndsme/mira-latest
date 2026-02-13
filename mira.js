import "dotenv/config.js";
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { Client, GatewayIntentBits } from 'discord.js';
import express from 'express';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.on('ready', () => {
    console.log(`${new Date().toString()} : YOUR MAID is MENYALA🔥🔥🔥🔥!`);
});

const CHANNELS = process.env.CH_ID;

const chatHistories = new Map();

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content.startsWith('/')) return;

    if (!CHANNELS.includes(message.channelId) && !message.mentions.has(client.user)) return;

    await message.channel.sendTyping();
    const sendTypingInterval = setInterval(() => {
        message.channel.sendTyping();
    }, 5000);

    const API_KEY = process.env.GOOGLE_API_KEY;
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: "Your name is mira. your main language is Indonesian. you are my roommate. reply with dialog dont reply with gestures. You can describe the image",
        safetySettings: [
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            },
        ],
    });

    const channelId = message.channelId;
    let history = chatHistories.get(channelId) || [];

    async function generateContent() {
        try {
            if (message.content === "masok") {
                message.channel.send('nice');
            } else {
                let prompt = message.content;
                let imageData = [];

                if (message.attachments.size > 0) {
                    for (const [id, attachment] of message.attachments) {
                        const response = await fetch(attachment.url);
                        const imageBuffer = await response.arrayBuffer();
                        imageData.push({
                            inlineData: {
                                data: Buffer.from(imageBuffer).toString('base64'),
                                mimeType: attachment.contentType
                            }
                        });
                    }
                }

                const chat = model.startChat({
                    history,
                    generationConfig: {
                        temperature: 0.7,
                    }
                });

                let result;
                if (imageData.length > 0) {
                    result = await chat.sendMessageStream([prompt, ...imageData]);
                } else {
                    result = await chat.sendMessageStream(prompt);
                }

                let buffer = [];
                for await (let response of result.stream) {
                    const text = await response.text();
                    buffer.push(text);
                }
                const responseText = buffer.join('');
                await message.channel.send(responseText);

                history.push({
                    role: "user",
                    parts: imageData.length > 0 ? [{ text: prompt }, ...imageData] : [{ text: prompt }]
                });

                history.push({
                    role: "model",
                    parts: [{ text: responseText }],
                });
                chatHistories.set(channelId, history);
            }
        } catch (error) {
            console.error(`${new Date().toString()} : generateContent() is fail:\n`, error);
            message.channel.send(`sorry...? i didn't hear you.`);
        }
        finally {
            console.log(`message send! : ${new Date().toString()}`);
            clearInterval(sendTypingInterval);
        }
    }
    generateContent();
});

client.login(process.env.DISCORD_TOKEN);

const app = express();
const port = 3000;

// Basic console web interface
app.get('/', (req, res) => {
    const html = `
        <html>
            <head>
                <title>Mira Bot Console</title>
                <style>
                    body { font-family: Arial; padding: 20px; }
                    .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
                    .online { background-color: #dff0d8; }
                    .stats { background-color: #f5f5f5; padding: 15px; }
                </style>
            </head>
            <body>
                <h1>Mira Bot Console</h1>
                <div class="status online">
                    Status: ${client.user ? 'Online' : 'Offline'}
                </div>
                <div class="stats">
                    <p>Serving in ${client.guilds.cache.size} servers</p>
                    <p>Active channels: ${CHANNELS.split(',').length}</p>
                    <p>Chat histories: ${chatHistories.size} channels</p>
                </div>
            </body>
        </html>
    `;
    res.send(html);
});

// Enable trust proxy if behind a reverse proxy
app.enable('trust proxy');

// Add security headers
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Web console running on port ${PORT}`);
});

