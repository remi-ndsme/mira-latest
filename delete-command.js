import 'dotenv/config'; 
import { REST, Routes } from 'discord.js';

// Pastikan variabel ini sudah ada dan benar di file .env kamu
const TOKEN = process.env.DISCORD_TOKEN; 
const CLIENT_ID = process.env.APP_ID; 

// Tambahkan pengecekan keamanan
if (!TOKEN || !CLIENT_ID) {
    console.error("⛔ ERROR: Pastikan TOKEN dan CLIENT_ID ada di file .env.");
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('1. Mengambil daftar semua Global Application Commands...');
        
        // Ambil daftar semua command yang terdaftar (ini yang sudah kamu lakukan)
        const currentCommands = await rest.get(
            Routes.applicationCommands(CLIENT_ID)
        );

        console.log(`Ditemukan ${currentCommands.length} command. Mulai proses penghapusan satu per satu...`);
        
        // 2. Loop dan hapus setiap command berdasarkan ID
        for (const command of currentCommands) {
            console.log(`\t🗑️ Menghapus: /${command.name} (ID: ${command.id})`);
            
            // Menggunakan Routes.applicationCommand untuk penghapusan individual
            await rest.delete(
                Routes.applicationCommand(CLIENT_ID, command.id)
            );
        }

        console.log('\n🎉 SEMUA GLOBAL APPLICATION COMMANDS BERHASIL DIHAPUS!');

    } catch (error) {
        console.error('\n⚠️ TERJADI ERROR SAAT MENGHAPUS COMMANDS:');
        console.error(error);
    }
})();