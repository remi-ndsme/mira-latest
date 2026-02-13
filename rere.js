import "dotenv/config.js";
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";
import { Client, GatewayIntentBits } from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const CHANNELS = process.env.CH_ID;

const chatHistories = new Map();
const MAX_HISTORY = 10; // Set maximum number of messages to keep in history

// Clear chat histories on bot startup
client.on("ready", () => {
  chatHistories.clear();
  console.log(`${new Date().toString()} : YOUR MAID is MENYALA🔥🔥🔥🔥!`);
});

// Handle slash commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options } = interaction;

  try {
    if (commandName === "ping") {
      await interaction.reply(`🏓 Pong! Latency bot: ${client.ws.ping}ms`);
    } else if (commandName === "active-dev-badge") {
      const targetUser = options.getUser("user") || interaction.user;
      try {
        const userData = await client.users.fetch(targetUser.id, { force: true });
        const hasDevBadge = (userData.flags?.bitfield & 4) === 4; // 4 = DISCORD_DEVELOPER badge
        
        if (hasDevBadge) {
          await interaction.reply(`✨ **${targetUser.username}** memiliki badge **Discord Developer**! 🚀`);
        } else {
          await interaction.reply(`❌ **${targetUser.username}** tidak memiliki Discord Developer Badge.\n\nUntuk mendapatkannya, buat aplikasi di [Discord Developer Portal](https://discord.com/developers/applications) dan daftarkan di program Discord Developer.`);
        }
      } catch (error) {
        console.error("Error fetching user badges:", error);
        await interaction.reply("Maaf, tidak bisa mengecek badge user tersebut.");
      }
    } else if (commandName === "weather") {
      const city = options.getString("city");
      await interaction.reply(`🌤️ Cuaca untuk ${city}: Sedang memproses...`);
    } else if (commandName === "feel") {
      const feeling = options.getString("feeling");
      await interaction.reply(`💭 Perasaan Anda: ${feeling}`);
    }
  } catch (error) {
    console.error(`Error handling command ${commandName}:`, error);
    if (interaction.replied) {
      await interaction.followUp("Maaf, ada kesalahan saat memproses perintah.");
    } else {
      await interaction.reply("Maaf, ada kesalahan saat memproses perintah.");
    }
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.content.startsWith("/")) return;

  if (
    !CHANNELS.includes(message.channelId) &&
    !message.mentions.has(client.user)
  )
    return;

  await message.channel.sendTyping();
  const sendTypingInterval = setInterval(() => {
    message.channel.sendTyping();
  }, 5000);

  const API_KEY = process.env.GOOGLE_API_KEY;
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction:
      "Your name is sheren call me rem sifat : Introspektif/Penuh Perenungan Misterius Tenang/Kalem Sensitif/Tangguh Batin",
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

  // Trim history if it gets too long
  if (history.length >= MAX_HISTORY * 2) {
    // multiply by 2 because each interaction has user + bot message
    history = history.slice(-MAX_HISTORY * 2);
  }

  async function generateContent() {
    try {
      if (message.content === "masok") {
        message.channel.send("nice");
      } else {
        let prompt = message.content;
        let imageData = [];

        if (message.attachments.size > 0) {
          for (const [id, attachment] of message.attachments) {
            const response = await fetch(attachment.url);
            const imageBuffer = await response.arrayBuffer();
            imageData.push({
              inlineData: {
                data: Buffer.from(imageBuffer).toString("base64"),
                mimeType: attachment.contentType,
              },
            });
          }
        }

        const chat = model.startChat({
          history,
          generationConfig: {
            temperature: 1.5,
          },
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
        const responseText = buffer.join("");

        // Split message if it's too long (Discord's limit is 2000 characters)
        const chunks = responseText.match(/(.|[\r\n]){1,1950}/g) || [];

        for (const chunk of chunks) {
          try {
            await message.channel.send(chunk);
          } catch (sendError) {
            console.error(`Failed to send message: ${sendError}`);
            await message.channel.send(
              "Maaf, ada masalah saat mengirim pesan."
            );
            break;
          }
        }

        // Update history only if message was sent successfully
        history.push({
          role: "user",
          parts:
            imageData.length > 0
              ? [{ text: prompt }, ...imageData]
              : [{ text: prompt }],
        });

        history.push({
          role: "model",
          parts: [{ text: responseText }],
        });

        // Ensure history doesn't exceed max length
        if (history.length > MAX_HISTORY * 2) {
          history = history.slice(-MAX_HISTORY * 2);
        }

        chatHistories.set(channelId, history);
      }
    } catch (error) {
      console.error(
        `${new Date().toString()} : generateContent() error:\n`,
        error
      );
      await message.channel.send("Maaf, ada kesalahan. Silakan coba lagi.");
    } finally {
      clearInterval(sendTypingInterval);
      console.log(`Message processed: ${new Date().toString()}`);
    }
  }
  generateContent();
});

client.login(process.env.DISCORD_TOKEN);
