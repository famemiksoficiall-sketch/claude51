package ru.raftsurvival.admin;

import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.minecraft.network.packet.s2c.play.PlayerListHeaderS2CPacket;
import net.minecraft.scoreboard.Scoreboard;
import net.minecraft.scoreboard.Team;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;
import net.minecraft.text.TextColor;
import net.minecraft.util.Formatting;
import ru.raftsurvival.Rgb;
import ru.raftsurvival.game.SessionManager;

/** Таб: префиксы рангов (через команды-«teams», они же сортируют таб) + анимированная RGB шапка/подвал. */
public final class TabManager {
	private TabManager() {}

	public static void init() {
		ServerTickEvents.END_SERVER_TICK.register(server -> {
			int t = server.getTicks();
			if (t % 100 == 0) for (ServerPlayerEntity p : server.getPlayerManager().getPlayerList()) apply(p);
			if (t % 4 == 0) header(server, t);
		});
	}

	public static void apply(ServerPlayerEntity p) {
		MinecraftServer server = p.getEntityWorld().getServer();
		Scoreboard sb = server.getScoreboard();
		String id = Ranks.rankId(p);
		Ranks.Rank r = Ranks.all().get(id);
		if (r == null) return;
		String teamName = String.format("rs_%02d_%s", r.weight, id);
		if (teamName.length() > 16) teamName = teamName.substring(0, 16);
		Team team = sb.getTeam(teamName);
		if (team == null) team = sb.addTeam(teamName);
		int rgb;
		try { rgb = Integer.parseInt(r.color.replace("#", ""), 16); } catch (Exception e) { rgb = 0xFFFFFF; }
		final int c = rgb;
		team.setPrefix(Text.literal("[" + r.name + "] ").styled(s -> s.withColor(TextColor.fromRgb(c))));
		team.setColor(Formatting.WHITE);
		String holder = p.getNameForScoreboard();
		Team cur = sb.getScoreHolderTeam(holder);
		if (cur != team) sb.addScoreHolderToTeam(holder, team);
	}

	private static void header(MinecraftServer server, int t) {
		float phase = (t % 200) / 200f;
		Text head = Text.empty().append(Rgb.gradient("≈ ВЫЖИВАНИЕ НА ПЛОТУ ≈", phase, true));
		for (ServerPlayerEntity p : server.getPlayerManager().getPlayerList()) {
			Ranks.Rank r = Ranks.rank(p);
			double tps = Math.min(20.0, 1000.0 / Math.max(50.0, server.getAverageTickTime()));
			Text foot = Text.literal("Онлайн: " + server.getPlayerManager().getCurrentPlayerCount()
				+ "  •  Миров: " + SessionManager.data.sessions.size()
				+ "  •  TPS: " + String.format("%.1f", tps)
				+ "  •  Пинг: " + p.networkHandler.getLatency() + " мс"
				+ (r != null ? "  •  Ранг: " + r.name : "")).formatted(Formatting.GRAY);
			p.networkHandler.sendPacket(new PlayerListHeaderS2CPacket(head, foot));
		}
	}
}
