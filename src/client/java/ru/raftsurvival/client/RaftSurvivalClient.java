package ru.raftsurvival.client;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.rendering.v1.EntityModelLayerRegistry;
import net.fabricmc.fabric.api.client.rendering.v1.EntityRendererRegistry;
import net.minecraft.client.render.entity.model.EntityModelLayer;
import ru.raftsurvival.ModEntities;
import ru.raftsurvival.RaftSurvival;

public class RaftSurvivalClient implements ClientModInitializer {
	public static final EntityModelLayer SHARK_LAYER = new EntityModelLayer(RaftSurvival.id("shark"), "main");
	public static final EntityModelLayer GULL_LAYER = new EntityModelLayer(RaftSurvival.id("gull"), "main");

	@Override
	public void onInitializeClient() {
		EntityModelLayerRegistry.registerModelLayer(SHARK_LAYER, SharkModel::getTexturedModelData);
		EntityModelLayerRegistry.registerModelLayer(GULL_LAYER, GullModel::getTexturedModelData);
		EntityRendererRegistry.register(ModEntities.SHARK, SharkRenderer::new);
		EntityRendererRegistry.register(ModEntities.GULL, GullRenderer::new);
	}
}
