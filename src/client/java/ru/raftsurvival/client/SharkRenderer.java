package ru.raftsurvival.client;

import net.minecraft.client.render.entity.EntityRendererFactory;
import net.minecraft.client.render.entity.MobEntityRenderer;
import net.minecraft.util.Identifier;
import ru.raftsurvival.RaftSurvival;
import ru.raftsurvival.entity.SharkEntity;

public class SharkRenderer extends MobEntityRenderer<SharkEntity, SharkRenderState, SharkModel> {
	private static final Identifier TEXTURE = RaftSurvival.id("textures/entity/shark.png");

	public SharkRenderer(EntityRendererFactory.Context ctx) {
		super(ctx, new SharkModel(ctx.getPart(RaftSurvivalClient.SHARK_LAYER)), 0.9f);
	}

	@Override
	public Identifier getTexture(SharkRenderState state) {
		return TEXTURE;
	}

	@Override
	public SharkRenderState createRenderState() {
		return new SharkRenderState();
	}
}
