
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
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "mov") {
    try {
      await interaction.deferReply();

      // sua lógica aqui (planilha etc)

      await interaction.editReply("Movimentação registrada!");
    } catch (err) {
      console.error(err);
      await interaction.editReply("Erro ao registrar.");
    }
  }
});
// ===== LOGIN =====
client.login(process.env.TOKEN);