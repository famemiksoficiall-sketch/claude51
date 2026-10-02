package ru.raftsurvival.game;

import java.util.List;
import java.util.Random;
import java.util.Set;
import net.fabricmc.fabric.api.entity.event.v1.ServerLivingEntityEvents;
import net.fabricmc.fabric.api.entity.event.v1.ServerPlayerEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.fabricmc.fabric.api.event.player.UseItemCallback;
import net.fabricmc.fabric.api.loot.v3.LootTableEvents;
import net.fabricmc.fabric.api.networking.v1.ServerPlayConnectionEvents;
import net.minecraft.block.Blocks;
import net.minecraft.entity.SpawnReason;
import net.minecraft.fluid.Fluids;
import net.minecraft.item.ItemStack;
import net.minecraft.item.Items;
import net.minecraft.loot.LootPool;
import net.minecraft.loot.condition.RandomChanceLootCondition;
import net.minecraft.loot.entry.ItemEntry;
import net.minecraft.loot.provider.number.ConstantLootNumberProvider;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.text.Text;
import net.minecraft.util.ActionResult;
import net.minecraft.util.Formatting;
import net.minecraft.util.Identifier;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Box;
import net.minecraft.world.GameMode;
import ru.raftsurvival.ModBlocks;
import ru.raftsurvival.ModEntities;
import ru.raftsurvival.ModItems;
import ru.raftsurvival.RaftSurvival;
import ru.raftsurvival.Worlds;
import ru.raftsurvival.admin.Msg;
import ru.raftsurvival.admin.TabManager;
import ru.raftsurvival.gui.Gui;

public final class Game {
	private static final Random RND = new Random();

	private Game() {}

	public static void init() {
		ServerLifecycleEvents.SERVER_STARTED.register(server -> {
			SessionManager.load(server);
			Lobby.ensure(server);
		});
		ServerLifecycleEvents.SERVER_STOPPING.register(server -> {
			saveAll(server);
			SessionManager.save();
		});
		ServerPlayConnectionEvents.JOIN.register((handler, sender, server) -> onJoin(handler.player, server));
		ServerPlayConnectionEvents.DISCONNECT.register((handler, server) -> onLeave(handler.player));
		ServerPlayerEvents.AFTER_RESPAWN.register((old, neu, alive) -> onRespawn(neu));
		ServerTickEvents.END_SERVER_TICK.register(Game::tick);
		ServerLivingEntityEvents.ALLOW_DAMAGE.register((entity, source, amount) ->
			!(entity instanceof ServerPlayerEntity p && SessionManager.activeOf(p.getUuid()) == null));
		UseItemCallback.EVENT.register((player, world, hand) -> {
			ItemStack st = player.getStackInHand(hand);
			if (!world.isClient() && st.isOf(Items.COMPASS) && player instanceof ServerPlayerEntity sp && SessionManager.activeOf(sp.getUuid()) == null) {
				Gui.openMain(sp);
				return ActionResult.SUCCESS;
			}
			return ActionResult.PASS;
		});
		// Рыбалка: добавляем обломки/верёвку/доски в улов
		LootTableEvents.MODIFY.register((key, builder, source, registries) -> {
			if (key.getValue().equals(Identifier.ofVanilla("gameplay/fishing"))) {
				builder.pool(LootPool.builder().rolls(ConstantLootNumberProvider.create(1))
					.conditionally(RandomChanceLootCondition.builder(0.45f))
					.with(ItemEntry.builder(ModItems.SCRAP).weight(10))
					.with(ItemEntry.builder(ModItems.RAFT_PLANK).weight(4))
					.with(ItemEntry.builder(ModItems.ROPE).weight(3))
					.with(ItemEntry.builder(Items.BOWL).weight(2)));
			}
		});
	}

	// ---------------------------------------------------------------- вход / выход
	static void onJoin(ServerPlayerEntity p, MinecraftServer server) {
		TabManager.apply(p);
		Session s = SessionManager.activeOf(p.getUuid());
		server.execute(() -> {
			if (s != null && s.members.containsKey(p.getUuid())) {
				p.sendMessage(Msg.ok("С возвращением! Мир «" + s.name + "» продолжен с места, где вы остановились."), false);
				enter(p, s);
			} else {
				SessionManager.data.active.remove(p.getUuid());
				toLobby(p);
				Gui.openMain(p);
			}
		});
	}

	static void onLeave(ServerPlayerEntity p) {
		Session s = SessionManager.activeOf(p.getUuid());
		if (s != null) Snapshots.save(p, s);
		SessionManager.save();
	}

	static void saveAll(MinecraftServer server) {
		for (ServerPlayerEntity p : server.getPlayerManager().getPlayerList()) {
			Session s = SessionManager.activeOf(p.getUuid());
			if (s != null) Snapshots.save(p, s);
		}
	}

	static void onRespawn(ServerPlayerEntity p) {
		Session s = SessionManager.activeOf(p.getUuid());
		MinecraftServer server = p.getEntityWorld().getServer();
		ServerWorld w = Worlds.ocean(server);
		if (s == null) {
			toLobby(p);
		} else {
			p.teleport(w, s.spawnX, s.spawnY, s.spawnZ, Set.of(), 0f, 0f, false);
			Thirst.set(p.getUuid(), 20);
			p.sendMessage(Msg.info("Вы очнулись на плоту. Часть вещей утрачена в море…"), false);
		}
	}

