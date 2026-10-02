package ru.raftsurvival;

import net.minecraft.text.MutableText;
import net.minecraft.text.Text;
import net.minecraft.text.TextColor;

public final class Rgb {
	private Rgb() {}

	public static int hsv(float h, float s, float v) {
		h = ((h % 1f) + 1f) % 1f;
		float r = 0, g = 0, b = 0;
		int i = (int) (h * 6);
		float f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
		switch (i % 6) {
			case 0 -> { r = v; g = t; b = p; }
			case 1 -> { r = q; g = v; b = p; }
			case 2 -> { r = p; g = v; b = t; }
			case 3 -> { r = p; g = q; b = v; }
			case 4 -> { r = t; g = p; b = v; }
			default -> { r = v; g = p; b = q; }
		}
		return ((int) (r * 255) << 16) | ((int) (g * 255) << 8) | (int) (b * 255);
	}

	/** Радужный градиент по символам; phase двигает «волну». */
	public static MutableText gradient(String s, float phase, boolean bold) {
		MutableText out = Text.empty();
		int n = 0;
		for (int i = 0; i < s.length(); ) {
			int cp = s.codePointAt(i);
			i += Character.charCount(cp);
			int color = hsv(phase + n * 0.045f, 0.75f, 1f);
			final boolean b = bold;
			out.append(Text.literal(new String(Character.toChars(cp))).styled(st -> st.withColor(TextColor.fromRgb(color)).withBold(b)));
			n++;
		}
		return out;
	}

	public static Text plain(String s, int rgb) {
		return Text.literal(s).styled(st -> st.withColor(TextColor.fromRgb(rgb)).withItalic(false));
	}
}
