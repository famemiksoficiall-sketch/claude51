package ru.raftsurvival.block;

import com.mojang.serialization.MapCodec;
import net.minecraft.block.Block;
import net.minecraft.block.BlockState;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.sound.SoundCategory;
import net.minecraft.sound.SoundEvents;
import net.minecraft.util.ActionResult;
import net.minecraft.util.hit.BlockHitResult;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import ru.raftsurvival.game.Thirst;

/** Опреснитель: правый клик — напиться пресной воды. */
public class DesalinatorBlock extends Block {
	public static final MapCodec<DesalinatorBlock> CODEC = createCodec(DesalinatorBlock::new);

	public DesalinatorBlock(Settings settings) {
		super(settings);
	}

	@Override
	protected MapCodec<? extends Block> getCodec() {
		return CODEC;
	}

	@Override
	protected ActionResult onUse(BlockState state, World world, BlockPos pos, PlayerEntity player, BlockHitResult hit) {
		if (!world.isClient() && player instanceof ServerPlayerEntity sp) {
			if (Thirst.drink(sp)) {
				world.playSound(null, pos, SoundEvents.ENTITY_GENERIC_DRINK.value(), SoundCategory.PLAYERS, 1f, 1f);
			}
		}
		return ActionResult.SUCCESS;
	}
}
