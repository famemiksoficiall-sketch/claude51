package ru.raftsurvival.client;

import net.minecraft.client.model.*;
import net.minecraft.client.render.entity.model.EntityModel;

/** Модель чайки: взмахи крыльев в полёте, покачивание головы на земле. */
public class GullModel extends EntityModel<GullRenderState> {
	private final ModelPart body, head, wingL, wingR, tail, legL, legR;

	public GullModel(ModelPart root) {
		super(root);
		this.body = root.getChild("body");
		this.head = body.getChild("head");
		this.wingL = body.getChild("wing_l");
		this.wingR = body.getChild("wing_r");
		this.tail = body.getChild("tail");
		this.legL = body.getChild("leg_l");
		this.legR = body.getChild("leg_r");
	}

	public static TexturedModelData getTexturedModelData() {
		ModelData md = new ModelData();
		ModelPartData root = md.getRoot();
		ModelPartData body = root.addChild("body", ModelPartBuilder.create().uv(0, 0).cuboid(-2.5f, -2, -5, 5, 4, 10), ModelTransform.of(0, 18, 0, 0, 0, 0));
		ModelPartData head = body.addChild("head", ModelPartBuilder.create().uv(0, 14).cuboid(-1.5f, -3, -3, 3, 3, 3), ModelTransform.of(0, -1, -5, 0, 0, 0));
		head.addChild("beak", ModelPartBuilder.create().uv(14, 14).cuboid(-0.5f, -1.5f, -5, 1, 1, 2), ModelTransform.of(0, 0, 0, 0, 0, 0));
		body.addChild("wing_l", ModelPartBuilder.create().uv(32, 0).cuboid(0, -0.5f, -2, 9, 1, 5), ModelTransform.of(2.5f, -1, -1, 0, 0, 0));
		body.addChild("wing_r", ModelPartBuilder.create().uv(32, 8).mirrored().cuboid(-9, -0.5f, -2, 9, 1, 5), ModelTransform.of(-2.5f, -1, -1, 0, 0, 0));
		body.addChild("tail", ModelPartBuilder.create().uv(0, 22).cuboid(-2, -0.5f, 0, 4, 1, 4), ModelTransform.of(0, 0, 5, 0.2f, 0, 0));
		body.addChild("leg_l", ModelPartBuilder.create().uv(20, 22).cuboid(-0.5f, 0, -0.5f, 1, 3, 1), ModelTransform.of(1, 2, 0, 0, 0, 0));
		body.addChild("leg_r", ModelPartBuilder.create().uv(28, 22).cuboid(-0.5f, 0, -0.5f, 1, 3, 1), ModelTransform.of(-1, 2, 0, 0, 0, 0));
		return TexturedModelData.of(md, 64, 32);
	}

	@Override
	public void setAngles(GullRenderState state) {
		super.setAngles(state);
		if (state.flying) {
			float f = (float) Math.sin(state.age * 0.9f) * 0.9f;
			wingL.roll = f;
			wingR.roll = -f;
			legL.pitch = legR.pitch = 0.9f;
			body.pitch = 0.15f;
		} else {
			wingL.roll = -0.15f;
			wingR.roll = 0.15f;
			head.yaw = (float) Math.sin(state.age * 0.1f) * 0.5f;
			head.pitch = (float) Math.max(0, Math.sin(state.age * 0.2f)) * 0.5f;
		}
		tail.pitch = 0.2f + (float) Math.sin(state.age * 0.3f) * 0.05f;
	}
}
