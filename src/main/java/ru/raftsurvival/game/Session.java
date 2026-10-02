package ru.raftsurvival.game;

import java.util.*;
import net.minecraft.util.math.BlockPos;

/** Один мир-плот. Хранится в data.json внутри папки сохранения. */
public class Session {
	public String id;
	public String name;
	public String mode = "raft";
	public UUID owner;
	public String ownerName;
	public boolean coop;
	public Access access = Access.PUBLIC;
	public String password = "";
	public Map<UUID, String> members = new LinkedHashMap<>(); // uuid -> ник
	public Set<UUID> invited = new HashSet<>();
	public int slot;
	public String map = "";
	public boolean built;
	public double spawnX, spawnY = 1, spawnZ;
	public int stage;
	public boolean finished;
	public Set<String> flags = new HashSet<>();
	public long created;

	public transient List<BlockPos> barrels = new ArrayList<>();

	public int max() {
		return coop ? 4 : 1;
	}

	public int originX() {
		return 2000 + (slot % 64) * 1500;
	}

	public int originZ() {
		return 2000 + (slot / 64) * 1500;
	}

	/** Центры 4 островов: 0 — лес, 1 — шахта, 2 — ферма, 3 — маяк. */
	public BlockPos island(int i) {
		int[][] d = {{0, -45}, {45, 0}, {0, 45}, {-45, 0}};
		return new BlockPos(originX() + d[i][0], 0, originZ() + d[i][1]);
	}
}
