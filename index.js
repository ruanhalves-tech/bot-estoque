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

const CANAL_VENDAS = '1498871684869128273';
const CANAL_LIDER = '1498740612630052864';
const CANAL_RELATORIO = '1498875224823959573';
const CARGO_LIDER = '1498883318618394654';

const credenciais = JSON.parse(process.env.GOOGLE_CREDENTIALS);

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
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
    "C4": 1500
};

let vendas = [];
let sessoes = {};

// ===== FUNÇÃO =====
function dinheiro(v) {
    return "R$ " + Math.round(v).toLocaleString("pt-BR");
}

function painel(sessao) {
    let lista = Object.entries(sessao.itens)
        .map(([i, q]) => `• ${i} (${q})`)
        .join("\n");

    if (!lista) lista = "Nenhum item ainda";

    const total = Object.keys(precos).length;
    const atual = Object.keys(sessao.itens).length;

    return `🛒 SEU CARRINHO

${lista}

━━━━━━━━━━━━━━
📊 Progresso: ${atual}/${total} itens
━━━━━━━━━━━━━━`;
}

// ===== COMANDOS =====
const commands = [
  new SlashCommandBuilder()
    .setName("mov")
    .setDescription("Movimentar estoque")
    .addStringOption(option =>
        option.setName("item")
            .setDescription("Escolha o item")
            .setRequired(true)
            .addChoices(
                { name: "Colete", value: "Colete" },
                { name: "Drogas", value: "Drogas" },
                { name: "C4", value: "C4" },
                { name: "SMG", value: "SMG" },
                { name: "PT", value: "PT" },
                { name: "Fuzil", value: "Fuzil" },
                { name: "MuniSMG", value: "MuniSMG" },
                { name: "MuniPT", value: "MuniPT" },
                { name: "MuniFuzil", value: "MuniFuzil" },
                { name: "Lockpick", value: "Lockpick" },
                { name: "ReparoComum", value: "ReparoComum" },
                { name: "ReparoEpico", value: "ReparoEpico" },
                { name: "ReparoLendario", value: "ReparoLendario" },
                { name: "Soro", value: "Soro" },
                { name: "Adrenalina", value: "Adrenalina" },
                { name: "SuperDroga", value: "SuperDroga" },
                { name: "pulseira", value: "pulseira" },
                { name: "KitRaro", value: "KitRaro" },
                { name: "Algema", value: "Algema" }
            )
    )
    .addStringOption(option =>
        option.setName("tipo")
            .setDescription("Entrada ou saída")
            .setRequired(true)
            .addChoices(
                { name: "Entrada", value: "entrada" },
                { name: "Saída", value: "saida" }
            )
    )
    .addIntegerOption(option =>
        option.setName("quantidade")
            .setDescription("Quantidade do item")
            .setRequired(true)
    ),

    new SlashCommandBuilder().setName("v").setDescription("Registrar venda"),
    new SlashCommandBuilder().setName("r").setDescription("Relatório"),
    new SlashCommandBuilder()
  .setName("reset")
  .setDescription("Resetar todo o sistema de vendas (histórico + sessões)")
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
    await rest.put(Routes.applicationCommands(CLIENT_ID), {
        body: commands
    });
    console.log("✅ Comandos registrados!");
})();

// ===== INTERAÇÕES =====
client.on("interactionCreate", async interaction => {

    if (interaction.isChatInputCommand() && interaction.commandName === "mov") {
        try {
            await interaction.deferReply();

            const item = interaction.options.getString("item");
            const tipo = interaction.options.getString("tipo");
            const quantidade = interaction.options.getInteger("quantidade");
            const user = interaction.member.displayName;
            const data = new Date().toLocaleString("pt-BR");

            const planilha = await sheets.spreadsheets.values.get({
                spreadsheetId: SHEET_ID,
                range: "Movimentação!A:E",
            });

            const linhas = planilha.data.values || [];

            let linhaLivre = 1;

            for (let i = 0; i < linhas.length; i++) {
                if (!linhas[i] || linhas[i].length === 0 || linhas[i].every(c => c === "")) {
                    linhaLivre = i + 1;
                    break;
                }
            }

            await sheets.spreadsheets.values.update({
                spreadsheetId: SHEET_ID,
                range: `Movimentação!A${linhaLivre}:E${linhaLivre}`,
                valueInputOption: "USER_ENTERED",
                resource: {
                    values: [[data, item, tipo === 'entrada' ? 'Entrada' : 'Saída', quantidade, user]]
                }
            });

            const embed = new EmbedBuilder()
            .setTitle("📊 MOVIMENTAÇÃO REGISTRADA")
            .setColor(tipo === "entrada" ? 0x00ff00 : 0xff0000)
            .addFields(
                { name: "👤 Usuário", value: user, inline: true },
                { name: "📦 Item", value: item, inline: true },
                { name: "🔄 Tipo", value: tipo === "entrada" ? "Entrada" : "Saída", inline: true },
                { name: "🔢 Quantidade", value: String(quantidade), inline: true },
                { name: "📅 Data", value: data }
            )
            .setFooter({ text: "Sistema de Estoque" });

            return interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error("ERRO PLANILHA:", err.response?.data || err.message);
            return interaction.editReply("❌ Erro na planilha");
        }
    }

});
client.login(TOKEN);