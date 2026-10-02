package ru.raftsurvival;

import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.StringArgumentType;
import com.mojang.brigadier.builder.LiteralArgumentBuilder;
import com.mojang.brigadier.context.CommandContext;
import com.mojang.brigadier.suggestion.SuggestionProvider;
import java.util.UUID;
import net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback;
import net.minecraft.command.CommandSource;
import net.minecraft.server.command.CommandManager;
import net.minecraft.server.command.ServerCommandSource;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;
import net.minecraft.entity.SpawnReason;
import net.minecraft.util.math.BlockPos;
import ru.raftsurvival.admin.*;
import ru.raftsurvival.game.*;
import ru.raftsurvival.gui.Gui;

import static net.minecraft.server.command.CommandManager.argument;
import static net.minecraft.server.command.CommandManager.literal;

public final class Commands {
	private Commands() {}

	public static void init() {
		CommandRegistrationCallback.EVENT.register((d, access, env) -> {
			raft(d);
			rank(d);
			map(d);
			admin(d);
		});
	}

	private static ServerPlayerEntity player(CommandContext<ServerCommandSource> c) {
		if (c.getSource().getEntity() instanceof ServerPlayerEntity p) return p;
		c.getSource().sendError(Text.literal("Только для игроков"));
		return null;
	}

	private static void ok(CommandContext<ServerCommandSource> c, String s) { c.getSource().sendFeedback(() -> Msg.ok(s), false); }
	private static void info(CommandContext<ServerCommandSource> c, String s) { c.getSource().sendFeedback(() -> Msg.info(s), false); }
	private static void err(CommandContext<ServerCommandSource> c, String s) { c.getSource().sendError(Msg.err(s)); }

	private static final SuggestionProvider<ServerCommandSource> SESSIONS = (c, b) ->
		CommandSource.suggestMatching(SessionManager.data.sessions.stream().map(s -> s.id).toList(), b);

	private static Session owned(CommandContext<ServerCommandSource> c, ServerPlayerEntity p) {
		Session s = SessionManager.activeOf(p.getUuid());
		if (s == null) { err(c, "Вы не в мире. Откройте /raft menu"); return null; }
		if (!s.owner.equals(p.getUuid()) && !Ranks.has(p, "raft.admin")) { err(c, "Это может только владелец мира"); return null; }
		return s;
	}

	private static int create(CommandContext<ServerCommandSource> c, boolean coop, Access a, String pw) {
		ServerPlayerEntity p = player(c);
		if (p == null) return 0;
		String e = SessionManager.create(p, coop, a, pw, "");
		if (e != null) err(c, e);
		return e == null ? 1 : 0;
	}

