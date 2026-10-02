package ru.raftsurvival.block;

import com.mojang.serialization.MapCodec;
import net.minecraft.block.Block;
import net.minecraft.block.BlockState;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.item.ItemStack;
import net.minecraft.item.Items;
import net.minecraft.sound.SoundCategory;
import net.minecraft.sound.SoundEvents;
import net.minecraft.util.ActionResult;
import net.minecraft.util.hit.BlockHitResult;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import ru.raftsurvival.ModItems;

/** Дрейфующая бочка: один раз открывается и выдаёт случайную добычу. */
public class FloatingBarrelBlock extends Block {
	public static final MapCodec<FloatingBarrelBlock> CODEC = createCodec(FloatingBarrelBlock::new);

	public FloatingBarrelBlock(Settings settings) {
		super(settings);
	}

	@Override
	protected MapCodec<? extends Block> getCodec() {
		return CODEC;
	}

	@Override
	protected ActionResult onUse(BlockState state, World world, BlockPos pos, PlayerEntity player, BlockHitResult hit) {
		if (!world.isClient()) {
			var r = world.getRandom();
			drop(world, pos, new ItemStack(ModItems.SCRAP, 1 + r.nextInt(3)));
			if (r.nextFloat() < 0.5f) drop(world, pos, new ItemStack(Items.STRING, 1 + r.nextInt(2)));
			if (r.nextFloat() < 0.4f) drop(world, pos, new ItemStack(ModItems.RAFT_PLANK, 1 + r.nextInt(2)));
			if (r.nextFloat() < 0.35f) drop(world, pos, new ItemStack(Items.COOKED_COD, 1 + r.nextInt(2)));
			if (r.nextFloat() < 0.25f) drop(world, pos, new ItemStack(Items.BONE));
			if (r.nextFloat() < 0.2f) drop(world, pos, new ItemStack(Items.BOWL));
			if (r.nextFloat() < 0.15f) drop(world, pos, new ItemStack(ModItems.ROPE));
			world.removeBlock(pos, false);
			world.playSound(null, pos, SoundEvents.BLOCK_BARREL_OPEN, SoundCategory.BLOCKS, 1f, 1f);
		}
		return ActionResult.SUCCESS;
	}

	private static void drop(World world, BlockPos pos, ItemStack stack) {
		Block.dropStack(world, pos, stack);
	}
}
