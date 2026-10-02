package ru.raftsurvival.admin;

import net.minecraft.text.Text;
import net.minecraft.util.Formatting;

public final class Msg {
	private Msg() {}

	private static Text prefix() {
		return Text.literal("[Плот] ").formatted(Formatting.AQUA);
	}

	public static Text ok(String s) { return prefix().copy().append(Text.literal(s).formatted(Formatting.GREEN)); }
	public static Text err(String s) { return prefix().copy().append(Text.literal(s).formatted(Formatting.RED)); }
	public static Text info(String s) { return prefix().copy().append(Text.literal(s).formatted(Formatting.YELLOW)); }
}
