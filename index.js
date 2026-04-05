require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const { GoogleSpreadsheet } = require("google-spreadsheet");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// 🔥 CONFIG GOOGLE
const doc = new GoogleSpreadsheet(process.env.SHEET_ID);

async function salvarNaPlanilha(produto, quantidade) {
  try {
    console.log("🔄 Conectando na planilha...");

    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\n/g, "\n"),
    });

    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];

    console.log("📄 Salvando linha...");

    await sheet.addRow({
      Produto: produto,
      Quantidade: quantidade,
      Data: new Date().toLocaleString(),
    });

    console.log("✅ Salvo com sucesso!");
  } catch (err) {
    console.error("❌ ERRO AO SALVAR:", err);
    throw err;
  }
}

// 🚀 BOT ONLINE
client.once('ready', () => {
    console.log(`🤖 Logado como ${client.user.tag}`);
});
});
// 🎯 COMANDO /mov
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "mov") {
    try {
      await interaction.deferReply();

      const produto = interaction.options.getString("produto");
      const quantidade = interaction.options.getInteger("quantidade");

      console.log("📦 Comando recebido:", produto, quantidade);

      await salvarNaPlanilha(produto, quantidade);

      await interaction.editReply("✅ Movimentação registrada!");
    } catch (err) {
      console.error(err);
      await interaction.editReply("❌ Erro ao registrar na planilha.");
    }
  }
});

// 🔑 LOGIN
client.login(process.env.TOKEN);