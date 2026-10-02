package ru.raftsurvival.gui;

import java.util.*;
import java.util.function.Consumer;
import net.minecraft.component.DataComponentTypes;
import net.minecraft.component.type.LoreComponent;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.entity.player.PlayerInventory;
import net.minecraft.inventory.SimpleInventory;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.item.Items;
import net.minecraft.screen.GenericContainerScreenHandler;
import net.minecraft.screen.ScreenHandler;
import net.minecraft.screen.ScreenHandlerType;
import net.minecraft.screen.SimpleNamedScreenHandlerFactory;
import net.minecraft.screen.slot.SlotActionType;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;
import ru.raftsurvival.ModItems;
import ru.raftsurvival.admin.MapManager;
import ru.raftsurvival.admin.Msg;
import ru.raftsurvival.admin.Ranks;
import ru.raftsurvival.game.*;

/** Серверные GUI на обычных сундуках: клиенту отдельный экран не нужен. ЛКМ — действие, ПКМ — доп. действие. */
public final class Gui {
	private Gui() {}

	/** Окно-меню: действие по слоту; button 0 = ЛКМ, 1 = ПКМ. */
	static class Menu extends GenericContainerScreenHandler {
		private final int size;
		private final Map<Integer, java.util.function.BiConsumer<ServerPlayerEntity, Integer>> actions;

		Menu(int syncId, PlayerInventory inv, SimpleInventory gui, int rows, Map<Integer, java.util.function.BiConsumer<ServerPlayerEntity, Integer>> actions) {
			super(rows == 6 ? ScreenHandlerType.GENERIC_9X6 : ScreenHandlerType.GENERIC_9X3, syncId, inv, gui, rows);
			this.size = rows * 9;
			this.actions = actions;
		}

		@Override
		public void onSlotClick(int slotIndex, int button, SlotActionType type, PlayerEntity player) {
			if (slotIndex >= 0 && slotIndex < size && type != SlotActionType.QUICK_CRAFT && player instanceof ServerPlayerEntity sp) {
				var a = actions.get(slotIndex);
				if (a != null) a.accept(sp, button);
			}
		}

		@Override
		public ItemStack quickMove(PlayerEntity player, int slot) {
			return ItemStack.EMPTY;
		}

		@Override
		public boolean canUse(PlayerEntity player) {
			return true;
		}
	}

	static class B {
		final int rows;
		final SimpleInventory inv;
		final Map<Integer, java.util.function.BiConsumer<ServerPlayerEntity, Integer>> actions = new HashMap<>();
		final Text title;

		B(Text title, int rows) {
			this.title = title;
			this.rows = rows;
			this.inv = new SimpleInventory(rows * 9);
		}

		B item(int slot, Item item, String name, Formatting color, List<String> lore, java.util.function.BiConsumer<ServerPlayerEntity, Integer> action) {
			ItemStack st = new ItemStack(item);
			st.set(DataComponentTypes.CUSTOM_NAME, Text.literal(name).styled(s -> s.withColor(color).withItalic(false)));
			if (lore != null && !lore.isEmpty()) {
				List<Text> l = new ArrayList<>();
				for (String x : lore) l.add(Text.literal(x).styled(s -> s.withColor(Formatting.GRAY).withItalic(false)));
				st.set(DataComponentTypes.LORE, new LoreComponent(l));
			}
			inv.setStack(slot, st);
			if (action != null) actions.put(slot, action);
			return this;
		}

		B filler() {
			for (int i = 0; i < rows * 9; i++) {
				if (inv.getStack(i).isEmpty()) {
					ItemStack g = new ItemStack(Items.GRAY_STAINED_GLASS_PANE);
					g.set(DataComponentTypes.CUSTOM_NAME, Text.literal(" "));
					inv.setStack(i, g);
				}
			}
			return this;
		}

		void open(ServerPlayerEntity p) {
			p.openHandledScreen(new SimpleNamedScreenHandlerFactory((id, pinv, pl) -> new Menu(id, pinv, inv, rows, actions), title));
		}
	}

	private static List<String> L(String... s) { return Arrays.asList(s); }

	// ------------------------------------------------------------------ главное меню
	public static void openMain(ServerPlayerEntity p) {
		B b = new B(Text.literal("Выбор режима"), 3);
		b.item(11, ModItems.RAFT_PLANK, "Выживание на плоту", Formatting.AQUA,
			L("Дрейфуйте в океане, ловите рыбу,", "отбивайтесь от акул и ищите спасение.", "", "ЛКМ — открыть"), (sp, btn) -> openRaft(sp));
		b.item(13, Items.BARRIER, "Скоро: другие режимы", Formatting.DARK_GRAY, L("Следите за обновлениями"), null);
		b.item(15, Items.WRITABLE_BOOK, "Прохождение", Formatting.YELLOW, L("Список целей режима"), (sp, btn) -> { sp.closeHandledScreen(); sendQuests(sp); });
		b.filler().open(p);
	}