	private static void raft(CommandDispatcher<ServerCommandSource> d) {
		LiteralArgumentBuilder<ServerCommandSource> r = literal("raft");
		r.executes(c -> { ServerPlayerEntity p = player(c); if (p != null) Gui.openMain(p); return 1; });
		r.then(literal("menu").executes(c -> { ServerPlayerEntity p = player(c); if (p != null) Gui.openMain(p); return 1; }));
		r.then(literal("lobby").executes(c -> { ServerPlayerEntity p = player(c); if (p != null) { Game.toLobby(p); } return 1; }));
		r.then(literal("leave").executes(c -> { ServerPlayerEntity p = player(c); if (p != null) { Game.toLobby(p); } return 1; }));
		r.then(literal("quests").executes(c -> { ServerPlayerEntity p = player(c); if (p != null) Gui.sendQuests(p); return 1; }));
		r.then(literal("list").executes(c -> {
			ServerPlayerEntity p = player(c);
			if (p == null) return 0;
			for (Session s : SessionManager.joinable(p.getUuid())) info(c, s.id + " — " + s.name + " [" + s.members.size() + "/" + s.max() + ", " + s.access.label + "]");
			return 1;
		}));
		// /raft create solo | coop <public|private|password> [пароль]
		r.then(literal("create")
			.then(literal("solo").executes(c -> create(c, false, Access.PRIVATE, "")))
			.then(literal("coop")
				.then(literal("public").executes(c -> create(c, true, Access.PUBLIC, "")))
				.then(literal("private").executes(c -> create(c, true, Access.PRIVATE, "")))
				.then(literal("password").then(argument("пароль", StringArgumentType.word())
					.executes(c -> create(c, true, Access.PASSWORD, StringArgumentType.getString(c, "пароль")))))));
		r.then(literal("join").then(argument("id", StringArgumentType.word()).suggests(SESSIONS)
			.executes(c -> join(c, ""))
			.then(argument("пароль", StringArgumentType.word()).executes(c -> join(c, StringArgumentType.getString(c, "пароль"))))));
		r.then(literal("resume").then(argument("id", StringArgumentType.word()).suggests(SESSIONS).executes(c -> {
			ServerPlayerEntity p = player(c);
			Session s = p == null ? null : SessionManager.byId(StringArgumentType.getString(c, "id"));
			if (s == null || !s.members.containsKey(p.getUuid())) { err(c, "Нет такого вашего мира"); return 0; }
			Game.enter(p, s);
			return 1;
		})));
		r.then(literal("invite").then(argument("ник", StringArgumentType.word()).executes(c -> {
			ServerPlayerEntity p = player(c);
			if (p == null) return 0;
			Session s = owned(c, p);
			if (s == null) return 0;
			if (!s.coop) { err(c, "В одиночный мир приглашать нельзя"); return 0; }
			ServerPlayerEntity t = c.getSource().getServer().getPlayerManager().getPlayer(StringArgumentType.getString(c, "ник"));
			if (t == null) { err(c, "Игрок не в сети"); return 0; }
			s.invited.add(t.getUuid());
			SessionManager.save();
			ok(c, "Приглашение отправлено: " + t.getName().getString());
			t.sendMessage(Msg.info(p.getName().getString() + " приглашает вас в мир «" + s.name + "»: /raft join " + s.id), false);
			return 1;
		})));
		r.then(literal("kick").then(argument("ник", StringArgumentType.word()).suggests((c, b) -> {
			ServerPlayerEntity p = c.getSource().getEntity() instanceof ServerPlayerEntity pp ? pp : null;
			Session s = p == null ? null : SessionManager.activeOf(p.getUuid());
			return CommandSource.suggestMatching(s == null ? java.util.List.<String>of() : s.members.values(), b);
		}).executes(c -> {
			ServerPlayerEntity p = player(c);
			if (p == null) return 0;
			Session s = owned(c, p);
			if (s == null) return 0;
			String name = StringArgumentType.getString(c, "ник");
			UUID target = null;
			for (var e : s.members.entrySet()) if (e.getValue().equalsIgnoreCase(name)) target = e.getKey();
			if (target == null) { err(c, "Такого игрока нет в мире"); return 0; }
			if (target.equals(s.owner)) { err(c, "Владельца исключить нельзя"); return 0; }
			SessionManager.kick(c.getSource().getServer(), s, target);
			ok(c, "Игрок исключён: " + name);
			return 1;
		})));
		r.then(literal("password").then(argument("пароль", StringArgumentType.word()).executes(c -> {
			ServerPlayerEntity p = player(c);
			if (p == null) return 0;
			Session s = owned(c, p);
			if (s == null) return 0;
			if (!s.coop) { err(c, "Пароль нужен только кооперативу"); return 0; }
			s.access = Access.PASSWORD;
			s.password = StringArgumentType.getString(c, "пароль");
			SessionManager.save();
			ok(c, "Доступ: по паролю");
			return 1;
		})));
		for (Access a : new Access[]{Access.PUBLIC, Access.PRIVATE}) {
			r.then(literal(a == Access.PUBLIC ? "public" : "private").executes(c -> {
				ServerPlayerEntity p = player(c);
				if (p == null) return 0;
				Session s = owned(c, p);
				if (s == null || !s.coop) return 0;
				s.access = a;
				SessionManager.save();
				ok(c, "Доступ: " + a.label);
				return 1;
			}));
		}
		r.then(literal("manage").executes(c -> {
			ServerPlayerEntity p = player(c);
			if (p == null) return 0;
			Session s = owned(c, p);
			if (s != null) Gui.openManage(p, s);
			return 1;
		}));
		r.then(literal("delete").executes(c -> {
			ServerPlayerEntity p = player(c);
			if (p == null) return 0;
			Session s = owned(c, p);
			if (s == null) return 0;
			SessionManager.delete(c.getSource().getServer(), s);
			ok(c, "Мир удалён");
			return 1;
		}));
		d.register(r);
	}

	private static int join(CommandContext<ServerCommandSource> c, String pw) {
		ServerPlayerEntity p = player(c);
		if (p == null) return 0;
		Session s = SessionManager.byId(StringArgumentType.getString(c, "id"));
		if (s == null) { err(c, "Мир не найден"); return 0; }
		String e = SessionManager.tryJoin(p, s, pw);
		if (e != null) { err(c, e); return 0; }
		return 1;
	}

