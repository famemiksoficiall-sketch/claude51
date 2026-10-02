package ru.raftsurvival.item;

import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.util.ActionResult;
import net.minecraft.util.Hand;
import net.minecraft.world.World;
import ru.raftsurvival.game.Quests;

/** Сигнальная ракета — финал прохождения (запускается у маяка). */
public class SignalFlareItem extends Item {
	public SignalFlareItem(Settings settings) {
		super(settings);
	}

	@Override
	public ActionResult use(World world, PlayerEntity user, Hand hand) {
		if (!world.isClient() && user instanceof ServerPlayerEntity sp) {
			if (Quests.tryFinish(sp)) {
				ItemStack stack = user.getStackInHand(hand);
				if (!user.isCreative()) stack.decrement(1);
			}
		}
		return ActionResult.SUCCESS;
	}
}
