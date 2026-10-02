package ru.raftsurvival.entity;

import net.minecraft.entity.EntityType;
import net.minecraft.entity.MovementType;
import net.minecraft.entity.ai.control.AquaticMoveControl;
import net.minecraft.entity.ai.goal.ActiveTargetGoal;
import net.minecraft.entity.ai.goal.MeleeAttackGoal;
import net.minecraft.entity.ai.goal.SwimAroundGoal;
import net.minecraft.entity.ai.pathing.EntityNavigation;
import net.minecraft.entity.ai.pathing.SwimNavigation;
import net.minecraft.entity.attribute.DefaultAttributeContainer;
import net.minecraft.entity.attribute.EntityAttributes;
import net.minecraft.entity.mob.MobEntity;
import net.minecraft.entity.mob.WaterCreatureEntity;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.World;

/** Акула: патрулирует воду и атакует игроков рядом с плотом. Модель — client/SharkModel. */
public class SharkEntity extends WaterCreatureEntity {
	public SharkEntity(EntityType<? extends SharkEntity> type, World world) {
		super(type, world);
		this.moveControl = new AquaticMoveControl(this, 85, 10, 0.02f, 0.1f, true);
	}

	public static DefaultAttributeContainer.Builder createSharkAttributes() {
		return MobEntity.createMobAttributes()
			.add(EntityAttributes.MAX_HEALTH, 30.0)
			.add(EntityAttributes.MOVEMENT_SPEED, 1.0)
			.add(EntityAttributes.ATTACK_DAMAGE, 6.0)
			.add(EntityAttributes.FOLLOW_RANGE, 32.0);
	}

	@Override
	protected EntityNavigation createNavigation(World world) {
		return new SwimNavigation(this, world);
	}

	@Override
	protected void initGoals() {
		this.goalSelector.add(1, new MeleeAttackGoal(this, 1.3, true));
		this.goalSelector.add(2, new SwimAroundGoal(this, 1.0, 10));
		this.targetSelector.add(1, new ActiveTargetGoal<>(this, PlayerEntity.class, true));
	}

	@Override
	public void travel(Vec3d movementInput) {
		if (this.isLogicalSideForUpdatingMovement() && this.isTouchingWater()) {
			this.updateVelocity(this.getMovementSpeed(), movementInput);
			this.move(MovementType.SELF, this.getVelocity());
			this.setVelocity(this.getVelocity().multiply(0.9));
			if (this.getTarget() == null) {
				this.setVelocity(this.getVelocity().add(0.0, -0.005, 0.0));
			}
		} else {
			super.travel(movementInput);
		}
	}
}
