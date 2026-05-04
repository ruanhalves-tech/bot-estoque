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
            .setDescription("Escolha o item") // ✅
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
            .setDescription("Entrada ou saída") // ✅
            .setRequired(true)
            .addChoices(
                { name: "Entrada", value: "entrada" },
                { name: "Saída", value: "saida" }
            )
    )
    .addIntegerOption(option =>
        option.setName("quantidade")
            .setDescription("Quantidade do item") // ✅
            .setRequired(true)
    ),

    new SlashCommandBuilder().setName("v").setDescription("Registrar venda"),
    new SlashCommandBuilder().setName("r").setDescription("Relatório"),
    new SlashCommandBuilder().setName("reset").setDescription("Resetar vendas")
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

    // ===== MOV =====
    if (interaction.isChatInputCommand() && interaction.commandName === "mov") {
        try {
            await interaction.deferReply();

            const item = interaction.options.getString("item");
            const tipo = interaction.options.getString("tipo");
            const quantidade = interaction.options.getInteger("quantidade");
            const user = interaction.member.displayName;
            const data = new Date().toLocaleString("pt-BR");

            await sheets.spreadsheets.values.append({
                spreadsheetId: SHEET_ID,
                range: 'Movimentação!A:E',
                valueInputOption: 'USER_ENTERED',
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

return interaction.editReply({
    embeds: [embed]
});
        } catch (err) {
            console.error("ERRO PLANILHA:", err.response?.data || err.message);
            return interaction.editReply("❌ Erro na planilha");
        }
    }

    // ===== INICIAR VENDA =====
if (interaction.isChatInputCommand() && interaction.commandName === "v") {
    sessoes[interaction.user.id] = { itens: {} };

    const menu = new StringSelectMenuBuilder()
        .setCustomId("item")
        .setPlaceholder("Escolha o item")
        .addOptions(Object.keys(precos).map(i => ({ label: i, value: i })));

    return interaction.reply({
        content: `${painel(sessoes[interaction.user.id])}\n\n📦 Escolha o item:`,
        components: [new ActionRowBuilder().addComponents(menu)],
        ephemeral: true
    });
}

// ===== SELECT =====
if (interaction.isStringSelectMenu() && interaction.customId === "item") {
        const sessao = sessoes[interaction.user.id];
        if (!sessao) return interaction.reply({ content: "❌ Sessão expirada", ephemeral: true });

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

    // ===== MODAL =====
    if (interaction.isModalSubmit() && interaction.customId === "quantidade_modal") {
        const sessao = sessoes[interaction.user.id];
        if (!sessao) return;

        const qtd = parseInt(interaction.fields.getTextInputValue("quantidade_input"));
        if (isNaN(qtd) || qtd <= 0)
            return interaction.reply({ content: "❌ Quantidade inválida", ephemeral: true });

        const item = sessao.itemAtual;

        if (sessao.itens[item]) {
            return interaction.reply({ content: "❌ Esse item já foi adicionado", ephemeral: true });
        }

        sessao.itens[item] = qtd;
        delete sessao.itemAtual;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("add").setLabel("➕ Adicionar mais").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("finalizar").setLabel("✅ Finalizar").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("cancelar").setLabel("❌ Cancelar").setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
            content: `${painel(sessao)}\n\n✅ ${item} (${qtd}) adicionado`,
            components: [row],
            ephemeral: true
        });
    }

    // ===== BOTÕES =====
    if (interaction.isButton()) {
        const sessao = sessoes[interaction.user.id];
        if (!sessao) return interaction.reply({ content: "❌ Sessão expirada", ephemeral: true });

        if (interaction.customId === "cancelar") {
            delete sessoes[interaction.user.id];
            return interaction.reply({ content: "❌ Cancelado", ephemeral: true });
        }

        if (interaction.customId === "add") {
            const restantes = Object.keys(precos).filter(i => !sessao.itens[i]);

            const menu = new StringSelectMenuBuilder()
                .setCustomId("item")
                .setPlaceholder("Escolha outro item")
                .addOptions(restantes.map(i => ({ label: i, value: i })));

            return interaction.reply({
                content: `${painel(sessao)}\n\n📦 Escolha outro item:`,
                components: [new ActionRowBuilder().addComponents(menu)],
                ephemeral: true
            });
        }

        if (interaction.customId === "finalizar") {
            let total = 0;
            let texto = "";

            for (let i in sessao.itens) {
                total += precos[i] * sessao.itens[i];
                texto += `• ${i} — ${sessao.itens[i]}\n`;
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("confirmar").setLabel("Confirmar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId("cancelar").setLabel("Cancelar").setStyle(ButtonStyle.Danger)
            );

            return interaction.reply({
                content: `Confirmar venda?\n\n${texto}\n💰 ${dinheiro(total)}`,
                components: [row],
                ephemeral: true
            });
        }

        if (interaction.customId === "confirmar") {
            let total = 0;

            for (let i in sessao.itens) {
                total += precos[i] * sessao.itens[i];
            }

            vendas.push({ user: interaction.member.displayName, itens: sessao.itens, total });

            delete sessoes[interaction.user.id];

            return interaction.reply({ content: "✅ Venda registrada!", ephemeral: true });
        }
    }

    // ===== RELATÓRIO =====
if (interaction.isChatInputCommand() && interaction.commandName === "r") {
    if (!interaction.member.roles.cache.has(CARGO_LIDER))
        return interaction.reply({ content: "❌ Sem permissão", ephemeral: true });

    let totalGeral = 0;
    let totalVendas = vendas.length;

    let itens = {};
    let usuarios = {};

    for (let v of vendas) {
        totalGeral += v.total;

        if (!usuarios[v.user]) usuarios[v.user] = 0;
        usuarios[v.user] += v.total;

        for (let i in v.itens) {
            if (!itens[i]) {
                itens[i] = { qtd: 0, total: 0, usuarios: {} };
            }

            const qtd = v.itens[i];

            itens[i].qtd += qtd;
            itens[i].total += qtd * precos[i];

            if (!itens[i].usuarios[v.user]) itens[i].usuarios[v.user] = 0;
            itens[i].usuarios[v.user] += qtd;
        }
    }

    let texto = `📊 RELATÓRIO DE VENDAS\n\n`;

    for (let i in itens) {
        texto += `📦 ${i} — ${itens[i].qtd}x | 💰 ${dinheiro(itens[i].total)}\n`;
    }

    texto += `\n💰 TOTAL GERAL: ${dinheiro(totalGeral)}\n`;
    texto += `🧾 TOTAL DE VENDAS: ${totalVendas}`;

    try {
        const canal = await client.channels.fetch(CANAL_RELATORIO);

        if (!canal) {
            return interaction.reply({ content: "❌ Canal não encontrado", ephemeral: true });
        }

        await canal.send(texto);

        return interaction.reply({ content: "📊 Relatório enviado!", ephemeral: true });

        } catch (err) {
        console.error("ERRO AO ENVIAR RELATÓRIO:", err);
        return interaction.reply({ content: "❌ Erro ao enviar relatório", ephemeral: true });
    }
}

}); // ✅ ESSA LINHA FALTAVA

client.once("clientReady", () => {
    console.log(`🤖 Logado como ${client.user.tag}`);
});

client.login(TOKEN);