package ru.raftsurvival.game;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import net.minecraft.particle.ParticleTypes;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.sound.SoundCategory;
import net.minecraft.sound.SoundEvents;
import net.minecraft.util.math.Box;
import net.minecraft.util.math.Vec3d;
import ru.raftsurvival.ModEntities;
import ru.raftsurvival.Worlds;

/** Эффекты ловли: когда игрок выбирает леску — всплеск, прыжок рыбы (частицы), чайка пикирует к месту улова. */
public final class FishingFx {
	private static final Map<UUID, Vec3d> LAST = new HashMap<>();

	private FishingFx() {}

	public static void tick(ServerPlayerEntity p) {
		var hook = p.fishHook;
		if (hook != null) {
			LAST.put(p.getUuid(), hook.getEntityPos());
			return;
		}
		Vec3d pos = LAST.remove(p.getUuid());
		if (pos == null) return;
		ServerWorld w = Worlds.of(p);
		w.spawnParticles(ParticleTypes.SPLASH, pos.x, pos.y + 0.1, pos.z, 30, 0.3, 0.1, 0.3, 0.2);
		w.spawnParticles(ParticleTypes.BUBBLE_POP, pos.x, pos.y + 0.2, pos.z, 12, 0.2, 0.3, 0.2, 0.05);
		// «прыжок» рыбы — дуга частиц к игроку
		Vec3d to = p.getEntityPos().add(0, 1, 0);
		for (int i = 1; i <= 8; i++) {
			double t = i / 8.0;
			double y = pos.y + (to.y - pos.y) * t + Math.sin(t * Math.PI) * 1.5;
			w.spawnParticles(ParticleTypes.SPLASH, pos.x + (to.x - pos.x) * t, y, pos.z + (to.z - pos.z) * t, 2, 0.05, 0.05, 0.05, 0.0);
		}
		w.playSound(null, pos.x, pos.y, pos.z, SoundEvents.ENTITY_FISHING_BOBBER_SPLASH, SoundCategory.NEUTRAL, 0.8f, 1f);
		Box box = new Box(pos.x - 24, pos.y - 10, pos.z - 24, pos.x + 24, pos.y + 20, pos.z + 24);
		for (var g : w.getEntitiesByType(ModEntities.GULL, box, e -> true)) {
			g.getNavigation().startMovingTo(pos.x, pos.y + 1.5, pos.z, 1.3);
		}
	}
}
