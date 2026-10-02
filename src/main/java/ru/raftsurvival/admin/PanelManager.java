package ru.raftsurvival.admin;

import net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.minecraft.scoreboard.Scoreboard;
import net.minecraft.scoreboard.ScoreboardCriterion;
import net.minecraft.scoreboard.ScoreboardDisplaySlot;
import net.minecraft.scoreboard.ScoreboardObjective;
import net.minecraft.scoreboard.ScoreHolder;
import net.minecraft.scoreboard.number.BlankNumberFormat;
import net.minecraft.server.MinecraftServer;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;
import ru.raftsurvival.Rgb;
import ru.raftsurvival.game.SessionManager;

/** RGB-панель справа (sidebar): переливающийся заголовок и живая статистика сервера. */
public final class PanelManager {
	private static final String OBJ = "rs_panel";
	public static boolean enabled = true;

	private PanelManager() {}

	public static void init() {
		ServerLifecycleEvents.SERVER_STARTED.register(PanelManager::setup);
		ServerTickEvents.END_SERVER_TICK.register(server -> {
			if (enabled && server.getTicks() % 3 == 0) update(server);
		});
	}

	private static ScoreboardObjective obj(MinecraftServer server) {
		Scoreboard sb = server.getScoreboard();
		ScoreboardObjective o = sb.getNullableObjective(OBJ);
		if (o == null) {
			o = sb.addObjective(OBJ, ScoreboardCriterion.DUMMY, Text.literal("Плот"), ScoreboardCriterion.RenderType.INTEGER, false, BlankNumberFormat.INSTANCE);
		}
		return o;
	}

	private static void setup(MinecraftServer server) {
		server.getScoreboard().setObjectiveSlot(ScoreboardDisplaySlot.SIDEBAR, obj(server));
	}

	public static void toggle(MinecraftServer server, boolean on) {
		enabled = on;
		Scoreboard sb = server.getScoreboard();
		sb.setObjectiveSlot(ScoreboardDisplaySlot.SIDEBAR, on ? obj(server) : null);
	}

	private static void line(Scoreboard sb, ScoreboardObjective o, int idx, Text text) {
		var acc = sb.getOrCreateScore(ScoreHolder.fromName("rs_line_" + idx), o);
		acc.setScore(10 - idx);
		acc.setDisplayText(text);
	}

	private static void update(MinecraftServer server) {
		Scoreboard sb = server.getScoreboard();
		ScoreboardObjective o = obj(server);
		float phase = (server.getTicks() % 160) / 160f;
		o.setDisplayName(Rgb.gradient("⚓ RAFT SURVIVAL ⚓", phase, true));
		double tps = Math.min(20.0, 1000.0 / Math.max(50.0, server.getAverageTickTime()));
		line(sb, o, 0, Text.literal(" "));
		line(sb, o, 1, Text.literal("Режим: ").formatted(Formatting.GRAY).append(Rgb.gradient("Выживание на плоту", phase + 0.3f, false)));
		line(sb, o, 2, Text.literal("Онлайн: ").formatted(Formatting.GRAY).append(Text.literal(String.valueOf(server.getPlayerManager().getCurrentPlayerCount())).formatted(Formatting.GREEN)));
		line(sb, o, 3, Text.literal("Миров: ").formatted(Formatting.GRAY).append(Text.literal(String.valueOf(SessionManager.data.sessions.size())).formatted(Formatting.AQUA)));
		line(sb, o, 4, Text.literal("TPS: ").formatted(Formatting.GRAY).append(Text.literal(String.format("%.1f", tps)).formatted(tps > 18 ? Formatting.GREEN : Formatting.YELLOW)));
		line(sb, o, 5, Text.literal("  "));
		line(sb, o, 6, Rgb.gradient("/raft menu", phase + 0.6f, false));
	}
}