	public static void sendQuests(ServerPlayerEntity p) {
		Session s = SessionManager.activeOf(p.getUuid());
		p.sendMessage(Text.literal("— Прохождение: Выживание на плоту —").formatted(Formatting.AQUA), false);
		for (int i = 0; i < Quests.ALL.size(); i++) {
			var q = Quests.ALL.get(i);
			boolean done = s != null && (s.finished || i < s.stage);
			boolean cur = s != null && !s.finished && i == s.stage;
			p.sendMessage(Text.literal((done ? "✔ " : cur ? "▶ " : "○ ") + (i + 1) + ". " + q.title() + (cur || s == null ? " — " + q.hint() : ""))
				.formatted(done ? Formatting.GREEN : cur ? Formatting.YELLOW : Formatting.GRAY), false);
		}
	}

	private static void openRaft(ServerPlayerEntity p) {
		B b = new B(Text.literal("Выживание на плоту"), 3);
		b.item(10, Items.OAK_BOAT, "Создать одиночный мир", Formatting.GREEN, L("Только вы. Сохраняется автоматически."), (sp, btn) -> openMapChoice(sp, false, Access.PRIVATE));
		b.item(12, Items.CAMPFIRE, "Создать кооператив (до 4)", Formatting.GOLD, L("Выберете доступ: публичный,", "закрытый или по паролю."), (sp, btn) -> openAccess(sp));
		b.item(14, Items.CHEST, "Мои миры (продолжить)", Formatting.AQUA, L("ЛКМ — играть, ПКМ — управление", "(для владельца)"), (sp, btn) -> openMine(sp));
		b.item(16, Items.COMPASS, "Публичные миры", Formatting.YELLOW, L("Присоединиться к другим игрокам"), (sp, btn) -> openPublic(sp));
		b.item(22, Items.ARROW, "Назад", Formatting.GRAY, null, (sp, btn) -> openMain(sp));
		b.filler().open(p);
	}

	private static void openAccess(ServerPlayerEntity p) {
		B b = new B(Text.literal("Доступ к кооперативу"), 3);
		b.item(10, Items.LIME_DYE, "Публичный", Formatting.GREEN, L("Любой может зайти через меню"), (sp, btn) -> openMapChoice(sp, true, Access.PUBLIC));
		b.item(13, Items.RED_DYE, "Закрытый", Formatting.RED, L("Только по приглашению: /raft invite <ник>"), (sp, btn) -> openMapChoice(sp, true, Access.PRIVATE));
		b.item(16, Items.TRIPWIRE_HOOK, "По паролю", Formatting.GOLD,
			L("Нужен пароль. Создайте командой:", "/raft create coop password <пароль>"), (sp, btn) -> { sp.closeHandledScreen(); sp.sendMessage(Msg.info("Введите: /raft create coop password <пароль>"), false); });
		b.item(22, Items.ARROW, "Назад", Formatting.GRAY, null, (sp, btn) -> openRaft(sp));
		b.filler().open(p);
	}

	private static void openMapChoice(ServerPlayerEntity p, boolean coop, Access access) {
		List<String> maps = MapManager.names();
		if (maps.isEmpty()) {
			finishCreate(p, coop, access, "");
			return;
		}
		B b = new B(Text.literal("Выбор карты"), 3);
		b.item(10, Items.OAK_PLANKS, "Стандартный плот", Formatting.GREEN, L("Плот и 4 острова"), (sp, btn) -> finishCreate(sp, coop, access, ""));
		int slot = 11;
		for (String m : maps) {
			if (slot > 16) break;
			b.item(slot++, Items.MAP, "Карта: " + m, Formatting.AQUA, L("Созданная администратором"), (sp, btn) -> finishCreate(sp, coop, access, m));
		}
		b.filler().open(p);
	}

	private static void finishCreate(ServerPlayerEntity p, boolean coop, Access access, String map) {
		String err = SessionManager.create(p, coop, access, "", map);
		if (err != null) { p.closeHandledScreen(); p.sendMessage(Msg.err(err), false); }
	}

	private static List<String> info(Session s) {
		return L("ID: " + s.id, "Игроки: " + s.members.size() + "/" + s.max() + " — " + String.join(", ", s.members.values()),
			"Доступ: " + (s.coop ? s.access.label : "одиночный"), "Прогресс: " + Math.min(s.stage, Quests.ALL.size()) + "/" + Quests.ALL.size() + (s.finished ? " ★" : ""));
	}

