package ru.raftsurvival.game;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.io.Reader;
import java.io.Writer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.util.WorldSavePath;
import ru.raftsurvival.RaftSurvival;

public final class SessionManager {
	public static class Data {
		public List<Session> sessions = new ArrayList<>();
		public Map<UUID, String> active = new HashMap<>();
		public int nextSlot = 0;
		public boolean lobbyBuilt = false;
	}

	private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
	public static Data data = new Data();
	public static Path dir;
	private static final Random RND = new Random();

	private SessionManager() {}

	public static void load(MinecraftServer server) {
		dir = server.getSavePath(WorldSavePath.ROOT).resolve("raftsurvival");
		try {
			Files.createDirectories(dir);
			Path f = dir.resolve("data.json");
			if (Files.exists(f)) {
				try (Reader r = Files.newBufferedReader(f)) {
					Data d = GSON.fromJson(r, Data.class);
					if (d != null) data = d;
				}
			}
		} catch (Exception e) {
			RaftSurvival.LOG.error("Не удалось загрузить data.json", e);
		}
	}

	public static void save() {
		if (dir == null) return;
		try {
			Files.createDirectories(dir);
			try (Writer w = Files.newBufferedWriter(dir.resolve("data.json"))) {
				GSON.toJson(data, w);
			}
		} catch (Exception e) {
			RaftSurvival.LOG.error("Не удалось сохранить data.json", e);
		}
	}

	public static Session byId(String id) {
		for (Session s : data.sessions) if (s.id.equalsIgnoreCase(id)) return s;
		return null;
	}

	public static Session activeOf(UUID u) {
		String id = data.active.get(u);
		return id == null ? null : byId(id);
	}

	public static List<Session> mine(UUID u) {
		List<Session> out = new ArrayList<>();
		for (Session s : data.sessions) if (s.members.containsKey(u)) out.add(s);
		return out;
	}

	public static List<Session> joinable(UUID u) {
		List<Session> out = new ArrayList<>();
		for (Session s : data.sessions) {
			if (!s.coop || s.members.containsKey(u) || s.members.size() >= s.max()) continue;
			if (s.access == Access.PRIVATE && !s.invited.contains(u)) continue;
			out.add(s);
		}
		return out;
	}

	public static List<ServerPlayerEntity> online(MinecraftServer server, Session s) {
		List<ServerPlayerEntity> out = new ArrayList<>();
		for (ServerPlayerEntity p : server.getPlayerManager().getPlayerList()) {
			if (s.id.equals(data.active.get(p.getUuid()))) out.add(p);
		}
		return out;
	}

	/** Возвращает текст ошибки или null при успехе. */
	public static String create(ServerPlayerEntity p, boolean coop, Access access, String password, String map) {
		int owned = 0;
		for (Session s : data.sessions) if (s.owner.equals(p.getUuid())) owned++;
		if (owned >= 3) return "Можно владеть не более чем 3 мирами. Удалите лишний: /raft delete";
		if (access == Access.PASSWORD && (password == null || password.isBlank())) return "Нужен пароль";
		Session s = new Session();
		do {
			StringBuilder b = new StringBuilder();
			for (int i = 0; i < 5; i++) b.append("abcdefghjkmnpqrstuvwxyz23456789".charAt(RND.nextInt(31)));
			s.id = b.toString();
		} while (byId(s.id) != null);
		s.owner = p.getUuid();
		s.ownerName = p.getName().getString();
		s.name = "Плот " + s.ownerName + (owned > 0 ? " #" + (owned + 1) : "");
		s.coop = coop;
		s.access = coop ? access : Access.PRIVATE;
		s.password = password == null ? "" : password;
		s.map = map == null ? "" : map;
		s.slot = data.nextSlot++;
		s.created = System.currentTimeMillis();
		s.members.put(s.owner, s.ownerName);
		data.sessions.add(s);
		save();
		Game.enter(p, s);
		return null;
	}

	public static String tryJoin(ServerPlayerEntity p, Session s, String pw) {
		if (s.members.containsKey(p.getUuid())) return null;
		if (!s.coop) return "Это одиночный мир";
		if (s.members.size() >= s.max()) return "Мир заполнен (" + s.max() + "/" + s.max() + ")";
		boolean inv = s.invited.contains(p.getUuid());
		if (!inv) {
			if (s.access == Access.PRIVATE) return "Мир закрыт — нужно приглашение владельца";
			if (s.access == Access.PASSWORD && !s.password.equals(pw == null ? "" : pw)) return "Неверный пароль. Используйте: /raft join " + s.id + " <пароль>";
		}
		s.members.put(p.getUuid(), p.getName().getString());
		s.invited.remove(p.getUuid());
		save();
		Game.enter(p, s);
		return null;
	}

	public static void kick(MinecraftServer server, Session s, UUID target) {
		s.members.remove(target);
		Snapshots.delete(s, target);
		if (s.id.equals(data.active.get(target))) {
			data.active.remove(target);
			ServerPlayerEntity tp = server.getPlayerManager().getPlayer(target);
			if (tp != null) {
				Game.toLobby(tp);
				tp.sendMessage(ru.raftsurvival.admin.Msg.err("Вас исключили из мира " + s.name), false);
			}
		}
		save();
	}

	public static void delete(MinecraftServer server, Session s) {
		for (UUID u : new ArrayList<>(s.members.keySet())) kick(server, s, u);
		data.sessions.remove(s);
		save();
	}
}
