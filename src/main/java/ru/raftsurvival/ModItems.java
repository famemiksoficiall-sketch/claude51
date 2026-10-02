package ru.raftsurvival;

import java.util.function.Function;
import net.fabricmc.fabric.api.itemgroup.v1.FabricItemGroup;
import net.minecraft.component.type.FoodComponent;
import net.minecraft.item.BlockItem;
import net.minecraft.item.Item;
import net.minecraft.item.ItemGroup;
import net.minecraft.item.ItemStack;
import net.minecraft.item.ToolMaterial;
import net.minecraft.registry.Registries;
import net.minecraft.registry.Registry;
import net.minecraft.registry.RegistryKey;
import net.minecraft.registry.RegistryKeys;
import net.minecraft.text.Text;
import ru.raftsurvival.item.RaftPlankItem;
import ru.raftsurvival.item.SignalFlareItem;

public final class ModItems {
	public static final Item RAFT_PLANK = reg("raft_plank", s -> new RaftPlankItem(ModBlocks.RAFT_PLANK, s), new Item.Settings().useBlockPrefixedTranslationKey());
	public static final Item FLOATING_BARREL = reg("floating_barrel", s -> new BlockItem(ModBlocks.FLOATING_BARREL, s), new Item.Settings().useBlockPrefixedTranslationKey());
	public static final Item DESALINATOR = reg("desalinator", s -> new BlockItem(ModBlocks.DESALINATOR, s), new Item.Settings().useBlockPrefixedTranslationKey());
	public static final Item DRYING_RACK = reg("drying_rack", s -> new BlockItem(ModBlocks.DRYING_RACK, s), new Item.Settings().useBlockPrefixedTranslationKey());
	public static final Item SCRAP = reg("scrap", Item::new, new Item.Settings());
	public static final Item ROPE = reg("rope", Item::new, new Item.Settings());
	public static final Item SHARK_TOOTH = reg("shark_tooth", Item::new, new Item.Settings());
	public static final Item GULL_FEATHER = reg("gull_feather", Item::new, new Item.Settings());
	public static final Item DRIED_FISH = reg("dried_fish", Item::new,
		new Item.Settings().food(new FoodComponent.Builder().nutrition(6).saturationModifier(0.7f).build()));
	public static final Item HARPOON = reg("harpoon", Item::new, new Item.Settings().sword(ToolMaterial.STONE, 4f, -2.4f));
	public static final Item SIGNAL_FLARE = reg("signal_flare", SignalFlareItem::new, new Item.Settings().maxCount(4));

	private ModItems() {}

	private static <T extends Item> T reg(String name, Function<Item.Settings, T> factory, Item.Settings settings) {
		RegistryKey<Item> key = RegistryKey.of(RegistryKeys.ITEM, RaftSurvival.id(name));
		return Registry.register(Registries.ITEM, key, factory.apply(settings.registryKey(key)));
	}

	public static void init() {
		RegistryKey<ItemGroup> gk = RegistryKey.of(RegistryKeys.ITEM_GROUP, RaftSurvival.id("main"));
		Registry.register(Registries.ITEM_GROUP, gk, FabricItemGroup.builder()
			.displayName(Text.translatable("itemGroup.raftsurvival"))
			.icon(() -> new ItemStack(RAFT_PLANK))
			.entries((ctx, entries) -> {
				entries.add(RAFT_PLANK); entries.add(FLOATING_BARREL); entries.add(DESALINATOR); entries.add(DRYING_RACK);
				entries.add(SCRAP); entries.add(ROPE); entries.add(SHARK_TOOTH); entries.add(GULL_FEATHER);
				entries.add(DRIED_FISH); entries.add(HARPOON); entries.add(SIGNAL_FLARE);
			}).build());
	}
}
