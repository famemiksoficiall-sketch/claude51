package ru.raftsurvival.client;

import net.minecraft.client.render.entity.EntityRendererFactory;
import net.minecraft.client.render.entity.MobEntityRenderer;
import net.minecraft.util.Identifier;
import ru.raftsurvival.RaftSurvival;
import ru.raftsurvival.entity.GullEntity;

public class GullRenderer extends MobEntityRenderer<GullEntity, GullRenderState, GullModel> {
	private static final Identifier TEXTURE = RaftSurvival.id("textures/entity/gull.png");

	public GullRenderer(EntityRendererFactory.Context ctx) {
		super(ctx, new GullModel(ctx.getPart(RaftSurvivalClient.GULL_LAYER)), 0.3f);
	}

	@Override
	public Identifier getTexture(GullRenderState state) {
		return TEXTURE;
	}

	@Override
	public GullRenderState createRenderState() {
		return new GullRenderState();
	}

	@Override
	public void updateRenderState(GullEntity entity, GullRenderState state, float tickDelta) {
		super.updateRenderState(entity, state, tickDelta);
		state.flying = !entity.isOnGround();
	}
}
