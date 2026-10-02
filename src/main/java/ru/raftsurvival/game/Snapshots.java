package ru.raftsurvival.game;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import net.minecraft.entity.effect.StatusEffectInstance;
import net.minecraft.item.ItemStack;
import net.minecraft.nbt.*;
import net.minecraft.registry.RegistryOps;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.world.GameMode;
import ru.raftsurvival.RaftSurvival;
import ru.raftsurvival.Worlds;

/** Сохранение состояния игрока внутри мира (инвентарь, позиция, здоровье, жажда) — для «доиграть позже». */
public final class Snapshots {
	private Snapshots() {}

	private static Path file(Session s, UUID u) {
		return SessionManager.dir.resolve("snap_" + s.id + "_" + u + ".nbt");
	}

	public static void save(ServerPlayerEntity p, Session s) {
		try {
			RegistryOps<NbtElement> ops = p.getEntityWorld().getRegistryManager().getOps(NbtOps.INSTANCE);
			NbtCompound t = new NbtCompound();
			NbtList inv = new NbtList();
			for (int i = 0; i < p.getInventory().size(); i++) {
				NbtElement e = ItemStack.OPTIONAL_CODEC.encodeStart(ops, p.getInventory().getStack(i)).result().orElse(new NbtCompound());
				inv.add(e);
			}
			t.put("inv", inv);
			t.putFloat("health", p.getHealth());
			t.putInt("food", p.getHungerManager().getFoodLevel());
			t.putInt("xp", p.experienceLevel);
			t.putDouble("x", p.getX());
			t.putDouble("y", p.getY());
			t.putDouble("z", p.getZ());
			t.putFloat("yaw", p.getYaw());
			t.putFloat("pitch", p.getPitch());
			t.putFloat("thirst", Thirst.get(p.getUuid()));
			NbtIo.writeCompressed(t, file(s, p.getUuid()));
		} catch (Exception e) {
			RaftSurvival.LOG.error("Ошибка сохранения игрока", e);
		}
	}

	public static boolean has(Session s, UUID u) {
		return Files.exists(file(s, u));
	}

	public static void delete(Session s, UUID u) {
		try {
			Files.deleteIfExists(file(s, u));
		} catch (Exception ignored) {}
	}

	public static void reset(ServerPlayerEntity p) {
		p.getInventory().clear();
		p.clearStatusEffects();
		p.setHealth(p.getMaxHealth());
		p.getHungerManager().setFoodLevel(20);
		p.setExperienceLevel(0);
	}

	public static boolean apply(ServerPlayerEntity p, Session s) {
		try {
			NbtCompound t = NbtIo.readCompressed(file(s, p.getUuid()), NbtSizeTracker.ofUnlimitedBytes());
			RegistryOps<NbtElement> ops = p.getEntityWorld().getRegistryManager().getOps(NbtOps.INSTANCE);
			reset(p);
			NbtList inv = t.getList("inv").orElse(new NbtList());
			for (int i = 0; i < inv.size() && i < p.getInventory().size(); i++) {
				p.getInventory().setStack(i, ItemStack.OPTIONAL_CODEC.parse(ops, inv.get(i)).result().orElse(ItemStack.EMPTY));
			}
			p.setHealth(t.getFloat("health", 20f));
			p.getHungerManager().setFoodLevel(t.getInt("food", 20));
			p.setExperienceLevel(t.getInt("xp", 0));
			Thirst.set(p.getUuid(), t.getFloat("thirst", 20f));
			ServerWorld w = Worlds.ocean(p.getEntityWorld().getServer());
			p.teleport(w, t.getDouble("x", s.spawnX), t.getDouble("y", s.spawnY), t.getDouble("z", s.spawnZ),
				java.util.Set.of(), t.getFloat("yaw", 0f), t.getFloat("pitch", 0f), false);
			p.changeGameMode(GameMode.SURVIVAL);
			return true;
		} catch (Exception e) {
			RaftSurvival.LOG.warn("Нет снимка игрока — новый старт: {}", e.toString());
			return false;
		}
	}
}