	public static void toLobby(ServerPlayerEntity p) {
		Session s = SessionManager.activeOf(p.getUuid());
		if (s != null) Snapshots.save(p, s);
		SessionManager.data.active.remove(p.getUuid());
		SessionManager.save();
		Snapshots.reset(p);
		ServerWorld w = Worlds.ocean(p.getEntityWorld().getServer());
		p.teleport(w, Lobby.X, Lobby.Y, Lobby.Z, Set.of(), 0f, 0f, false);
		p.changeGameMode(GameMode.ADVENTURE);
		ItemStack compass = new ItemStack(Items.COMPASS);
		compass.set(net.minecraft.component.DataComponentTypes.CUSTOM_NAME,
			Text.literal("Меню режимов").styled(st -> st.withColor(Formatting.AQUA).withItalic(false)));
		p.getInventory().setStack(4, compass);
	}

	public static void enter(ServerPlayerEntity p, Session s) {
		MinecraftServer server = p.getEntityWorld().getServer();
		ServerWorld w = Worlds.ocean(server);
		p.closeHandledScreen();
		if (!s.built) {
			RaftBuilder.build(w, s);
			s.built = true;
		}
		SessionManager.data.active.put(p.getUuid(), s.id);
		boolean resumed = Snapshots.has(s, p.getUuid()) && Snapshots.apply(p, s);
		if (!resumed) {
			Snapshots.reset(p);
			p.changeGameMode(GameMode.SURVIVAL);
			Thirst.set(p.getUuid(), 20);
			int idx = new java.util.ArrayList<>(s.members.keySet()).indexOf(p.getUuid());
			int[][] off = {{0, 0}, {1, 0}, {-1, 0}, {0, 1}};
			int[] o = off[Math.max(0, Math.min(3, idx))];
			p.teleport(w, s.spawnX + o[0], s.spawnY, s.spawnZ + o[1], Set.of(), 0f, 0f, false);
			p.giveItemStack(new ItemStack(Items.FISHING_ROD));
			p.giveItemStack(new ItemStack(ModItems.RAFT_PLANK, 4));
			p.giveItemStack(new ItemStack(Items.COOKED_COD, 3));
			p.sendMessage(Msg.ok("Добро пожаловать на плот! Лови рыбу, собирай хлам и расширяй плот. /raft quests — цели."), false);
		}
		SessionManager.save();
	}

	// ---------------------------------------------------------------- тик
	static void tick(MinecraftServer server) {
		int t = server.getTicks();
		for (ServerPlayerEntity p : server.getPlayerManager().getPlayerList()) {
			Session s = SessionManager.activeOf(p.getUuid());
			if (s == null) {
				if (t % 20 == 0) {
					p.getHungerManager().setFoodLevel(20);
					p.setHealth(p.getMaxHealth());
					if (Math.hypot(p.getX(), p.getZ()) > 40 || p.getY() < -5) {
						ServerWorld w = Worlds.ocean(server);
						p.teleport(w, Lobby.X, Lobby.Y, Lobby.Z, Set.of(), 0f, 0f, false);
					}
				}
			} else {
				Thirst.tick(p, t);
				FishingFx.tick(p);
				if (t % 20 == 0) {
					Quests.tick(p, s);
					int th = Math.round(Thirst.get(p.getUuid()));
					p.sendMessage(Quests.hud(s).copy().append(Text.literal("   💧 " + th + "/20").formatted(th <= 5 ? Formatting.RED : Formatting.AQUA)), true);
				}
			}
		}
		if (t % 600 == 0) {
			Lobby.keepGulls(server);
			for (Session s : List.copyOf(SessionManager.data.sessions)) {
				List<ServerPlayerEntity> on = SessionManager.online(server, s);
				if (!on.isEmpty()) spawners(server, s);
			}
		}
		if (t % 6000 == 0) {
			saveAll(server);
			SessionManager.save();
		}
	}

	private static void spawners(MinecraftServer server, Session s) {
		ServerWorld w = Worlds.ocean(server);
		int ox = s.originX(), oz = s.originZ();
		Box box = new Box(ox - 64, -10, oz - 64, ox + 64, 40, oz + 64);
		// акулы — сложность растёт с этапом
		int cap = Math.min(4, 1 + s.stage / 3);
		if (w.getEntitiesByType(ModEntities.SHARK, box, e -> true).size() < cap && RND.nextFloat() < 0.6f) {
			double a = RND.nextDouble() * Math.PI * 2, r = 18 + RND.nextInt(12);
			BlockPos pos = new BlockPos((int) (ox + Math.cos(a) * r), -3, (int) (oz + Math.sin(a) * r));
			if (w.getFluidState(pos).isOf(Fluids.WATER)) ModEntities.SHARK.spawn(w, pos, SpawnReason.EVENT);
		}
		// чайки
		if (w.getEntitiesByType(ModEntities.GULL, box, e -> true).size() < 2) {
			var g = ModEntities.GULL.spawn(w, new BlockPos(ox + RND.nextInt(8) - 4, 8, oz + RND.nextInt(8) - 4), SpawnReason.EVENT);
			if (g != null) g.setPersistent();
		}
		// плавучие бочки
		s.barrels.removeIf(b -> !w.getBlockState(b).isOf(ModBlocks.FLOATING_BARREL));
		if (s.barrels.size() < 6 && RND.nextFloat() < 0.7f) {
			double a = RND.nextDouble() * Math.PI * 2, r = 6 + RND.nextInt(11);
			BlockPos pos = new BlockPos((int) (ox + Math.cos(a) * r), 0, (int) (oz + Math.sin(a) * r));
			if (w.getBlockState(pos).isOf(Blocks.WATER) && w.getBlockState(pos.up()).isAir()) {
				w.setBlockState(pos, ModBlocks.FLOATING_BARREL.getDefaultState());
				s.barrels.add(pos);
			}
		}
	}
}
