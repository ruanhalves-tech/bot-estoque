require("dotenv").config();

const { Client, GatewayIntentBits, SlashCommandBuilder, Routes } = require("discord.js");
const { REST } = require("@discordjs/rest");
const { google } = require("googleapis");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const SHEET_ID = process.env.SHEET_ID;

const credenciais = JSON.parse(process.env.GOOGLE_CREDENTIALS);

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// 🔐 GOOGLE AUTH
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: credenciais.client_email,
        private_key: credenciais.private_key.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// 🎯 COMANDO
const commands = [
    new SlashCommandBuilder()
        .setName("mov")
        .setDescription("Movimentar estoque")
        .addStringOption(option =>
            option.setName("item")
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
                    { name: "Adrenalina", value: "Adrenalina" }
                )
        )
        .addStringOption(option =>
            option.setName("tipo")
                .setRequired(true)
                .addChoices(
                    { name: "Entrada", value: "entrada" },
                    { name: "Saída", value: "saida" }
                )
        )
        .addIntegerOption(option =>
            option.setName("quantidade")
                .setRequired(true)
        )
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

// 🚀 REGISTRAR COMANDO
(async () => {
    await rest.put(Routes.applicationCommands(CLIENT_ID), {
        body: commands
    });
    console.log("✅ Comando registrado!");
})();

// 🎯 EXECUÇÃO
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "mov") {
        try {
            await interaction.deferReply();

            const item = interaction.options.getString("item");
            const tipo = interaction.options.getString("tipo");
            const quantidade = interaction.options.getInteger("quantidade");
            const user = interaction.user.username;
            const data = new Date().toLocaleString("pt-BR");

            await sheets.spreadsheets.values.append({
                spreadsheetId: SHEET_ID,
                range: "Movimentação!A:E",
                valueInputOption: "USER_ENTERED",
                resource: {
                    values: [[data, user, item, tipo, quantidade]]
                }
            });

            // 🔥 MENSAGEM COMPLETA
            await interaction.editReply(
                `📊 **Movimentação registrada!**\n\n` +
                `👤 **Usuário:** ${user}\n` +
                `📦 **Item:** ${item}\n` +
                `🔄 **Tipo:** ${tipo}\n` +
                `🔢 **Quantidade:** ${quantidade}\n` +
                `📅 **Data:** ${data}`
            );

        } catch (err) {
            console.error("❌ ERRO:", err);
            await interaction.editReply("❌ Erro ao salvar na planilha.");
        }
    }
});

client.once("ready", () => {
    console.log(`🤖 Logado como ${client.user.tag}`);
});

client.login(TOKEN);