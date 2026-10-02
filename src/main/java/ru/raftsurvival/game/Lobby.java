package ru.raftsurvival.game;

import net.minecraft.block.Block;
import net.minecraft.block.Blocks;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.util.math.BlockPos;
import ru.raftsurvival.ModBlocks;
import ru.raftsurvival.ModEntities;

/** Готовый спавн: деревянный пирс посреди океана. */
public final class Lobby {
	public static final double X = 0.5, Y = 1, Z = 0.5;

	private Lobby() {}

	public static void ensure(MinecraftServer server) {
		if (SessionManager.data.lobbyBuilt) return;
		ServerWorld w = ocean(server);
		for (int dx = -12; dx <= 12; dx++)
			for (int dz = -12; dz <= 12; dz++) {
				boolean edge = Math.abs(dx) == 12 || Math.abs(dz) == 12;
				w.setBlockState(new BlockPos(dx, 0, dz), (edge ? Blocks.DARK_OAK_PLANKS : Blocks.SPRUCE_PLANKS).getDefaultState(), Block.NOTIFY_LISTENERS);
				if (edge && (dx + dz) % 4 == 0) {
					w.setBlockState(new BlockPos(dx, 1, dz), Blocks.DARK_OAK_FENCE.getDefaultState(), Block.NOTIFY_LISTENERS);
					w.setBlockState(new BlockPos(dx, 2, dz), Blocks.LANTERN.getDefaultState(), Block.NOTIFY_LISTENERS);
				}
			}
		for (int dx = -2; dx <= 2; dx++) w.setBlockState(new BlockPos(dx, 0, 0), Blocks.POLISHED_ANDESITE.getDefaultState(), Block.NOTIFY_LISTENERS);
		w.setBlockState(new BlockPos(-6, 1, -6), ModBlocks.FLOATING_BARREL.getDefaultState(), Block.NOTIFY_LISTENERS);
		w.setBlockState(new BlockPos(6, 1, -6), ModBlocks.FLOATING_BARREL.getDefaultState(), Block.NOTIFY_LISTENERS);
		w.setBlockState(new BlockPos(0, 1, -8), ModBlocks.DESALINATOR.getDefaultState(), Block.NOTIFY_LISTENERS);
		SessionManager.data.lobbyBuilt = true;
		SessionManager.save();
	}

	/** Постоянные чайки над лобби. */
	public static void keepGulls(MinecraftServer server) {
		ServerWorld w = ocean(server);
		var box = new net.minecraft.util.math.Box(-30, -5, -30, 30, 30, 30);
		if (w.getEntitiesByType(ModEntities.GULL, box, e -> true).size() >= 3) return;
		var g = ModEntities.GULL.spawn(w, new BlockPos(0, 7, 0), net.minecraft.entity.SpawnReason.EVENT);
		if (g != null) g.setPersistent();
	}

	private static ServerWorld ocean(MinecraftServer s) {
		return ru.raftsurvival.Worlds.ocean(s);
	}
}