	private static void rank(CommandDispatcher<ServerCommandSource> d) {
		d.register(literal("rank").requires(s -> Ranks.has(s, "raft.rank"))
			.then(literal("list").executes(c -> {
				Ranks.all().forEach((id, r) -> info(c, id + " — " + r.name + " " + r.perms));
				return 1;
			}))
			.then(literal("set").then(argument("ник", StringArgumentType.word()).then(argument("ранг", StringArgumentType.word())
				.suggests((c, b) -> CommandSource.suggestMatching(Ranks.all().keySet(), b))
				.executes(c -> {
					ServerPlayerEntity t = c.getSource().getServer().getPlayerManager().getPlayer(StringArgumentType.getString(c, "ник"));
					String id = StringArgumentType.getString(c, "ранг");
					if (t == null) { err(c, "Игрок должен быть в сети"); return 0; }
					if (!Ranks.all().containsKey(id)) { err(c, "Нет такого ранга. /rank list"); return 0; }
					Ranks.set(t.getUuid(), id);
					TabManager.apply(t);
					ok(c, t.getName().getString() + " → " + id);
					return 1;
				})))));
	}

	private static void map(CommandDispatcher<ServerCommandSource> d) {
		SuggestionProvider<ServerCommandSource> names = (c, b) -> CommandSource.suggestMatching(MapManager.names(), b);
		d.register(literal("raftmap").requires(s -> Ranks.has(s, "raft.map"))
			.then(literal("wand").executes(c -> {
				ServerPlayerEntity p = player(c);
				if (p != null) { p.giveItemStack(MapManager.wand()); ok(c, "Палочка выдана: ЛКМ — точка 1, ПКМ — точка 2"); }
				return 1;
			}))
			.then(literal("save").then(argument("имя", StringArgumentType.word()).executes(c -> {
				ServerPlayerEntity p = player(c);
				if (p == null) return 0;
				String e = MapManager.saveSelection(p, StringArgumentType.getString(c, "имя"));
				if (e != null) { err(c, e); return 0; }
				ok(c, "Карта сохранена. Задайте спавн: встаньте и /raftmap spawn <имя> (угол — точка 1 выделения)");
				return 1;
			})))
			.then(literal("list").executes(c -> { info(c, "Карты: " + MapManager.names()); return 1; }))
			.then(literal("delete").then(argument("имя", StringArgumentType.word()).suggests(names).executes(c -> {
				ok(c, MapManager.delete(StringArgumentType.getString(c, "имя")) ? "Удалено" : "Не найдено");
				return 1;
			})))
			.then(literal("load").then(argument("имя", StringArgumentType.word()).suggests(names).executes(c -> {
				ServerPlayerEntity p = player(c);
				if (p == null) return 0;
				double[] sp = MapManager.paste(Worlds.of(p), StringArgumentType.getString(c, "имя"), p.getBlockPos());
				if (sp == null) { err(c, "Карта не найдена"); return 0; }
				ok(c, "Карта вставлена от вашей позиции");
				return 1;
			})))
			.then(literal("spawn").then(argument("имя", StringArgumentType.word()).suggests(names).executes(c -> {
				ServerPlayerEntity p = player(c);
				if (p == null) return 0;
				ok(c, MapManager.setSpawn(StringArgumentType.getString(c, "имя"), p.getX(), p.getY(), p.getZ(), lastCorner(p)) ? "Спавн карты задан" : "Карта не найдена");
				return 1;
			}))));
	}

	/** Угол карты = минимальный угол последнего выделения игрока (см. MapManager). */
	private static BlockPos lastCorner(ServerPlayerEntity p) {
		BlockPos[] s = MapManager.selection(p);
		if (s[0] == null || s[1] == null) return p.getBlockPos();
		return new BlockPos(Math.min(s[0].getX(), s[1].getX()), Math.min(s[0].getY(), s[1].getY()), Math.min(s[0].getZ(), s[1].getZ()));
	}

	private static void admin(CommandDispatcher<ServerCommandSource> d) {
		d.register(literal("raftpanel").requires(s -> Ranks.has(s, "raft.panel"))
			.then(literal("on").executes(c -> { PanelManager.toggle(c.getSource().getServer(), true); ok(c, "RGB-панель включена"); return 1; }))
			.then(literal("off").executes(c -> { PanelManager.toggle(c.getSource().getServer(), false); ok(c, "RGB-панель выключена"); return 1; })));
		d.register(literal("raftadmin").requires(s -> Ranks.has(s, "raft.admin"))
			.then(literal("shark").executes(c -> {
				ServerPlayerEntity p = player(c);
				if (p != null) ModEntities.SHARK.spawn(Worlds.of(p), p.getBlockPos().add(6, -2, 0), SpawnReason.COMMAND);
				return 1;
			}))
			.then(literal("gull").executes(c -> {
				ServerPlayerEntity p = player(c);
				if (p != null) ModEntities.GULL.spawn(Worlds.of(p), p.getBlockPos().up(3), SpawnReason.COMMAND);
				return 1;
			}))
			.then(literal("sessions").executes(c -> {
				for (Session s : SessionManager.data.sessions) info(c, s.id + " " + s.name + " " + s.members.values() + " " + s.access);
				return 1;
			})));
	}
}
