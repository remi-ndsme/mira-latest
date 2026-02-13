import 'dotenv/config'; 
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

client.on("ready", () => {
  console.log(`${new Date().toString()} : YOUR MAID is MENYALA🔥🔥🔥🔥!`);
});


const CHANNELS = process.env.CH_ID;

const chatHistories = new Map();

// Slash command handler to avoid "application did not respond"
client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === "active-dev-badge") {
      await interaction.reply(
        "Untuk mendapatkan Active Developer Badge, kunjungi https://discord.com/developers/active-developer dan ikuti instruksinya. Pastikan kamu sudah membuat aplikasi bot dan memiliki satu perintah terdaftar yang aktif."
      );
    } else if (interaction.commandName === "ping") {
      await interaction.reply("Pong! Mengukur koneksi...");
      const roundtripMs = Date.now() - interaction.createdTimestamp;
      const apiPing = Math.round(interaction.client.ws.ping);
      await interaction.editReply(
        `Pong! Waktu respons: ${roundtripMs}ms | WebSocket: ${apiPing}ms`
      );
    } else if (interaction.commandName === "weather") {
      const city = interaction.options.getString("city");
      if (!city) {
        await interaction.reply({
          content: "Mohon masukkan nama kota. Contoh: /weather city:Jakarta",
          ephemeral: true,
        });
        return;
      }
      await interaction.reply(`Mencari cuaca untuk kota: ${city}...`);
      // Di sini Anda bisa menambahkan logika untuk mengambil data cuaca dari API
      const apiKey = process.env.OPENWEATHER_API_KEY;
      const fetch = (...args) =>
        import("node-fetch").then(({ default: fetch }) => fetch(...args));
      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
            city
          )}&appid=${apiKey}`
        );
        if (!response.ok) {
          await interaction.editReply(
            `Gagal mengambil data cuaca untuk kota: ${city}. Pastikan nama kota benar.`
          );
          return;
        }
        const data = await response.json();
        const weather = data.weather[0].description;
        const temp = data.main.temp;
        const feelsLike = data.main.feels_like;
        const humidity = data.main.humidity;
        const wind = data.wind.speed;
        const country = data.sys.country;
        await interaction.editReply(
          `Cuaca di ${city}, ${country}:\n` +
            `🌤️ ${weather}\n` +
            `🌡️ Suhu: ${temp}°C (terasa seperti ${feelsLike}°C)\n` +
            `💧 Kelembapan: ${humidity}%\n` +
            `💨 Angin: ${wind} m/s`
        );
      } catch (err) {
        await interaction.editReply(
          `Terjadi kesalahan saat mengambil data cuaca: ${err.message}`
        );
      }
    } else if (interaction.commandName === "feel") {
      const feeling = interaction.options.getString("feeling");
      if (!feeling || typeof feeling !== "string" || !feeling.trim()) {
        await interaction.reply({
          content: "Silakan masukkan perasaanmu. Contoh: /feel feeling:senang",
          ephemeral: true,
        });
        return;
      }

      let response;
      switch (feeling.trim().toLowerCase()) {
        case "senang":
          response = "Senangnya! Aku ikut bahagia dengar kamu sedang senang 😊";
          break;
        case "sedih":
          response =
            "Aduh, jangan sedih ya. Mira di sini kalau kamu butuh teman cerita 🤗";
          break;
        case "marah":
          response =
            "Coba tarik napas dulu, ya. Kalau mau cerita, Mira siap mendengarkan 😌";
          break;
        case "takut":
          response = "Takut itu wajar kok. Mira temani kamu, jangan khawatir!";
          break;
        case "bingung":
          response =
            "Kalau bingung, coba ceritakan ke Mira. Siapa tahu bisa bantu!";
          break;
        default:
          response = `Mira mengerti kamu sedang merasa "${feeling}". Semangat terus, ya!`;
      }

      console.log("Sending response:", response);
      await interaction.reply(response);
    }
  } catch (error) {
    console.error("interactionCreate error:", error);
    if (
      interaction.isRepliable() &&
      !interaction.replied &&
      !interaction.deferred
    ) {
      await interaction.reply({
        content: "Terjadi kesalahan saat memproses perintah.",
        ephemeral: true,
      });
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
      "Your name is mira. call me rem. your main language is Indonesian. you are my roommate. reply with dialog dont reply with gestures. You can describe the image",
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
        message.channel.send("nice");
      }
      if (message.content === "/active-dev-badge") {
        await message.channel.send(
          "Untuk mendapatkan Active Developer Badge, kunjungi https://discord.com/developers/active-developer dan ikuti instruksinya. Pastikan kamu sudah membuat aplikasi bot dan mengaktifkan endpoint /active-dev-badge di Discord Developer Portal."
        );
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
            maxOutputTokens: 500,
            temperature: 0.7,
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
        await message.channel.send(responseText);

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
        chatHistories.set(channelId, history);
      }
    } catch (error) {
      console.error(
        `${new Date().toString()} : generateContent() is fail:\n`,
        error
      );
      message.channel.send(`sorry...? i didn't hear you.`);
    } finally {
      console.log(`message send! : ${new Date().toString()}`);
      clearInterval(sendTypingInterval);
    }
  }
  generateContent();
});

client.login(process.env.DISCORD_TOKEN);
