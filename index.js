require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder
} = require("discord.js");

const { REST } = require("@discordjs/rest");
const { google } = require("googleapis");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const SHEET_ID = process.env.SHEET_ID;

const CANAL_VENDAS = "1498871684869128273";
const CANAL_LIDER = "1498740612630052864";
const CANAL_RELATORIO = "1498875224823959573";
const CARGO_LIDER = "1498883318618394654";

const credenciais = JSON.parse(process.env.GOOGLE_CREDENTIALS);

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// ===== GOOGLE =====
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: credenciais.client_email,
    private_key: credenciais.private_key.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// ===== DADOS =====
const precos = {
  "Kit Sabotagem ignição": 5000,
  "Chave de roda": 4000,
  "Alicate": 3000,
  "Muni de Fuzil": 130,
  "Kit Comum": 300,
  "Kit Raro": 10000,
  "Kit Épico": 20000,
  "Kit Lendário": 30000,
  "C4": 1500,
};

let vendas = [];
let sessoes = {};

// ===== FUNÇÕES =====
function dinheiro(v) {
  return "R$ " + Math.round(v).toLocaleString("pt-BR");
}

function painel(sessao) {
  let lista = Object.entries(sessao.itens || {})
    .map(([i, q]) => `• ${i} (${q})`)
    .join("\n");

  if (!lista) lista = "Nenhum item ainda";

  const total = Object.keys(precos).length;
  const atual = Object.keys(sessao.itens || {}).length;

  return `🛒 SEU CARRINHO\n${lista}\n━━━━━━━━━━━━━━\n📊 Progresso: ${atual}/${total} itens\n━━━━━━━━━━━━━━`;
}

// ===== COMANDOS =====
const commands = [
  new SlashCommandBuilder()
    .setName("mov")
    .setDescription("Movimentar estoque")
    .addStringOption(option =>
      option
        .setName("item")
        .setDescription("Escolha o item")
        .setRequired(true)
        .addChoices(
          { name: "Colete", value: "Colete" },
          { name: "Drogas", value: "Drogas" },
          { name: "C4", value: "C4" },
          { name: "SMG", value: "SMG" },
          { name: "PT", value: "PT" },
          { name: "Fuzil", value: "Fuzil" },
          { name: "MuniFuzil", value: "MuniFuzil" }
        )
    )
    .addStringOption(option =>
      option
        .setName("tipo")
        .setDescription("Entrada ou saída")
        .setRequired(true)
        .addChoices(
          { name: "Entrada", value: "entrada" },
          { name: "Saída", value: "saida" }
        )
    )
    .addIntegerOption(option =>
      option
        .setName("quantidade")
        .setDescription("Quantidade")
        .setRequired(true)
    ),

  new SlashCommandBuilder().setName("v").setDescription("Registrar venda"),
  new SlashCommandBuilder().setName("r").setDescription("Relatório"),
  new SlashCommandBuilder().setName("reset").setDescription("Reset sistema"),
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(Routes.applicationCommands(CLIENT_ID), {
    body: commands,
  });
  console.log("✅ Comandos registrados!");
})();

// ===== INTERAÇÕES =====
client.on("interactionCreate", async interaction => {
  if (interaction.isChatInputCommand() && interaction.commandName === "v") {
    sessoes[interaction.user.id] = { itens: {} };

    const menu = new StringSelectMenuBuilder()
      .setCustomId("item")
      .setPlaceholder("Escolha o item")
      .addOptions(Object.keys(precos).map(i => ({ label: i, value: i })));

    return interaction.reply({
      content: painel(sessoes[interaction.user.id]) + "\n\n📦 Escolha o item:",
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true,
    });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "item") {
    const sessao = sessoes[interaction.user.id];
    if (!sessao)
      return interaction.reply({ content: "❌ Sessão expirada", ephemeral: true });

    const item = interaction.values[0];
    sessao.itemAtual = item;

    const modal = new ModalBuilder()
      .setCustomId("quantidade_modal")
      .setTitle(`Quantidade de ${item}`);

    const input = new TextInputBuilder()
      .setCustomId("quantidade_input")
      .setLabel("Digite a quantidade")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    await interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === "quantidade_modal") {
    const sessao = sessoes[interaction.user.id];
    if (!sessao) return;

    const qtd = parseInt(interaction.fields.getTextInputValue("quantidade_input"));
    if (isNaN(qtd) || qtd <= 0)
      return interaction.reply({ content: "❌ Quantidade inválida", ephemeral: true });

    const item = sessao.itemAtual;
    sessao.itens[item] = qtd;
    delete sessao.itemAtual;

    return interaction.reply({
      content: `✔ ${item} (${qtd}) adicionado`,
      ephemeral: true,
    });
  }
});

client.once("ready", () => {
  console.log(`🤖 Logado como ${client.user.tag}`);
});

client.login(TOKEN);