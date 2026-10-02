package ru.raftsurvival.entity;

import net.minecraft.block.BlockState;
import net.minecraft.entity.EntityType;
import net.minecraft.entity.Flutterer;
import net.minecraft.entity.ai.control.FlightMoveControl;
import net.minecraft.entity.ai.goal.FlyGoal;
import net.minecraft.entity.ai.goal.SwimGoal;
import net.minecraft.entity.ai.pathing.BirdNavigation;
import net.minecraft.entity.ai.pathing.EntityNavigation;
import net.minecraft.entity.attribute.DefaultAttributeContainer;
import net.minecraft.entity.attribute.EntityAttributes;
import net.minecraft.entity.mob.MobEntity;
import net.minecraft.entity.mob.PathAwareEntity;
import net.minecraft.sound.SoundEvent;
import net.minecraft.sound.SoundEvents;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

/** Чайка: летает над плотом. Приманивается к месту поклёвки (см. game/FishingFx). */
public class GullEntity extends PathAwareEntity implements Flutterer {
	public GullEntity(EntityType<? extends GullEntity> type, World world) {
		super(type, world);
		this.moveControl = new FlightMoveControl(this, 10, false);
	}

	public static DefaultAttributeContainer.Builder createGullAttributes() {
		return MobEntity.createMobAttributes()
			.add(EntityAttributes.MAX_HEALTH, 6.0)
			.add(EntityAttributes.FLYING_SPEED, 0.5)
			.add(EntityAttributes.MOVEMENT_SPEED, 0.2);
	}

	@Override
	protected EntityNavigation createNavigation(World world) {
		BirdNavigation nav = new BirdNavigation(this, world);
		nav.setCanSwim(true);
		return nav;
	}

	@Override
	protected void initGoals() {
		this.goalSelector.add(0, new SwimGoal(this));
		this.goalSelector.add(1, new FlyGoal(this, 1.0));
	}

	@Override
	public boolean isInAir() {
		return !this.isOnGround();
	}

	@Override
	protected void fall(double heightDifference, boolean onGround, BlockState state, BlockPos landedPosition) {}

	@Override
	protected SoundEvent getAmbientSound() {
		return SoundEvents.ENTITY_PARROT_AMBIENT;
	}
}
