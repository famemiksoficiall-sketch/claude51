package ru.raftsurvival;

import net.fabricmc.api.ModInitializer;
import net.minecraft.util.Identifier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import ru.raftsurvival.admin.MapManager;
import ru.raftsurvival.admin.PanelManager;
import ru.raftsurvival.admin.Ranks;
import ru.raftsurvival.admin.TabManager;
import ru.raftsurvival.game.Game;

public class RaftSurvival implements ModInitializer {
	public static final String MOD_ID = "raftsurvival";
	public static final Logger LOG = LoggerFactory.getLogger(MOD_ID);

	public static Identifier id(String path) {
		return Identifier.of(MOD_ID, path);
	}

	@Override
	public void onInitialize() {
		ModBlocks.init();
		ModItems.init();
		ModEntities.init();
		Ranks.init();
		TabManager.init();
		PanelManager.init();
		MapManager.init();
		Game.init();
		Commands.init();
		LOG.info("Raft Survival загружен");
	}
}
