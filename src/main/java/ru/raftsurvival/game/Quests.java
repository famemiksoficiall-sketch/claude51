package ru.raftsurvival.game;

import java.util.List;
import java.util.function.BiPredicate;
import java.util.function.Consumer;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.item.Items;
import net.minecraft.particle.ParticleTypes;
import net.minecraft.registry.tag.ItemTags;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.network.packet.s2c.play.SubtitleS2CPacket;
import net.minecraft.network.packet.s2c.play.TitleS2CPacket;
import net.minecraft.sound.SoundCategory;
import net.minecraft.sound.SoundEvents;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;
import net.minecraft.util.math.BlockPos;
import ru.raftsurvival.ModBlocks;
import ru.raftsurvival.ModItems;
import ru.raftsurvival.Worlds;
import ru.raftsurvival.admin.Msg;

/** Прохождение «Выживания на плоту»: 10 этапов от первого улова до спасения. */
public final class Quests {
	public record Q(String title, String hint, BiPredicate<ServerPlayerEntity, Session> done, Consumer<ServerPlayerEntity> reward) {}

	public static final List<Q> ALL = List.of(
		new Q("Первый улов", "Закинь удочку (в стартовом наборе) и поймай рыбу.",
			(p, s) -> count(p, Items.COD) + count(p, Items.SALMON) + count(p, Items.TROPICAL_FISH) + count(p, ModItems.DRIED_FISH) > 0,
			p -> give(p, new ItemStack(ModItems.ROPE, 2))),
		new Q("Хлам с волн", "Лови обломки, открывай плавучие бочки (ПКМ). Нужно 4 обломка или доски.",
			(p, s) -> count(p, ModItems.SCRAP) + 2 * count(p, ModItems.RAFT_PLANK) >= 4 || raftSize(p, s) >= 12,
			p -> give(p, new ItemStack(ModItems.RAFT_PLANK, 4))),
		new Q("Расширь плот", "Доски кладутся на воду вплотную к плоту. Доведи плот до 15 досок.",
			(p, s) -> raftSize(p, s) >= 15, p -> give(p, new ItemStack(Items.BOWL, 1))),
		new Q("Пресная вода", "Скрафти опреснитель (5 досок, верёвка, миска) и напейся (ПКМ).",
			(p, s) -> s.flags.contains("drank"), p -> give(p, new ItemStack(Items.STICK, 4))),
		new Q("Вяленая рыба", "Скрафти сушилку, повесь сырую рыбу и забери вяленую.",
			(p, s) -> s.flags.contains("dried"), p -> give(p, new ItemStack(Items.COOKED_SALMON, 4))),
		new Q("Земля!", "Доплыви до северного острова (на лодке или вплавь).",
			(p, s) -> s.flags.contains("isl0"), p -> give(p, new ItemStack(Items.OAK_BOAT, 1))),
		new Q("Дерево и камень", "Собери 8 брёвен (север) и 8 булыжника (восточный остров-шахта).",
			(p, s) -> logs(p) >= 8 && count(p, Items.COBBLESTONE) >= 8, p -> give(p, new ItemStack(Items.IRON_INGOT, 3))),
		new Q("Охота на акул", "Скрафти гарпун (кость + палки) и добудь 3 акульих зуба.",
			(p, s) -> count(p, ModItems.SHARK_TOOTH) >= 3, p -> give(p, new ItemStack(Items.COOKED_COD, 8))),
		new Q("Сигнал", "Скрафти сигнальную ракету (3 зуба, верёвка, кость) и доберись до маяка на западе.",
			(p, s) -> count(p, ModItems.SIGNAL_FLARE) >= 1 && s.flags.contains("isl3"), p -> give(p, new ItemStack(Items.GOLDEN_APPLE, 1))),
		new Q("Спасение", "Запусти ракету (ПКМ) возле маяка!", (p, s) -> false, p -> {})
	);

	private Quests() {}

	static int count(ServerPlayerEntity p, Item item) {
		return p.getInventory().count(item);
	}

	static int logs(ServerPlayerEntity p) {
		int n = 0;
		for (int i = 0; i < p.getInventory().size(); i++) {
			ItemStack st = p.getInventory().getStack(i);
			if (st.isIn(ItemTags.LOGS)) n += st.getCount();
		}
		return n;
	}

