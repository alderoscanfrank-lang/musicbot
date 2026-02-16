require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { Player } = require("discord-player");
const { DefaultExtractors } = require("@discord-player/extractor");

const client = new Client({
intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildVoiceStates,
],

});

const player = new Player(client);

(async () => {
  await player.extractors.loadMulti(DefaultExtractors);
})();

client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on("messageCreate", async (msg) => {
  if (!msg.guild || msg.author.bot) return;

  const [cmd, ...rest] = msg.content.trim().split(/\s+/);
  const query = rest.join(" ");

  const vc = msg.member?.voice?.channel;

  if (cmd === "!play") {
    if (!vc) return msg.reply("Entra a un canal de voz primero.");
    if (!query) return msg.reply("Usa: `!play <canción o link>`");

    const result = await player.search(query, { requestedBy: msg.author });
    if (!result.hasTracks()) return msg.reply("No encontré resultados.");

    const queue = player.nodes.create(msg.guild, { metadata: msg.channel });

    try {
      if (!queue.connection) await queue.connect(vc);
    } catch (e) {
      queue.delete();
      return msg.reply("No pude conectarme al canal de voz (revisa permisos).");
    }

    queue.addTrack(result.tracks[0]);
    if (!queue.node.isPlaying()) await queue.node.play();

    return msg.reply(`🎵 Reproduciendo: **${result.tracks[0].title}**`);
  }

  if (cmd === "!skip") {
    const queue = player.nodes.get(msg.guild.id);
    if (!queue?.node.isPlaying()) return msg.reply("No hay nada reproduciéndose.");
    await queue.node.skip();
    return msg.reply("⏭️ Saltado.");
  }

  if (cmd === "!stop") {
    const queue = player.nodes.get(msg.guild.id);
    if (!queue) return msg.reply("No hay reproducción activa.");
    queue.delete();
    return msg.reply("⏹️ Detenido y cola limpiada.");
  }

  if (cmd === "!queue") {
    const queue = player.nodes.get(msg.guild.id);
    if (!queue?.node.isPlaying()) return msg.reply("No hay cola.");
    const now = queue.currentTrack;
    const upcoming = queue.tracks.toArray().slice(0, 10);
    const text =
      `▶ Ahora: **${now?.title || "—"}**\n` +
      (upcoming.length ? upcoming.map((t, i) => `${i + 1}. ${t.title}`).join("\n") : "—");
    return msg.reply(text);
  }
});

client.login(process.env.DISCORD_TOKEN);