	private static void openMine(ServerPlayerEntity p) {
		B b = new B(Text.literal("Мои миры"), 6);
		int slot = 0;
		for (Session s : SessionManager.mine(p.getUuid())) {
			if (slot >= 45) break;
			boolean owner = s.owner.equals(p.getUuid());
			List<String> lore = new ArrayList<>(info(s));
			lore.add("");
			lore.add("ЛКМ — играть" + (owner ? ", ПКМ — управление" : ", ПКМ — покинуть мир"));
			b.item(slot++, s.coop ? Items.CAMPFIRE : Items.OAK_BOAT, s.name, owner ? Formatting.GOLD : Formatting.AQUA, lore, (sp, btn) -> {
				if (btn == 0) Game.enter(sp, s);
				else if (owner) openManage(sp, s);
				else { SessionManager.kick(sp.getEntityWorld().getServer(), s, sp.getUuid()); openMine(sp); }
			});
		}
		b.item(49, Items.ARROW, "Назад", Formatting.GRAY, null, (sp, btn) -> openRaft(sp));
		b.filler().open(p);
	}

	private static void openPublic(ServerPlayerEntity p) {
		B b = new B(Text.literal("Публичные миры"), 6);
		int slot = 0;
		for (Session s : SessionManager.joinable(p.getUuid())) {
			if (s.access == Access.PRIVATE || slot >= 45) continue;
			List<String> lore = new ArrayList<>(info(s));
			lore.add("");
			lore.add(s.access == Access.PASSWORD ? "Защищён паролем: /raft join " + s.id + " <пароль>" : "ЛКМ — присоединиться");
			b.item(slot++, s.access == Access.PASSWORD ? Items.TRIPWIRE_HOOK : Items.LIME_DYE, s.name, Formatting.YELLOW, lore, (sp, btn) -> {
				if (s.access == Access.PASSWORD) { sp.closeHandledScreen(); sp.sendMessage(Msg.info("Введите: /raft join " + s.id + " <пароль>"), false); return; }
				String err = SessionManager.tryJoin(sp, s, "");
				if (err != null) { sp.closeHandledScreen(); sp.sendMessage(Msg.err(err), false); }
			});
		}
		b.item(49, Items.ARROW, "Назад", Formatting.GRAY, null, (sp, btn) -> openRaft(sp));
		b.filler().open(p);
	}

	/** Управление миром: кик игроков, доступ, удаление. */
	public static void openManage(ServerPlayerEntity p, Session s) {
		B b = new B(Text.literal("Управление: " + s.name), 3);
		int slot = 0;
		for (Map.Entry<UUID, String> e : s.members.entrySet()) {
			if (slot >= 8) break;
			boolean self = e.getKey().equals(s.owner);
			b.item(slot++, self ? Items.GOLDEN_HELMET : Items.PLAYER_HEAD, e.getValue(), self ? Formatting.GOLD : Formatting.WHITE,
				L(self ? "Владелец" : "Клик — исключить"), self ? null : (sp, btn) -> {
					SessionManager.kick(sp.getEntityWorld().getServer(), s, e.getKey());
					openManage(sp, s);
				});
		}
		if (s.coop) {
			b.item(11, Items.COMPARATOR, "Доступ: " + s.access.label, Formatting.AQUA, L("Клик — сменить (публичный ⇄ закрытый)", "Пароль: /raft password <пароль>"), (sp, btn) -> {
				s.access = s.access == Access.PUBLIC ? Access.PRIVATE : Access.PUBLIC;
				SessionManager.save();
				openManage(sp, s);
			});
		}
		b.item(15, Items.TNT, "Удалить мир", Formatting.RED, L("Безвозвратно! Клик — подтвердить"), (sp, btn) -> confirmDelete(sp, s));
		b.item(22, Items.ARROW, "Назад", Formatting.GRAY, null, (sp, btn) -> openMine(sp));
		b.filler().open(p);
	}

	private static void confirmDelete(ServerPlayerEntity p, Session s) {
		B b = new B(Text.literal("Удалить «" + s.name + "»?"), 3);
		b.item(11, Items.LIME_CONCRETE, "ДА, удалить", Formatting.RED, null, (sp, btn) -> {
			SessionManager.delete(sp.getEntityWorld().getServer(), s);
			sp.closeHandledScreen();
			sp.sendMessage(Msg.ok("Мир удалён"), false);
		});
		b.item(15, Items.RED_CONCRETE, "Отмена", Formatting.GREEN, null, (sp, btn) -> openManage(sp, s));
		b.filler().open(p);
	}
}
