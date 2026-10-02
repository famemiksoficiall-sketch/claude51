package ru.raftsurvival.item;

import net.minecraft.block.Block;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.fluid.Fluids;
import net.minecraft.item.BlockItem;
import net.minecraft.item.ItemStack;
import net.minecraft.sound.SoundCategory;
import net.minecraft.sound.SoundEvents;
import net.minecraft.util.ActionResult;
import net.minecraft.util.Hand;
import net.minecraft.util.hit.BlockHitResult;
import net.minecraft.util.hit.HitResult;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Direction;
import net.minecraft.world.RaycastContext;
import net.minecraft.world.World;
import ru.raftsurvival.ModBlocks;

/** Доска кладётся прямо на воду, но только вплотную к уже существующему плоту. */
public class RaftPlankItem extends BlockItem {
	public RaftPlankItem(Block block, Settings settings) {
		super(block, settings);
	}

	@Override
	public ActionResult use(World world, PlayerEntity user, Hand hand) {
		BlockHitResult hit = raycast(world, user, RaycastContext.FluidHandling.SOURCE_ONLY);
		if (hit.getType() != HitResult.Type.BLOCK) return ActionResult.PASS;
		BlockPos pos = hit.getBlockPos();
		if (!world.getFluidState(pos).isOf(Fluids.WATER) || !world.getFluidState(pos.up()).isEmpty()) return ActionResult.PASS;
		boolean adjacent = false;
		for (Direction d : Direction.Type.HORIZONTAL) {
			if (world.getBlockState(pos.offset(d)).isOf(ModBlocks.RAFT_PLANK)) { adjacent = true; break; }
		}
		if (!adjacent) return ActionResult.PASS;
		if (!world.isClient()) {
			world.setBlockState(pos, ModBlocks.RAFT_PLANK.getDefaultState());
			world.playSound(null, pos, SoundEvents.BLOCK_WOOD_PLACE, SoundCategory.BLOCKS, 1f, 1f);
			ItemStack stack = user.getStackInHand(hand);
			if (!user.isCreative()) stack.decrement(1);
		}
		return ActionResult.SUCCESS;
	}
}
