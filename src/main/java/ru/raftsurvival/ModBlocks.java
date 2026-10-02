package ru.raftsurvival;

import java.util.function.Function;
import net.minecraft.block.AbstractBlock;
import net.minecraft.block.Block;
import net.minecraft.block.MapColor;
import net.minecraft.block.piston.PistonBehavior;
import net.minecraft.registry.Registries;
import net.minecraft.registry.Registry;
import net.minecraft.registry.RegistryKey;
import net.minecraft.registry.RegistryKeys;
import net.minecraft.sound.BlockSoundGroup;
import ru.raftsurvival.block.DesalinatorBlock;
import ru.raftsurvival.block.DryingRackBlock;
import ru.raftsurvival.block.FloatingBarrelBlock;

public final class ModBlocks {
	public static final Block RAFT_PLANK = reg("raft_plank", Block::new,
		AbstractBlock.Settings.create().mapColor(MapColor.OAK_TAN).strength(1.5f, 3f).sounds(BlockSoundGroup.WOOD));
	public static final Block FLOATING_BARREL = reg("floating_barrel", FloatingBarrelBlock::new,
		AbstractBlock.Settings.create().mapColor(MapColor.OAK_TAN).strength(1f).sounds(BlockSoundGroup.WOOD));
	public static final Block DESALINATOR = reg("desalinator", DesalinatorBlock::new,
		AbstractBlock.Settings.create().mapColor(MapColor.LIGHT_BLUE).strength(2f).sounds(BlockSoundGroup.METAL));
	public static final Block DRYING_RACK = reg("drying_rack", DryingRackBlock::new,
		AbstractBlock.Settings.create().mapColor(MapColor.OAK_TAN).strength(1f).sounds(BlockSoundGroup.WOOD));

	private ModBlocks() {}

	private static <T extends Block> T reg(String name, Function<AbstractBlock.Settings, T> factory, AbstractBlock.Settings settings) {
		RegistryKey<Block> key = RegistryKey.of(RegistryKeys.BLOCK, RaftSurvival.id(name));
		return Registry.register(Registries.BLOCK, key, factory.apply(settings.registryKey(key)));
	}

	public static void init() {}
}
