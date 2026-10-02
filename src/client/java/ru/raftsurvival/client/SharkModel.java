package ru.raftsurvival.client;

import net.minecraft.client.model.*;
import net.minecraft.client.render.entity.model.EntityModel;

/** Модель акулы (код-модель в стиле Blockbench). Анимация: волна хвоста, покачивание корпуса, плавники. */
public class SharkModel extends EntityModel<SharkRenderState> {
	private final ModelPart body, head, tail1, tail2, tailFin, pecL, pecR;

	public SharkModel(ModelPart root) {
		super(root);
		this.body = root.getChild("body");
		this.head = body.getChild("head");
		this.tail1 = body.getChild("tail1");
		this.tail2 = tail1.getChild("tail2");
		this.tailFin = tail2.getChild("tail_fin");
		this.pecL = body.getChild("pec_l");
		this.pecR = body.getChild("pec_r");
	}

	public static TexturedModelData getTexturedModelData() {
		ModelData md = new ModelData();
		ModelPartData root = md.getRoot();
		ModelPartData body = root.addChild("body", ModelPartBuilder.create().uv(0, 0).cuboid(-5, -5, -10, 10, 10, 22), ModelTransform.of(0, 18, 0, 0, 0, 0));
		body.addChild("head", ModelPartBuilder.create().uv(0, 32).cuboid(-4, -4, -10, 8, 8, 10), ModelTransform.of(0, 0, -10, 0, 0, 0));
		ModelPartData t1 = body.addChild("tail1", ModelPartBuilder.create().uv(40, 32).cuboid(-3, -3, 0, 6, 6, 10), ModelTransform.of(0, 0, 12, 0, 0, 0));
		ModelPartData t2 = t1.addChild("tail2", ModelPartBuilder.create().uv(80, 32).cuboid(-2, -2, 0, 4, 4, 8), ModelTransform.of(0, 0, 10, 0, 0, 0));
		t2.addChild("tail_fin", ModelPartBuilder.create().uv(104, 32).cuboid(-1, -8, 0, 2, 16, 6), ModelTransform.of(0, 0, 8, 0, 0, 0));
		body.addChild("dorsal", ModelPartBuilder.create().uv(64, 0).cuboid(-1, -6, 0, 2, 6, 8), ModelTransform.of(0, -5, -2, 0.4f, 0, 0));
		body.addChild("pec_l", ModelPartBuilder.create().uv(88, 0).cuboid(0, 0, -2, 8, 1, 4), ModelTransform.of(4, 4, -4, 0, 0, 0.5f));
		body.addChild("pec_r", ModelPartBuilder.create().uv(88, 8).mirrored().cuboid(-8, 0, -2, 8, 1, 4), ModelTransform.of(-4, 4, -4, 0, 0, -0.5f));
		return TexturedModelData.of(md, 128, 64);
	}

	@Override
	public void setAngles(SharkRenderState state) {
		super.setAngles(state);
		float t = state.age * 0.25f;
		float speed = 0.4f + Math.min(1f, state.limbSwingAmplitude * 2f) * 0.6f;
		float w = (float) Math.sin(t * (1f + speed));
		body.yaw = w * 0.08f;
		head.yaw = -w * 0.12f;
		tail1.yaw = w * 0.25f;
		tail2.yaw = (float) Math.sin(t * (1f + speed) - 0.9f) * 0.35f;
		tailFin.yaw = (float) Math.sin(t * (1f + speed) - 1.8f) * 0.3f;
		body.pitch = state.pitch * ((float) Math.PI / 180f) * 0.2f;
		float flap = (float) Math.sin(t * 0.6f) * 0.15f;
		pecL.roll = 0.5f + flap;
		pecR.roll = -0.5f - flap;
	}
}
