package ru.raftsurvival.admin;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.io.Reader;
import java.io.Writer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.entity.Entity;
import net.minecraft.server.command.ServerCommandSource;
import net.minecraft.server.network.ServerPlayerEntity;
import ru.raftsurvival.RaftSurvival;

/** Привилегии: ранги с наборами прав. Конфиг: config/raftsurvival/ranks.json (правится вручную или /rank). */
public final class Ranks {
	public static class Rank {
		public String name;
		public String color;
		public int weight;
		public List<String> perms = new ArrayList<>();

		Rank(String name, String color, int weight, String... perms) {
			this.name = name;
			this.color = color;
			this.weight = weight;
			this.perms.addAll(Arrays.asList(perms));
		}
	}

	public static class Config {
		public Map<String, Rank> ranks = new LinkedHashMap<>();
		public String defaultRank = "player";
		public List<String> owners = new ArrayList<>(); // ники, получающие ранг owner автоматически
		public Map<UUID, String> players = new HashMap<>();
	}

	private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
	private static Config cfg = new Config();
	private static Path file;

	private Ranks() {}

	public static void init() {
		file = FabricLoader.getInstance().getConfigDir().resolve("raftsurvival").resolve("ranks.json");
		try {
			Files.createDirectories(file.getParent());
			if (Files.exists(file)) {
				try (Reader r = Files.newBufferedReader(file)) {
					Config c = GSON.fromJson(r, Config.class);
					if (c != null) cfg = c;
				}
			}
		} catch (Exception e) {
			RaftSurvival.LOG.error("ranks.json", e);
		}
		if (cfg.ranks.isEmpty()) {
			cfg.ranks.put("owner", new Rank("Владелец", "#FF3B3B", 0, "*"));
			cfg.ranks.put("admin", new Rank("Админ", "#FF9F1C", 1, "raft.*"));
			cfg.ranks.put("moderator", new Rank("Модер", "#2EC4B6", 2, "raft.kick.any", "raft.session.view"));
			cfg.ranks.put("vip", new Rank("VIP", "#F7D154", 3, "raft.vip"));
			cfg.ranks.put("player", new Rank("Игрок", "#B0B0B0", 4));
			cfg.owners.add("ИмяВладельца");
			save();
		}
	}

	public static void save() {
		try (Writer w = Files.newBufferedWriter(file)) {
			GSON.toJson(cfg, w);
		} catch (Exception e) {
			RaftSurvival.LOG.error("ranks.json save", e);
		}
	}

	public static Map<String, Rank> all() { return cfg.ranks; }

	public static String rankId(ServerPlayerEntity p) {
		String id = cfg.players.get(p.getUuid());
		if (id == null) {
			String n = p.getName().getString();
			for (String o : cfg.owners) if (o.equalsIgnoreCase(n)) return "owner";
			id = cfg.defaultRank;
		}
		return cfg.ranks.containsKey(id) ? id : cfg.defaultRank;
	}

	public static Rank rank(ServerPlayerEntity p) {
		return cfg.ranks.get(rankId(p));
	}

	public static void set(UUID u, String rankId) {
		cfg.players.put(u, rankId);
		save();
	}

	public static boolean has(ServerPlayerEntity p, String node) {
		Rank r = rank(p);
		if (r == null) return false;
		for (String perm : r.perms) {
			if (perm.equals("*") || perm.equals(node)) return true;
			if (perm.endsWith(".*") && node.startsWith(perm.substring(0, perm.length() - 1))) return true;
		}
		return false;
	}

	/** Консоль и командные блоки — всегда разрешено. */
	public static boolean has(ServerCommandSource src, String node) {
		Entity e = src.getEntity();
		return !(e instanceof ServerPlayerEntity p) || has(p, node);
	}
}
