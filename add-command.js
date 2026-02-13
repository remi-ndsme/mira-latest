// register-commands.js
import 'dotenv/config';
import { REST, Routes, ApplicationCommandOptionType } from 'discord.js';

const commands = [
    {
        name: 'ping',
        description: 'Membalas dengan Pong dan mengecek latency bot.',
    },
    {
        name: 'active-dev-badge',
        description: 'Cek apakah Anda memiliki Discord Developer Badge.',
        options: [
            {
                name: 'user',
                description: 'User yang ingin dicek (opsional, default Anda sendiri).',
                type: ApplicationCommandOptionType.User,
                required: false,
            },
        ],
    },
    {
        name: 'weather',
        description: 'Mendapatkan informasi cuaca untuk suatu kota.',
        options: [
            {
                name: 'city',
                description: 'Nama kota (e.g., Jakarta, Bandung).',
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },
    {
        name: 'feel',
        description: 'insanity buat saat ini.',
        options: [
            {
                name: 'feeling',
                description: 'perasaan (e.g., senang, sedih, marah, takut, bingung).',
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('⏳ Sedang menambahkan slash commands...');
        await rest.put(
            Routes.applicationCommands(process.env.APP_ID),
            { body: commands }
        );
        console.log('✅ Slash commands berhasil ditambahkan!');
    } catch (error) {
        console.error('❌ Gagal menambahkan slash commands:', error);
    }
})();