package ru.raftsurvival;

import net.minecraft.entity.Entity;
import net.minecraft.registry.RegistryKey;
import net.minecraft.registry.RegistryKeys;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.world.World;

/** Единая точка доступа к мирам: при смене API правится только здесь. */
public final class Worlds {
	public static final RegistryKey<World> OCEAN = RegistryKey.of(RegistryKeys.WORLD, RaftSurvival.id("ocean"));

	private Worlds() {}

	public static ServerWorld ocean(MinecraftServer server) {
		ServerWorld w = server.getWorld(OCEAN);
		return w != null ? w : server.getOverworld();
	}

	public static ServerWorld of(Entity e) {
		return (ServerWorld) e.getEntityWorld();
	}
}
