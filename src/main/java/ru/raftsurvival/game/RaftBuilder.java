package ru.raftsurvival.game;

import net.minecraft.block.Block;
import net.minecraft.block.BlockState;
import net.minecraft.block.Blocks;
import net.minecraft.block.entity.BlockEntity;
import net.minecraft.block.entity.ChestBlockEntity;
import net.minecraft.item.ItemStack;
import net.minecraft.item.Items;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.util.math.BlockPos;
import ru.raftsurvival.ModBlocks;
import ru.raftsurvival.admin.MapManager;

/** Генерация стартового плота и островов (или вставка карты, созданной админом). */
public final class RaftBuilder {
	private static final int SEA_FLOOR = -59;
	private static final int SEA = 0;

	private RaftBuilder() {}

	static void set(ServerWorld w, int x, int y, int z, BlockState st) {
		w.setBlockState(new BlockPos(x, y, z), st, Block.NOTIFY_LISTENERS);
	}

	public static void build(ServerWorld w, Session s) {
		int ox = s.originX(), oz = s.originZ();
		s.spawnX = ox + 0.5;
		s.spawnY = 1;
		s.spawnZ = oz + 0.5;
		if (!s.map.isEmpty()) {
			double[] sp = MapManager.paste(w, s.map, new BlockPos(ox, 0, oz));
			if (sp != null) {
				s.spawnX = sp[0]; s.spawnY = sp[1]; s.spawnZ = sp[2];
				return;
			}
		}
		for (int dx = -1; dx <= 1; dx++)
			for (int dz = -1; dz <= 1; dz++) set(w, ox + dx, SEA, oz + dz, ModBlocks.RAFT_PLANK.getDefaultState());
		set(w, ox + 1, 1, oz + 1, Blocks.CRAFTING_TABLE.getDefaultState());
		set(w, ox - 1, 1, oz - 1, ModBlocks.DRYING_RACK.getDefaultState());
		set(w, ox + 4, SEA, oz + 1, ModBlocks.FLOATING_BARREL.getDefaultState());
		set(w, ox - 4, SEA, oz - 2, ModBlocks.FLOATING_BARREL.getDefaultState());
		set(w, ox + 2, SEA, oz - 5, ModBlocks.FLOATING_BARREL.getDefaultState());
		island(w, s.island(0), 7, 0);
		island(w, s.island(1), 7, 1);
		island(w, s.island(2), 7, 2);
		island(w, s.island(3), 6, 3);
	}

	private static void island(ServerWorld w, BlockPos c, int r, int type) {
		for (int dx = -r; dx <= r; dx++)
			for (int dz = -r; dz <= r; dz++) {
				double d = Math.hypot(dx, dz);
				if (d > r) continue;
				int top = d <= r - 2 ? 1 : 0;
				for (int y = SEA_FLOOR; y <= top; y++) {
					BlockState st = Blocks.SAND.getDefaultState();
					if (y == top && top == 1) {
						st = switch (type) {
							case 1 -> (Math.abs(dx * 31 + dz * 17) % 7 == 0) ? Blocks.COAL_ORE.getDefaultState()
								: (Math.abs(dx * 13 + dz * 7) % 11 == 0) ? Blocks.IRON_ORE.getDefaultState() : Blocks.STONE.getDefaultState();
							case 3 -> Blocks.STONE_BRICKS.getDefaultState();
							default -> Blocks.GRASS_BLOCK.getDefaultState();
						};
					}
					set(w, c.getX() + dx, y, c.getZ() + dz, st);
				}
			}
		int x = c.getX(), z = c.getZ();
		switch (type) {
			case 0 -> {
				int[][] trees = {{-3, -3}, {3, -2}, {-2, 3}, {3, 3}, {0, -4}, {-4, 0}};
				for (int[] t : trees) tree(w, x + t[0], z + t[1]);
			}
			case 1 -> {
				for (int i = 0; i < 12; i++) {
					int dx = (i * 5) % 9 - 4, dz = (i * 7) % 9 - 4;
					set(w, x + dx, 2, z + dz, (i % 3 == 0 ? Blocks.IRON_ORE : Blocks.STONE).getDefaultState());
				}
			}
			case 2 -> {
				for (int i = 0; i < 6; i++) set(w, x - 3 + i, 2, z + 3, Blocks.PUMPKIN.getDefaultState());
				for (int i = 0; i < 5; i++) set(w, x - 3 + i, 2, z - 3, Blocks.MELON.getDefaultState());
				BlockPos cp = new BlockPos(x, 2, z);
				w.setBlockState(cp, Blocks.CHEST.getDefaultState(), Block.NOTIFY_LISTENERS);
				BlockEntity be = w.getBlockEntity(cp);
				if (be instanceof ChestBlockEntity ch) {
					ch.setStack(0, new ItemStack(Items.BREAD, 6));
					ch.setStack(1, new ItemStack(Items.APPLE, 4));
					ch.setStack(2, new ItemStack(Items.WHEAT_SEEDS, 8));
					ch.setStack(3, new ItemStack(Items.BONE, 2));
				}
			}
			default -> {
				for (int y = 2; y <= 14; y++)
					for (int dx = -2; dx <= 2; dx++)
						for (int dz = -2; dz <= 2; dz++) {
							boolean wall = Math.abs(dx) == 2 || Math.abs(dz) == 2;
							if (wall) set(w, x + dx, y, z + dz, (y % 5 == 0 ? Blocks.RED_CONCRETE : Blocks.WHITE_CONCRETE).getDefaultState());
						}
				for (int dx = -2; dx <= 2; dx++)
					for (int dz = -2; dz <= 2; dz++) set(w, x + dx, 15, z + dz, Blocks.STONE_BRICK_SLAB.getDefaultState());
				set(w, x, 15, z, Blocks.SEA_LANTERN.getDefaultState());
				set(w, x, 16, z, Blocks.LANTERN.getDefaultState());
				set(w, x + 2, 2, z, Blocks.AIR.getDefaultState());
				set(w, x + 2, 3, z, Blocks.AIR.getDefaultState());
			}
		}
	}

	private static void tree(ServerWorld w, int x, int z) {
		for (int y = 2; y <= 6; y++) set(w, x, y, z, Blocks.OAK_LOG.getDefaultState());
		for (int dx = -2; dx <= 2; dx++)
			for (int dz = -2; dz <= 2; dz++)
				for (int y = 5; y <= 8; y++) {
					if (Math.abs(dx) + Math.abs(dz) + (y - 5) > 4 || (dx == 0 && dz == 0 && y < 7)) continue;
					set(w, x + dx, y, z + dz, Blocks.OAK_LEAVES.getDefaultState());
				}
	}
}
