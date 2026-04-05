require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const { google } = require('googleapis');

// ===== DISCORD =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// ===== GOOGLE AUTH =====
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

// 🔥 CORREÇÃO DA PRIVATE KEY (ESSENCIAL)
credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// ===== READY =====
client.once('ready', () => {
  console.log(`✅ Logado como ${client.user.tag}`);
});

// ===== COMANDO =====
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'registrar') {
    try {
      await interaction.deferReply(); // evita erro de timeout

      const nome = interaction.options.getString('nome');
      const quantidade = interaction.options.getInteger('quantidade');

      // 👉 ID da planilha
      const spreadsheetId = process.env.SHEET_ID;

      // 👉 Nome da aba (tem que existir!)
      const range = 'Página1!A:B';

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[nome, quantidade]],
        },
      });

      await interaction.editReply('✅ Registrado na planilha com sucesso!');
    } catch (error) {
      console.error(error);
      await interaction.editReply('❌ Erro ao registrar na planilha.');
    }
  }
});

// ===== LOGIN =====
client.login(process.env.TOKEN);