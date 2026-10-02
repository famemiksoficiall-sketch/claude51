package ru.raftsurvival.admin;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.io.Reader;
import java.io.Writer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import net.fabricmc.fabric.api.event.player.AttackBlockCallback;
import net.fabricmc.fabric.api.event.player.UseBlockCallback;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.block.Block;
import net.minecraft.block.BlockState;
import net.minecraft.item.ItemStack;
import net.minecraft.item.Items;
import net.minecraft.registry.Registries;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.state.property.Property;
import net.minecraft.text.Text;
import net.minecraft.util.ActionResult;
import net.minecraft.util.Identifier;
import net.minecraft.util.math.BlockPos;
import ru.raftsurvival.RaftSurvival;

/**
 * Создание карт: палочка-выделение (ЛКМ = точка 1, ПКМ = точка 2), /raftmap save сохраняет область
 * в config/raftsurvival/maps/<имя>.json. При создании мира владелец выбирает карту — она вставляется в слот мира.
 * Блок-сущности (сундуки и т.п.) не сохраняются.
 */
public final class MapManager {
	public static class MapData {
		public String name;
		public int sx, sy, sz;
		public double[] spawn = {0.5, 1, 0.5}; // относительно угла карты
		public List<String> palette = new ArrayList<>();
		public List<Integer> rle = new ArrayList<>(); // пары [индекс палитры, длина серии]
	}

	private static final Gson GSON = new GsonBuilder().create();
	private static final Map<UUID, BlockPos[]> SEL = new HashMap<>();
	private static Path dir;
	public static final int MAX_VOLUME = 600_000;

	private MapManager() {}

	public static void init() {
		dir = FabricLoader.getInstance().getConfigDir().resolve("raftsurvival").resolve("maps");
		try { Files.createDirectories(dir); } catch (Exception e) { RaftSurvival.LOG.error("maps dir", e); }
		AttackBlockCallback.EVENT.register((player, world, hand, pos, dir2) -> {
			if (!world.isClient() && isWand(player.getMainHandStack()) && player instanceof ServerPlayerEntity sp && Ranks.has(sp, "raft.map")) {
				sel(sp)[0] = pos.toImmutable();
				sp.sendMessage(Msg.ok("Точка 1: " + pos.toShortString()), true);
				return ActionResult.FAIL;
			}
			return ActionResult.PASS;
		});
		UseBlockCallback.EVENT.register((player, world, hand, hit) -> {
			if (hand == net.minecraft.util.Hand.MAIN_HAND && isWand(player.getMainHandStack())
				&& player instanceof ServerPlayerEntity sp && Ranks.has(sp, "raft.map")) {
				if (!world.isClient()) {
					sel(sp)[1] = hit.getBlockPos().toImmutable();
					sp.sendMessage(Msg.ok("Точка 2: " + hit.getBlockPos().toShortString()), true);
				}
				return ActionResult.SUCCESS;
			}
			return ActionResult.PASS;
		});
	}

	public static ItemStack wand() {
		ItemStack st = new ItemStack(Items.BLAZE_ROD);
		st.set(net.minecraft.component.DataComponentTypes.CUSTOM_NAME, Text.literal("Палочка карты (ЛКМ — т.1, ПКМ — т.2)"));
		return st;
	}

	private static boolean isWand(ItemStack s) {
		return s.isOf(Items.BLAZE_ROD) && s.getName().getString().startsWith("Палочка карты");
	}

	public static BlockPos[] selection(ServerPlayerEntity p) {
		return sel(p);
	}

	private static BlockPos[] sel(ServerPlayerEntity p) {
		return SEL.computeIfAbsent(p.getUuid(), k -> new BlockPos[2]);
	}

	public static List<String> names() {
		List<String> out = new ArrayList<>();
		try (var s = Files.list(dir)) {
			s.filter(f -> f.toString().endsWith(".json")).forEach(f -> {
				String n = f.getFileName().toString();
				out.add(n.substring(0, n.length() - 5));
			});
		} catch (Exception ignored) {}
		Collections.sort(out);
		return out;
	}

	private static Path path(String name) {
		return dir.resolve(name.replaceAll("[^a-zA-Z0-9_\\-а-яА-Я]", "_") + ".json");
	}

	public static MapData get(String name) {
		try (Reader r = Files.newBufferedReader(path(name))) {
			return GSON.fromJson(r, MapData.class);
		} catch (Exception e) {
			return null;
		}
	}

	private static void write(MapData d) throws Exception {
		try (Writer w = Files.newBufferedWriter(path(d.name))) {
			GSON.toJson(d, w);
		}
	}

	public static boolean delete(String name) {
		try { return Files.deleteIfExists(path(name)); } catch (Exception e) { return false; }
	}

