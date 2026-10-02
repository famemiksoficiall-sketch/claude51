package ru.raftsurvival;

import net.fabricmc.fabric.api.object.builder.v1.entity.FabricDefaultAttributeRegistry;
import net.minecraft.entity.EntityType;
import net.minecraft.entity.SpawnGroup;
import net.minecraft.registry.Registries;
import net.minecraft.registry.Registry;
import net.minecraft.registry.RegistryKey;
import net.minecraft.registry.RegistryKeys;
import ru.raftsurvival.entity.GullEntity;
import ru.raftsurvival.entity.SharkEntity;

public final class ModEntities {
	public static final EntityType<SharkEntity> SHARK = reg("shark",
		EntityType.Builder.create(SharkEntity::new, SpawnGroup.WATER_CREATURE).dimensions(1.8f, 1.0f).maxTrackingRange(10));
	public static final EntityType<GullEntity> GULL = reg("gull",
		EntityType.Builder.create(GullEntity::new, SpawnGroup.CREATURE).dimensions(0.6f, 0.6f).maxTrackingRange(8));

	private ModEntities() {}

	private static <T extends net.minecraft.entity.Entity> EntityType<T> reg(String name, EntityType.Builder<T> b) {
		RegistryKey<EntityType<?>> key = RegistryKey.of(RegistryKeys.ENTITY_TYPE, RaftSurvival.id(name));
		return Registry.register(Registries.ENTITY_TYPE, key, b.build(key));
	}

	public static void init() {
		FabricDefaultAttributeRegistry.register(SHARK, SharkEntity.createSharkAttributes());
		FabricDefaultAttributeRegistry.register(GULL, GullEntity.createGullAttributes());
	}
}
