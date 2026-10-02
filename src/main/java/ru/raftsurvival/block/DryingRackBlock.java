package ru.raftsurvival.block;

import com.mojang.serialization.MapCodec;
import net.minecraft.block.Block;
import net.minecraft.block.BlockState;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.item.Items;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.sound.SoundCategory;
import net.minecraft.sound.SoundEvents;
import net.minecraft.state.StateManager;
import net.minecraft.state.property.IntProperty;
import net.minecraft.util.ActionResult;
import net.minecraft.util.Hand;
import net.minecraft.util.hit.BlockHitResult;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.random.Random;
import net.minecraft.world.World;
import ru.raftsurvival.ModItems;
import ru.raftsurvival.game.Quests;

/** Сушилка: положи сырую рыбу (stage 1) → через 30 сек готово (stage 2) → забери вяленую рыбу. */
public class DryingRackBlock extends Block {
	public static final MapCodec<DryingRackBlock> CODEC = createCodec(DryingRackBlock::new);
	public static final IntProperty STAGE = IntProperty.of("stage", 0, 2);
	private static final int DRY_TICKS = 600;

	public DryingRackBlock(Settings settings) {
		super(settings);
		setDefaultState(getStateManager().getDefaultState().with(STAGE, 0));
	}

	@Override
	protected MapCodec<? extends Block> getCodec() {
		return CODEC;
	}

	@Override
	protected void appendProperties(StateManager.Builder<Block, BlockState> builder) {
		builder.add(STAGE);
	}

	private static boolean isRawFish(ItemStack s) {
		Item i = s.getItem();
		return i == Items.COD || i == Items.SALMON || i == Items.TROPICAL_FISH;
	}

	@Override
	protected ActionResult onUseWithItem(ItemStack stack, BlockState state, World world, BlockPos pos, PlayerEntity player, Hand hand, BlockHitResult hit) {
		if (state.get(STAGE) == 0 && isRawFish(stack)) {
			if (!world.isClient()) {
				if (!player.isCreative()) stack.decrement(1);
				world.setBlockState(pos, state.with(STAGE, 1));
				world.scheduleBlockTick(pos, this, DRY_TICKS);
				world.playSound(null, pos, SoundEvents.ENTITY_ITEM_FRAME_ADD_ITEM, SoundCategory.BLOCKS, 1f, 1f);
			}
			return ActionResult.SUCCESS;
		}
		return ActionResult.PASS_TO_DEFAULT_BLOCK_INTERACTION;
	}

	@Override
	protected ActionResult onUse(BlockState state, World world, BlockPos pos, PlayerEntity player, BlockHitResult hit) {
		if (state.get(STAGE) == 2) {
			if (!world.isClient()) {
				Block.dropStack(world, pos.up(), new ItemStack(ModItems.DRIED_FISH, 1));
				world.setBlockState(pos, state.with(STAGE, 0));
				if (player instanceof ServerPlayerEntity sp) Quests.flag(sp, "dried");
			}
			return ActionResult.SUCCESS;
		}
		return ActionResult.PASS;
	}

	@Override
	protected void scheduledTick(BlockState state, ServerWorld world, BlockPos pos, Random random) {
		if (state.get(STAGE) == 1) {
			world.setBlockState(pos, state.with(STAGE, 2));
			world.playSound(null, pos, SoundEvents.BLOCK_NOTE_BLOCK_CHIME.value(), SoundCategory.BLOCKS, 1f, 1.5f);
		}
	}
}