	public static boolean setSpawn(String name, double x, double y, double z, BlockPos corner) {
		MapData d = get(name);
		if (d == null) return false;
		d.spawn = new double[]{x - corner.getX(), y - corner.getY(), z - corner.getZ()};
		try { write(d); return true; } catch (Exception e) { return false; }
	}

	/** Возвращает текст ошибки или null. */
	public static String saveSelection(ServerPlayerEntity p, String name) {
		BlockPos[] s = sel(p);
		if (s[0] == null || s[1] == null) return "Сначала выделите область палочкой (/raftmap wand)";
		int x0 = Math.min(s[0].getX(), s[1].getX()), x1 = Math.max(s[0].getX(), s[1].getX());
		int y0 = Math.min(s[0].getY(), s[1].getY()), y1 = Math.max(s[0].getY(), s[1].getY());
		int z0 = Math.min(s[0].getZ(), s[1].getZ()), z1 = Math.max(s[0].getZ(), s[1].getZ());
		long vol = (long) (x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1);
		if (vol > MAX_VOLUME) return "Область слишком большая (" + vol + " > " + MAX_VOLUME + ")";
		ServerWorld w = ru.raftsurvival.Worlds.of(p);
		MapData d = new MapData();
		d.name = name;
		d.sx = x1 - x0 + 1; d.sy = y1 - y0 + 1; d.sz = z1 - z0 + 1;
		d.spawn = new double[]{d.sx / 2.0, d.sy + 0.0, d.sz / 2.0};
		Map<String, Integer> idx = new HashMap<>();
		int last = -1, run = 0;
		BlockPos.Mutable m = new BlockPos.Mutable();
		for (int y = y0; y <= y1; y++)
			for (int z = z0; z <= z1; z++)
				for (int x = x0; x <= x1; x++) {
					String str = stringify(w.getBlockState(m.set(x, y, z)));
					int i = idx.computeIfAbsent(str, k -> { d.palette.add(k); return d.palette.size() - 1; });
					if (i == last) run++;
					else {
						if (run > 0) { d.rle.add(last); d.rle.add(run); }
						last = i; run = 1;
					}
				}
		if (run > 0) { d.rle.add(last); d.rle.add(run); }
		try { write(d); } catch (Exception e) { return "Ошибка записи: " + e.getMessage(); }
		return null;
	}

	/** Вставка карты; origin — нижний угол. Возвращает абсолютный спавн или null, если карты нет. */
	public static double[] paste(ServerWorld w, String name, BlockPos origin) {
		MapData d = get(name);
		if (d == null) return null;
		List<BlockState> states = new ArrayList<>();
		for (String s : d.palette) states.add(parse(s));
		int pos = 0;
		for (int k = 0; k + 1 < d.rle.size(); k += 2) {
			BlockState st = states.get(d.rle.get(k));
			for (int n = 0; n < d.rle.get(k + 1); n++, pos++) {
				int x = pos % d.sx, z = (pos / d.sx) % d.sz, y = pos / (d.sx * d.sz);
				w.setBlockState(origin.add(x, y, z), st, Block.NOTIFY_LISTENERS);
			}
		}
		return new double[]{origin.getX() + d.spawn[0], origin.getY() + d.spawn[1], origin.getZ() + d.spawn[2]};
	}

	// ---- (де)сериализация состояния блока: "minecraft:oak_stairs[facing=north,half=bottom]"
	static String stringify(BlockState st) {
		StringBuilder b = new StringBuilder(Registries.BLOCK.getId(st.getBlock()).toString());
		boolean first = true;
		for (Property<?> p : st.getBlock().getStateManager().getProperties()) {
			b.append(first ? '[' : ',').append(p.getName()).append('=').append(valueName(st, p));
			first = false;
		}
		if (!first) b.append(']');
		return b.toString();
	}

	private static <T extends Comparable<T>> String valueName(BlockState st, Property<T> p) {
		return p.name(st.get(p));
	}

	static BlockState parse(String s) {
		int br = s.indexOf('[');
		String id = br < 0 ? s : s.substring(0, br);
		Block block = Registries.BLOCK.get(Identifier.of(id));
		BlockState st = block.getDefaultState();
		if (br >= 0) {
			for (String kv : s.substring(br + 1, s.length() - 1).split(",")) {
				String[] a = kv.split("=");
				if (a.length != 2) continue;
				for (Property<?> p : block.getStateManager().getProperties()) {
					if (p.getName().equals(a[0])) st = withValue(st, p, a[1]);
				}
			}
		}
		return st;
	}

	private static <T extends Comparable<T>> BlockState withValue(BlockState st, Property<T> p, String v) {
		Optional<T> o = p.parse(v);
		return o.isPresent() ? st.with(p, o.get()) : st;
	}
}
