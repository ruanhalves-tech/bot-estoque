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
    TextInputStyle
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

// 👇 COLE AQUI EMBAIXO
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

    // ===== PLANILHA =====
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

            return interaction.editReply(`📊 **MOVIMENTAÇÃO REGISTRADA**\n\n👤 **Usuário:** ${user}\n📦 **Item:** ${item}\n🔄 **Tipo:** ${tipo === 'entrada' ? 'Entrada' : 'Saída'}\n🔢 **Quantidade:** ${quantidade}\n📅 **Data:** ${data}`);
        } catch (err) {
            console.error(err);
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

        await interaction.deferUpdate(); // trava o menu antigo

    }

    // ===== MODAL =====
    if (interaction.isModalSubmit() && interaction.customId === "quantidade_modal") {
        const sessao = sessoes[interaction.user.id];
        if (!sessao) return;

        const qtd = parseInt(interaction.fields.getTextInputValue("quantidade_input"));
        if (isNaN(qtd) || qtd <= 0)
            return interaction.reply({ content: "❌ Quantidade inválida", ephemeral: true });

        const item = sessao.itemAtual;

// 🔥 PROTEÇÃO AQUI
if (sessao.itens[item]) {
    return interaction.reply({
        content: "❌ Esse item já foi adicionado",
        ephemeral: true
    });
}

        sessao.itens[item] = (sessao.itens[item] || 0) + qtd;
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

            if (restantes.length === 0)
                return interaction.reply({ content: "⚠️ Todos itens já adicionados", ephemeral: true });

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
            let log = `📊 NOVA VENDA\n\n👤 ${interaction.member.displayName}\n\n`;

            for (let i in sessao.itens) {
                const qtd = sessao.itens[i];
                const unit = precos[i];
                const tot = unit * qtd;
                total += tot;

                log += `┣ ${i} — ${qtd}\n┃ 💰 ${dinheiro(unit)}\n┃ 💵 ${dinheiro(tot)}\n`;
            }

            log += `\n💰 TOTAL: ${dinheiro(total)}`;

            vendas.push({ user: interaction.member.displayName, itens: sessao.itens, total });

            const c1 = await client.channels.fetch(CANAL_VENDAS);
            const c2 = await client.channels.fetch(CANAL_LIDER);

            c1.send(`💰 Venda registrada | ${dinheiro(total)}`);
            c2.send(log);

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

        let itemMaisVendido = null;
        let maiorQtd = 0;

        let itemMaisValor = null;
        let maiorValor = 0;

        for (let i in itens) {
            if (itens[i].qtd > maiorQtd) {
                maiorQtd = itens[i].qtd;
                itemMaisVendido = i;
            }

            if (itens[i].total > maiorValor) {
                maiorValor = itens[i].total;
                itemMaisValor = i;
            }
        }

        const ranking = Object.entries(usuarios)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        let texto = `📊 ═════ RELATÓRIO DE VENDAS ═════\n\n`;

        for (let i in itens) {
            const item = itens[i];

            texto += `📦 ${i}\n`;
            texto += `┣ 🔢 QTD: ${item.qtd}\n`;
            texto += `┣ 💰 Total: ${dinheiro(item.total)}\n`;

            const listaUsers = Object.entries(item.usuarios)
                .map(u => `${u[0]} (${u[1]})`)
                .join(" • ");

            texto += `┗ 👤 ${listaUsers}\n\n`;
        }

        texto += `━━━━━━━━━━━━━━━━━━\n\n`;
        texto += `🏆 Item mais vendido: ${itemMaisVendido || "Nenhum"} (${maiorQtd}x)\n`;
        texto += `💰 Maior faturamento: ${itemMaisValor || "Nenhum"} (${dinheiro(maiorValor)})\n\n`;

        texto += `━━━━━━━━━━━━━━━━━━\n\n`;
        texto += `🏆 TOP VENDEDORES\n`;

        const medalhas = ["🥇", "🥈", "🥉"];

        ranking.forEach((v, i) => {
            texto += `${medalhas[i]} ${v[0]} — ${dinheiro(v[1])}\n`;
        });

        texto += `\n━━━━━━━━━━━━━━━━━━\n\n`;
        texto += `🧾 Total de vendas: ${totalVendas}\n`;
        texto += `💰 TOTAL GERAL: ${dinheiro(totalGeral)}\n\n`;
        texto += `👤 Gerado por: ${interaction.member.displayName}\n`;
        texto += `📅 ${new Date().toLocaleString("pt-BR")}`;

        const canal = await client.channels.fetch(CANAL_RELATORIO);
        canal.send(texto);

        return interaction.reply({ content: "📊 Relatório enviado!", ephemeral: true });
    }

});

// ===== BOT ONLINE =====
client.once("ready", () => {
    console.log(`🤖 Logado como ${client.user.tag}`);
});

client.login(TOKEN);