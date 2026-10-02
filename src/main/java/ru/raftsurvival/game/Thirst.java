package ru.raftsurvival.game;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import net.minecraft.entity.damage.DamageSource;
import net.minecraft.server.network.ServerPlayerEntity;
import ru.raftsurvival.Worlds;

public final class Thirst {
	private static final Map<UUID, Float> VALUE = new HashMap<>();
	private static final Map<UUID, Long> COOLDOWN = new HashMap<>();

	private Thirst() {}

	public static float get(UUID u) {
		return VALUE.getOrDefault(u, 20f);
	}

	public static void set(UUID u, float v) {
		VALUE.put(u, Math.max(0, Math.min(20, v)));
	}

	/** Вызывается каждый тик в сессии. */
	public static void tick(ServerPlayerEntity p, int serverTicks) {
		if (serverTicks % 400 == 0) set(p.getUuid(), get(p.getUuid()) - 1);
		if (get(p.getUuid()) <= 0 && serverTicks % 80 == 0 && p.getHealth() > 2f) {
			p.damage(Worlds.of(p), p.getEntityWorld().getDamageSources().starve(), 1f);
		}
	}

	public static boolean drink(ServerPlayerEntity p) {
		long now = p.getEntityWorld().getServer().getTicks();
		if (COOLDOWN.getOrDefault(p.getUuid(), 0L) > now) {
			p.sendMessage(ru.raftsurvival.admin.Msg.info("Опреснитель ещё накапливает воду…"), true);
			return false;
		}
		COOLDOWN.put(p.getUuid(), now + 200);
		set(p.getUuid(), 20);
		p.sendMessage(ru.raftsurvival.admin.Msg.ok("Вы напились пресной воды"), true);
		Quests.flag(p, "drank");
		return true;
	}
}
