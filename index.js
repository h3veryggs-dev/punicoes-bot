require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const Database = require("better-sqlite3");
const db = new Database("linha-paulista.db");

db.prepare(`
CREATE TABLE IF NOT EXISTS registros (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  motivo TEXT NOT NULL,
  dias TEXT,
  provas TEXT,
  staff TEXT NOT NULL,
  data TEXT NOT NULL
)
`).run();

try {
  db.prepare("ALTER TABLE registros ADD COLUMN provas TEXT").run();
} catch (e) {}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Envia o painel de punições da Linha Paulista RP")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
].map(cmd => cmd.toJSON());

async function registrarComandos() {
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );

  console.log("Comandos registrados.");
}

function isStaff(interaction) {
  return interaction.member.roles.cache.has(process.env.STAFF_ROLE_ID);
}

client.once("clientReady", () => {
  console.log(`Bot online como ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "painel") {
      await interaction.deferReply();

      if (!isStaff(interaction)) {
        return interaction.editReply({
          content: "❌ Você não tem permissão para usar este comando."
        });
      }

      const embed = new EmbedBuilder()
        .setColor("#ff0000")
        .setImage("https://cdn.discordapp.com/attachments/1312829269176614922/1499476206326644948/content.png")
        .setDescription(
          "**Bem-vindo(a) ao sistema de registros da Linha Paulista RP.**\n\n" +
          "Utilize os botões abaixo para registrar ou consultar punições de jogadores.\n\n" +
          "━━━━━━━━━━━━━━━━━━━━━━\n\n" +
          "📋 **REGISTROS**\n\n" +
          "📄 **Registrar Advertência**\n" +
          "Aplica cargos de advertência automaticamente.\n\n" +
          "🔨 **Registrar Banimento**\n" +
          "Registra um banimento para o jogador.\n\n" +
          "📁 **Histórico do Jogador**\n" +
          "Veja o histórico de punições.\n\n" +
          "🗑️ **Remover Registro**\n" +
          "Remove um registro existente.\n\n" +
          "━━━━━━━━━━━━━━━━━━━━━━\n\n" +
          "📊 **Estatísticas**"
        )
        .setFooter({
          text: "Sistema de Punições • Linha Paulista RP"
        });

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("registrar_adv")
          .setLabel("Registrar Advertência")
          .setEmoji("📄")
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId("registrar_ban")
          .setLabel("Registrar Banimento")
          .setEmoji("🔨")
          .setStyle(ButtonStyle.Danger)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("historico")
          .setLabel("Histórico do Jogador")
          .setEmoji("📁")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("remover")
          .setLabel("Remover Registro")
          .setEmoji("🗑️")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("estatisticas")
          .setLabel("Estatísticas")
          .setEmoji("📊")
          .setStyle(ButtonStyle.Primary)
      );

      return interaction.editReply({
        embeds: [embed],
        components: [row1, row2]
      });
    }
  }

  if (interaction.isButton()) {
    if (!isStaff(interaction)) {
      return interaction.reply({
        content: "❌ Você não tem permissão para usar este botão.",
        ephemeral: true
      });
    }

    if (interaction.customId === "registrar_adv") {
      const modal = new ModalBuilder()
        .setCustomId("modal_adv")
        .setTitle("Registrar Advertência");

      const discordIdInput = new TextInputBuilder()
        .setCustomId("discord_id")
        .setLabel("ID do Discord do jogador")
        .setPlaceholder("Exemplo: 123456789012345678")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const motivoInput = new TextInputBuilder()
        .setCustomId("motivo")
        .setLabel("Motivo da advertência")
        .setPlaceholder("Descreva o motivo da advertência")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const provasInput = new TextInputBuilder()
        .setCustomId("provas")
        .setLabel("Clips/Provas")
        .setPlaceholder("Cole o link do clip ou prova")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(discordIdInput),
        new ActionRowBuilder().addComponents(motivoInput),
        new ActionRowBuilder().addComponents(provasInput)
      );

      return interaction.showModal(modal);
    }

    if (interaction.customId === "registrar_ban") {
      const modal = new ModalBuilder()
        .setCustomId("modal_ban")
        .setTitle("Registrar Banimento");

      const discordIdInput = new TextInputBuilder()
        .setCustomId("discord_id")
        .setLabel("ID do Discord do jogador")
        .setPlaceholder("Exemplo: 123456789012345678")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const diasInput = new TextInputBuilder()
        .setCustomId("dias")
        .setLabel("Dias de banimento")
        .setPlaceholder("Coloque 0 para permanente")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const motivoInput = new TextInputBuilder()
        .setCustomId("motivo")
        .setLabel("Motivo do banimento")
        .setPlaceholder("Descreva o motivo do banimento")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const provasInput = new TextInputBuilder()
        .setCustomId("provas")
        .setLabel("Clips/Provas")
        .setPlaceholder("Cole o link do clip ou prova")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(discordIdInput),
        new ActionRowBuilder().addComponents(diasInput),
        new ActionRowBuilder().addComponents(motivoInput),
        new ActionRowBuilder().addComponents(provasInput)
      );

      return interaction.showModal(modal);
    }

    if (interaction.customId === "historico") {
      const modal = new ModalBuilder()
        .setCustomId("modal_historico")
        .setTitle("Consultar Histórico");

      const discordIdInput = new TextInputBuilder()
        .setCustomId("discord_id")
        .setLabel("ID do Discord do jogador")
        .setPlaceholder("Exemplo: 123456789012345678")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(discordIdInput));
      return interaction.showModal(modal);
    }

    if (interaction.customId === "remover") {
      const modal = new ModalBuilder()
        .setCustomId("modal_remover")
        .setTitle("Remover Registro");

      const registroInput = new TextInputBuilder()
        .setCustomId("registro_id")
        .setLabel("ID do registro")
        .setPlaceholder("Exemplo: 5")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(registroInput));
      return interaction.showModal(modal);
    }

    if (interaction.customId === "estatisticas") {
      const total = db.prepare("SELECT COUNT(*) AS total FROM registros").get().total;
      const advs = db.prepare("SELECT COUNT(*) AS total FROM registros WHERE tipo = ?").get("Advertência").total;
      const bans = db.prepare("SELECT COUNT(*) AS total FROM registros WHERE tipo = ?").get("Banimento").total;

      return interaction.reply({
        content:
          `📊 **Estatísticas — Linha Paulista RP**\n\n` +
          `📋 Total de registros: **${total}**\n` +
          `📝 Advertências: **${advs}**\n` +
          `🔨 Banimentos: **${bans}**`,
        ephemeral: true
      });
    }
  }

  if (interaction.isModalSubmit()) {
    const data = new Date().toLocaleString("pt-BR");

    if (interaction.customId === "modal_adv") {
      const discordId = interaction.fields.getTextInputValue("discord_id");
      const motivo = interaction.fields.getTextInputValue("motivo");
      const provas = interaction.fields.getTextInputValue("provas") || "Sem provas";

      let member;

      try {
        member = await interaction.guild.members.fetch(discordId);
      } catch (error) {
        return interaction.reply({
          content: "❌ Não encontrei esse membro no servidor. Confira se o ID do Discord está correto.",
          ephemeral: true
        });
      }

      const adv1 = process.env.ADV_1_ROLE_ID;
      const adv2 = process.env.ADV_2_ROLE_ID;

      let acao = "";

      try {
        if (!member.roles.cache.has(adv1) && !member.roles.cache.has(adv2)) {
          await member.roles.add(adv1);
          acao = "Primeira advertência aplicada.";
        } else if (member.roles.cache.has(adv1) && !member.roles.cache.has(adv2)) {
          await member.roles.remove(adv1);
          await member.roles.add(adv2);
          acao = "Segunda advertência aplicada.";
        } else if (member.roles.cache.has(adv2)) {
          await member.ban({
            reason: `Ban automático por 3 advertências. Motivo: ${motivo}`
          });
          acao = "Jogador banido automaticamente por atingir 3 advertências.";
        }
      } catch (error) {
        return interaction.reply({
          content: "❌ Não consegui aplicar cargo/ban. Verifique se o cargo do bot está acima dos cargos de advertência e se ele tem permissão de banir.",
          ephemeral: true
        });
      }

      const result = db.prepare(`
        INSERT INTO registros (player_id, tipo, motivo, dias, provas, staff, data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(discordId, "Advertência", motivo, null, provas, interaction.user.tag, data);

      const logEmbed = new EmbedBuilder()
        .setColor("#ffcc00")
        .setTitle("📝 Advertência Registrada")
        .addFields(
          { name: "Jogador", value: `<@${discordId}>`, inline: true },
          { name: "Discord ID", value: discordId, inline: true },
          { name: "Registro", value: `#${result.lastInsertRowid}`, inline: true },
          { name: "Ação", value: acao },
          { name: "Staff", value: interaction.user.tag, inline: true },
          { name: "Motivo", value: motivo },
          { name: "Clips/Provas", value: provas },
          { name: "Data", value: data }
        )
        .setFooter({ text: "Linha Paulista RP" });

      const canal = client.channels.cache.get(process.env.LOG_CHANNEL_ID);
      if (canal) canal.send({ embeds: [logEmbed] });

      return interaction.reply({
        content: `✅ Advertência registrada para <@${discordId}>.\n**Ação:** ${acao}\nRegistro **#${result.lastInsertRowid}**.`,
        ephemeral: true
      });
    }

    if (interaction.customId === "modal_ban") {
      const discordId = interaction.fields.getTextInputValue("discord_id");
      const dias = interaction.fields.getTextInputValue("dias");
      const motivo = interaction.fields.getTextInputValue("motivo");
      const provas = interaction.fields.getTextInputValue("provas") || "Sem provas";

      let member;

      try {
        member = await interaction.guild.members.fetch(discordId);
      } catch (error) {
        return interaction.reply({
          content: "❌ Não encontrei esse membro no servidor. Confira se o ID do Discord está correto.",
          ephemeral: true
        });
      }

      const duracao = dias === "0" ? "Permanente" : `${dias} dias`;

      try {
        await member.ban({
          reason: `Banimento registrado. Duração: ${duracao}. Motivo: ${motivo}`
        });
      } catch (error) {
        return interaction.reply({
          content: "❌ Não consegui banir esse membro. Verifique se o cargo do bot está acima do cargo dele e se o bot tem permissão de banir.",
          ephemeral: true
        });
      }

      const result = db.prepare(`
        INSERT INTO registros (player_id, tipo, motivo, dias, provas, staff, data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(discordId, "Banimento", motivo, dias, provas, interaction.user.tag, data);

      const logEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("🔨 Banimento Registrado")
        .addFields(
          { name: "Jogador", value: `<@${discordId}>`, inline: true },
          { name: "Discord ID", value: discordId, inline: true },
          { name: "Duração", value: duracao, inline: true },
          { name: "Registro", value: `#${result.lastInsertRowid}`, inline: true },
          { name: "Staff", value: interaction.user.tag, inline: true },
          { name: "Motivo", value: motivo },
          { name: "Clips/Provas", value: provas },
          { name: "Data", value: data }
        )
        .setFooter({ text: "Linha Paulista RP" });

      const canal = client.channels.cache.get(process.env.LOG_CHANNEL_ID);
      if (canal) canal.send({ embeds: [logEmbed] });

      return interaction.reply({
        content: `✅ Banimento registrado para <@${discordId}>. Registro **#${result.lastInsertRowid}**.`,
        ephemeral: true
      });
    }

    if (interaction.customId === "modal_historico") {
      const discordId = interaction.fields.getTextInputValue("discord_id");

      const registros = db.prepare(`
        SELECT * FROM registros
        WHERE player_id = ?
        ORDER BY id DESC
        LIMIT 10
      `).all(discordId);

      if (!registros.length) {
        return interaction.reply({
          content: `❌ Nenhum histórico encontrado para <@${discordId}>.`,
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle(`📁 Histórico de <@${discordId}>`)
        .setFooter({ text: "Linha Paulista RP" });

      registros.forEach(r => {
        embed.addFields({
          name: `#${r.id} — ${r.tipo}`,
          value:
            `**Motivo:** ${r.motivo}\n` +
            `**Dias:** ${r.dias || "N/A"}\n` +
            `**Clips/Provas:** ${r.provas || "Sem provas"}\n` +
            `**Staff:** ${r.staff}\n` +
            `**Data:** ${r.data}`
        });
      });

      return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

    if (interaction.customId === "modal_remover") {
      const registroId = interaction.fields.getTextInputValue("registro_id");

      const result = db.prepare(`
        DELETE FROM registros
        WHERE id = ?
      `).run(registroId);

      if (result.changes === 0) {
        return interaction.reply({
          content: "❌ Registro não encontrado.",
          ephemeral: true
        });
      }

      return interaction.reply({
        content: `✅ Registro **#${registroId}** removido.`,
        ephemeral: true
      });
    }
  }
});

registrarComandos();
client.login(process.env.TOKEN);