	static void give(ServerPlayerEntity p, ItemStack s) {
		p.giveItemStack(s);
	}

	public static int raftSize(ServerPlayerEntity p, Session s) {
		ServerWorld w = Worlds.ocean(p.getEntityWorld().getServer());
		int n = 0;
		BlockPos.Mutable m = new BlockPos.Mutable();
		for (int dx = -14; dx <= 14; dx++)
			for (int dz = -14; dz <= 14; dz++) {
				m.set(s.originX() + dx, 0, s.originZ() + dz);
				if (w.getBlockState(m).isOf(ModBlocks.RAFT_PLANK)) n++;
			}
		return n;
	}

	public static void flag(ServerPlayerEntity p, String f) {
		Session s = SessionManager.activeOf(p.getUuid());
		if (s != null && s.flags.add(f)) SessionManager.save();
	}

	private static boolean near(ServerPlayerEntity p, BlockPos c, double r) {
		return Math.hypot(p.getX() - c.getX(), p.getZ() - c.getZ()) < r;
	}

	public static void tick(ServerPlayerEntity p, Session s) {
		for (int i = 0; i < 4; i++) if (near(p, s.island(i), 14) && s.flags.add("isl" + i)) SessionManager.save();
		if (s.stage >= ALL.size() - 1) return;
		Q q = ALL.get(s.stage);
		if (q.done().test(p, s)) {
			s.stage++;
			SessionManager.save();
			q.reward().accept(p);
			for (ServerPlayerEntity m : SessionManager.online(p.getEntityWorld().getServer(), s)) {
				m.networkHandler.sendPacket(new TitleS2CPacket(Text.literal("✔ " + q.title()).formatted(Formatting.GREEN)));
				m.networkHandler.sendPacket(new SubtitleS2CPacket(Text.literal("Этап " + s.stage + "/" + ALL.size()).formatted(Formatting.GRAY)));
				m.sendMessage(Msg.ok("Этап выполнен: " + q.title()), false);
				m.sendMessage(Msg.info("Следующий: " + ALL.get(s.stage).title() + " — " + ALL.get(s.stage).hint()), false);
				m.playSound(SoundEvents.ENTITY_PLAYER_LEVELUP, 1f, 1f);
			}
		}
	}

	public static Text hud(Session s) {
		if (s.finished) return Text.literal("★ Вы спасены! Можно играть дальше").formatted(Formatting.GOLD);
		Q q = ALL.get(Math.min(s.stage, ALL.size() - 1));
		return Text.literal("Цель " + (s.stage + 1) + "/" + ALL.size() + ": ").formatted(Formatting.YELLOW).append(Text.literal(q.title()).formatted(Formatting.WHITE));
	}

	public static boolean tryFinish(ServerPlayerEntity p) {
		Session s = SessionManager.activeOf(p.getUuid());
		if (s == null) return false;
		if (s.finished) { p.sendMessage(Msg.info("Вы уже спасены!"), true); return false; }
		if (s.stage < ALL.size() - 1) {
			p.sendMessage(Msg.err("Рано! Текущая цель: " + ALL.get(s.stage).title()), true);
			return false;
		}
		if (!near(p, s.island(3), 16)) {
			p.sendMessage(Msg.err("Запускай ракету рядом с маяком (запад)"), true);
			return false;
		}
		s.finished = true;
		s.stage = ALL.size();
		SessionManager.save();
		ServerWorld w = Worlds.of(p);
		for (ServerPlayerEntity m : SessionManager.online(w.getServer(), s)) {
			m.networkHandler.sendPacket(new TitleS2CPacket(Text.literal("СПАСЕНИЕ!").formatted(Formatting.GOLD, Formatting.BOLD)));
			m.networkHandler.sendPacket(new SubtitleS2CPacket(Text.literal("Корабль заметил ваш сигнал. Вы выжили!").formatted(Formatting.YELLOW)));
		}
		w.spawnParticles(ParticleTypes.FIREWORK, p.getX(), p.getY() + 12, p.getZ(), 200, 3, 4, 3, 0.2);
		w.playSound(null, p.getX(), p.getY(), p.getZ(), SoundEvents.ENTITY_FIREWORK_ROCKET_LAUNCH, SoundCategory.PLAYERS, 3f, 1f);
		return true;
	}
}
